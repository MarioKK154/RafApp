# backend/app/routers/labor_catalog.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/labor-catalog",
    tags=["Labor Catalog"],
    dependencies=[Depends(security.get_current_active_user)] # Basic auth required
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# Only Admins/PMs can modify the catalog
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

# Helper to get item and check tenant
def get_item_for_user(item_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.LaborCatalogItem:
    """
    Helper function to retrieve a labor item while enforcing tenant isolation.
    Superusers bypass the tenant check.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_item = crud.get_labor_catalog_item(db, item_id=item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Labor catalog item not found or access denied.")
    return db_item

@router.post("/", response_model=schemas.LaborCatalogItemRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_labor_item(
    request: Request,
    item_data: schemas.LaborCatalogItemCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """
    Creates a new labor item in the catalog.
    Superadmins must specify a tenant_id or they default to System Tenant (1).
    Regular admins are locked to their own tenant.
    """
    # 1. Determine target tenant
    if current_user.is_superuser:
        # Check if a tenant_id was provided in a wrapper or default to System
        # Note: If LaborCatalogItemCreate doesn't have tenant_id yet, we use 1.
        target_tenant_id = getattr(item_data, 'tenant_id', 1)
        if target_tenant_id is None:
            target_tenant_id = 1
    else:
        target_tenant_id = current_user.tenant_id

    # 2. Verify tenant exists
    if not crud.get_tenant(db, tenant_id=target_tenant_id):
        raise HTTPException(status_code=404, detail="Target tenant not found.")

    return crud.create_labor_catalog_item(db, item_data=item_data, tenant_id=target_tenant_id)

@router.get("/", response_model=List[schemas.LaborCatalogItemRead])
@limiter.limit("100/minute")
def read_labor_items(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = 0,
    limit: int = 100
):
    """
    Retrieves the list of labor catalog items.
    Superadmins see all items across all tenants; regular users see only their own.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    # If a regular user somehow has no tenant_id, we block access.
    if effective_tenant_id is None and not current_user.is_superuser:
         raise HTTPException(status_code=403, detail="Tenant context required for non-superusers.")
         
    return crud.get_labor_catalog_items(db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{item_id}", response_model=schemas.LaborCatalogItemRead)
@limiter.limit("100/minute")
def read_single_labor_item(
    request: Request,
    item_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Retrieves a single labor catalog item by ID."""
    return get_item_for_user(item_id, db, current_user)

@router.put("/{item_id}", response_model=schemas.LaborCatalogItemRead)
@limiter.limit("100/minute")
def update_labor_item(
    request: Request,
    item_id: int,
    item_update: schemas.LaborCatalogItemUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Updates a labor catalog item's description or unit price."""
    db_item = get_item_for_user(item_id, db, current_user)
    return crud.update_labor_catalog_item(db, db_item=db_item, item_update=item_update)

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_labor_item(
    request: Request,
    item_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Deletes a labor catalog item."""
    db_item = get_item_for_user(item_id, db, current_user)
    crud.delete_labor_catalog_item(db, db_item=db_item)
    return None