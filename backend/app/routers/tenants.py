# backend/app/routers/tenants.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Annotated, List
from pathlib import Path
import os
import shutil
import uuid
import json

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

# The entire router is restricted to Superusers (God Mode)
router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
    dependencies=[Depends(security.require_superuser)]
)

DbDependency = Annotated[Session, Depends(get_db)]

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
    Creates a new tenant and automatically creates a default admin user 
    assigned to that tenant (admin@tenantname.com).
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
    
    # 3. Create the default tenant admin (Issue #3)
    # Sanitize name for email (remove spaces, convert to lowercase)
    safe_name = tenant_data.name.replace(" ", "").lower()
    admin_email = f"admin@{safe_name}.com"
    
    admin_create_data = schemas.UserCreateAdmin(
        email=admin_email,
        password="admin1234",  # Standard starting password for new tenants
        full_name=f"{tenant_data.name} Admin",
        role="admin",
        tenant_id=new_tenant.id,
        is_active=True,
        is_superuser=False
    )
    
    try:
        crud.create_user_by_admin(db=db, user_data=admin_create_data)
    except Exception as e:
        # We log the warning but don't fail the tenant creation if only the user part fails
        print(f"Warning: Could not create default admin for {tenant_data.name}: {str(e)}")

    return new_tenant

@router.get("/", response_model=List[schemas.TenantRead])
@limiter.limit("100/minute")
async def read_all_tenants(
    request: Request, 
    db: DbDependency, 
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=200)
):
    """Retrieves a list of all tenants in the system."""
    return crud.get_tenants(db=db, skip=skip, limit=limit)

@router.get("/{tenant_id}", response_model=schemas.TenantRead)
@limiter.limit("100/minute")
async def read_single_tenant(request: Request, tenant_id: int, db: DbDependency):
    """Retrieves details for a specific tenant."""
    db_tenant = crud.get_tenant(db=db, tenant_id=tenant_id)
    if db_tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
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
async def delete_existing_tenant(request: Request, tenant_id: int, db: DbDependency):
    """
    Deletes a tenant. Safety check: prevents deletion if users or 
    projects are still associated with the tenant.
    """
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    # Prevent orphaned data: Check for associated entities
    user_count = db.query(models.User).filter(models.User.tenant_id == tenant_id).count()
    project_count = db.query(models.Project).filter(models.Project.tenant_id == tenant_id).count()
    
    if user_count > 0 or project_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Cannot delete tenant. It has {user_count} user(s) and {project_count} project(s) associated."
        )
    
    crud.delete_tenant(db=db, tenant_id=tenant_id)
    return None


@router.post("/{tenant_id}/upload-logo", response_class=JSONResponse)
@limiter.limit("20/minute")
async def upload_tenant_logo(
    request: Request,
    tenant_id: int,
    file: UploadFile = File(...),
    db: DbDependency = None,
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

    tenant_dir = TENANT_ASSETS_DIR / str(tenant_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)
    # Remove old logo files to avoid clutter
    for f in tenant_dir.glob("logo.*"):
        try:
            f.unlink()
        except OSError:
            pass
    logo_filename = f"logo{ext}"
    logo_path = tenant_dir / logo_filename
    with open(logo_path, "wb") as f:
        f.write(content)
    url_path = f"/static/tenant_assets/{tenant_id}/{logo_filename}"
    # Update tenant record so logo_url is set
    crud.update_tenant(db, db_tenant, schemas.TenantUpdate(logo_url=url_path))
    return JSONResponse({"url": url_path})


@router.post("/{tenant_id}/upload-background", response_class=JSONResponse)
@limiter.limit("20/minute")
async def upload_tenant_background(
    request: Request,
    tenant_id: int,
    file: UploadFile = File(...),
    db: DbDependency = None,
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

    tenant_dir = TENANT_ASSETS_DIR / str(tenant_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)
    bg_filename = f"bg_{uuid.uuid4().hex[:12]}{ext}"
    bg_path = tenant_dir / bg_filename
    with open(bg_path, "wb") as f:
        f.write(content)
    url_path = f"/static/tenant_assets/{tenant_id}/{bg_filename}"

    # Append to background_image_urls (JSON array in DB)
    current = []
    if db_tenant.background_image_urls:
        try:
            current = json.loads(db_tenant.background_image_urls)
        except Exception:
            pass
    current.append(url_path)
    crud.update_tenant(db, db_tenant, schemas.TenantUpdate(background_image_urls=current))
    return JSONResponse({"url": url_path})