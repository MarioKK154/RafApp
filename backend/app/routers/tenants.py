# backend/app/routers/tenants.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from pathlib import Path
import os
import shutil
import uuid
import json
import secrets

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter
from ..storage import upload_file

# The entire router is restricted to Superusers (God Mode)
router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
    dependencies=[Depends(security.require_superuser)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.require_superuser)]

# Static directory for tenant assets (logo + backgrounds)
APP_DIR = Path(__file__).resolve().parent.parent
TENANT_ASSETS_DIR = APP_DIR / "static" / "tenant_assets"
TENANT_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp"}
ALLOWED_BACKGROUND_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_LOGO_SIZE_MB = 5
MAX_BACKGROUND_SIZE_MB = 10

@router.post("/", response_model=schemas.TenantRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_new_tenant(request: Request, tenant_data: schemas.TenantCreate, db: DbDependency):
    """
    Creates a new tenant without creating automatic users.
    Superadmins can create new admin users for the tenant manually afterwards.
    """
    # 1. Check if tenant name already exists
    existing_tenant = crud.get_tenant_by_name(db, name=tenant_data.name)
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Tenant with name '{tenant_data.name}' already exists."
        )
    
    # 2. Create the tenant record
    new_tenant = crud.create_tenant(db=db, tenant=tenant_data)
    
    return new_tenant

@router.get("/", response_model=List[schemas.TenantRead])
@limiter.limit("100/minute")
async def read_all_tenants(
    request: Request, 
    db: DbDependency, 
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=200)
):
    """Retrieves a list of all tenants in the system, enriched with basic stats."""
    tenants = crud.get_tenants(db=db, skip=skip, limit=limit)
    # Map overdue billing by tenant
    overdue_map = {item["tenant_id"]: item for item in crud.get_overdue_billing_by_tenant(db=db)}
    # Enrich each tenant object with dynamic attributes
    for tenant in tenants:
        user_count = db.query(models.User).filter(models.User.tenant_id == tenant.id).count()
        setattr(tenant, "user_count", user_count)
        overdue_info = overdue_map.get(tenant.id)
        if overdue_info:
            setattr(tenant, "has_overdue_invoices", True)
            setattr(tenant, "overdue_amount", float(overdue_info["overdue_total"]))
        else:
            setattr(tenant, "has_overdue_invoices", False)
            setattr(tenant, "overdue_amount", 0.0)
        discount = crud.get_tenant_discount_percent(db=db, tenant_id=tenant.id)
        setattr(tenant, "discount_percent", discount)
    return tenants

@router.get("/{tenant_id}", response_model=schemas.TenantRead)
@limiter.limit("100/minute")
async def read_single_tenant(request: Request, tenant_id: int, db: DbDependency):
    """Retrieves details for a specific tenant."""
    db_tenant = crud.get_tenant(db=db, tenant_id=tenant_id)
    if db_tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        
    setattr(db_tenant, "user_count", db.query(models.User).filter(models.User.tenant_id == tenant_id).count())
    setattr(db_tenant, "project_count", db.query(models.Project).filter(models.Project.tenant_id == tenant_id).count())
    setattr(db_tenant, "tool_count", db.query(models.Tool).filter(models.Tool.tenant_id == tenant_id).count())
    setattr(db_tenant, "car_count", db.query(models.Car).filter(models.Car.tenant_id == tenant_id).count())
    setattr(db_tenant, "customer_count", db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).count())
    
    return db_tenant

@router.put("/{tenant_id}", response_model=schemas.TenantRead)
@limiter.limit("100/minute")
async def update_existing_tenant(
    request: Request, 
    tenant_id: int, 
    tenant_update_data: schemas.TenantUpdate, 
    db: DbDependency
):
    """Updates basic tenant information (name, logo, etc.)."""
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    # Check for name conflict if the name is being changed
    if tenant_update_data.name and tenant_update_data.name != db_tenant.name:
        existing = crud.get_tenant_by_name(db, name=tenant_update_data.name)
        if existing and existing.id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Tenant name '{tenant_update_data.name}' already exists."
            )
            
    return crud.update_tenant(db=db, db_tenant=db_tenant, tenant_update=tenant_update_data)

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_existing_tenant(request: Request, tenant_id: int, db: DbDependency, current_user: CurrentUserDependency):
    """
    Deletes a tenant. Safety check: prevents deletion if users or
    projects are still associated with the tenant. Logged to audit.
    """
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant_name = db_tenant.name

    # Prevent orphaned data: Check for associated entities
    user_count = db.query(models.User).filter(models.User.tenant_id == tenant_id).count()
    project_count = db.query(models.Project).filter(models.Project.tenant_id == tenant_id).count()

    if user_count > 0 or project_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete tenant. It has {user_count} user(s) and {project_count} project(s) associated."
        )

    crud.create_audit_log(
        db, action_type="tenant_deletion",
        actor_user_id=current_user.id, actor_email=current_user.email,
        tenant_id=tenant_id, target_ref=f"tenant:{tenant_id}",
        details=f"Tenant deleted: {tenant_name}",
    )
    crud.delete_tenant(db=db, tenant_id=tenant_id)
    return None


@router.post("/{tenant_id}/upload-logo", response_class=JSONResponse)
@limiter.limit("20/minute")
async def upload_tenant_logo(
    request: Request,
    tenant_id: int,
    db: DbDependency,
    file: UploadFile = File(...),
):
    """Upload a logo image for the tenant. Replaces any existing logo. Superuser only."""
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logo must be one of: {', '.join(ALLOWED_LOGO_EXTENSIONS)}",
        )
    content = await file.read()
    if len(content) > MAX_LOGO_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logo must be under {MAX_LOGO_SIZE_MB}MB",
        )

    logo_filename = f"logo{ext}"
    # upload_file() tries Supabase Storage first, falls back to local disk
    content_type_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                        ".svg": "image/svg+xml", ".webp": "image/webp"}
    mime = content_type_map.get(ext, "image/png")
    url_path = upload_file(
        content=content,
        filename=logo_filename,
        folder=f"tenant_assets/{tenant_id}",
        content_type=mime,
    )
    crud.update_tenant(db, db_tenant, schemas.TenantUpdate(logo_url=url_path))
    return JSONResponse({"url": url_path})


@router.post("/{tenant_id}/upload-background", response_class=JSONResponse)
@limiter.limit("20/minute")
async def upload_tenant_background(
    request: Request,
    tenant_id: int,
    db: DbDependency,
    file: UploadFile = File(...),
):
    """Upload a background image for the tenant. Can be called multiple times for multiple backgrounds. Superuser only."""
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_BACKGROUND_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Background must be one of: {', '.join(ALLOWED_BACKGROUND_EXTENSIONS)}",
        )
    content = await file.read()
    if len(content) > MAX_BACKGROUND_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Background must be under {MAX_BACKGROUND_SIZE_MB}MB",
        )

    bg_filename = f"bg_{uuid.uuid4().hex[:12]}{ext}"
    content_type_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
    mime = content_type_map.get(ext, "image/jpeg")
    url_path = upload_file(
        content=content,
        filename=bg_filename,
        folder=f"tenant_assets/{tenant_id}",
        content_type=mime,
    )

    # Append to background_image_urls (JSON array in DB)
    current = []
    if db_tenant.background_image_urls:
        try:
            current = json.loads(db_tenant.background_image_urls)
        except Exception as e:
            import logging
            logging.warning(f"Error parsing background image JSON for tenant {tenant_id}: {e}")
    current.append(url_path)
    crud.update_tenant(db, db_tenant, schemas.TenantUpdate(background_image_urls=current))
    return JSONResponse({"url": url_path})


@router.get("/invoices/all", response_model=List[schemas.BillingInvoiceRead])
@limiter.limit("50/minute")
async def get_all_system_invoices(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500)
):
    """Retrieves all invoices across all tenants in the system (superuser only)."""
    return crud.get_all_billing_invoices(db, skip=skip, limit=limit)


@router.get("/{tenant_id}/invoices", response_model=List[schemas.BillingInvoiceRead])
@limiter.limit("50/minute")
async def get_tenant_invoices(
    request: Request,
    tenant_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Retrieves all invoices for a tenant (superuser only)."""
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return crud.get_billing_invoices_by_tenant(db, tenant_id=tenant_id)


@router.post("/{tenant_id}/invoices", response_model=schemas.BillingInvoiceRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def create_tenant_invoice(
    request: Request,
    tenant_id: int,
    invoice_data: schemas.BillingInvoiceCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Generates a new invoice for a tenant (superuser only)."""
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    if invoice_data.tenant_id != tenant_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant ID mismatch in body")
    return crud.create_billing_invoice(db, invoice=invoice_data)


@router.post("/invoices/{invoice_id}/pay", response_model=schemas.BillingInvoiceRead)
@limiter.limit("30/minute")
async def pay_tenant_invoice(
    request: Request,
    invoice_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Marks an invoice as Paid, simulating payment checkout confirmation (superuser only)."""
    db_invoice = crud.get_billing_invoice(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    
    from datetime import datetime, timezone
    db_invoice.status = "Paid"
    db_invoice.paid_at = datetime.now(timezone.utc)
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.put("/invoices/{invoice_id}/status", response_model=schemas.BillingInvoiceRead)
@limiter.limit("30/minute")
async def update_tenant_invoice_status(
    request: Request,
    invoice_id: int,
    new_status: str = Query(..., description="Paid, Pending, or Overdue"),
    db: DbDependency = Depends(get_db),
    current_user: CurrentUserDependency = Depends(security.require_superuser)
):
    """Updates status for a specific tenant invoice (superuser only)."""
    db_invoice = crud.get_billing_invoice(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    
    if new_status not in ["Paid", "Pending", "Overdue"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be Paid, Pending, or Overdue")
        
    from datetime import datetime, timezone
    db_invoice.status = new_status
    if new_status == "Paid" and not db_invoice.paid_at:
        db_invoice.paid_at = datetime.now(timezone.utc)
    elif new_status != "Paid":
        db_invoice.paid_at = None
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def delete_tenant_invoice(
    request: Request,
    invoice_id: int,
    db: DbDependency = Depends(get_db),
    current_user: CurrentUserDependency = Depends(security.require_superuser)
):
    """Deletes a tenant invoice record (superuser only)."""
    db_invoice = crud.get_billing_invoice(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    crud.delete_billing_invoice(db, invoice_id=invoice_id)
    return None
