# backend/app/routers/tenants.py
# Uncondensed - Router for Tenant Management (Superuser Only)
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
    dependencies=[Depends(security.require_superuser)] # ALL endpoints here require superuser
)

DbDependency = Annotated[Session, Depends(get_db)]
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)] # Just to have current_user if needed

@router.post("/", response_model=schemas.TenantRead, status_code=status.HTTP_201_CREATED)
async def create_new_tenant(
    tenant_data: schemas.TenantCreate,
    db: DbDependency,
    # current_superuser: SuperUserDependency # Implicitly checked by router dependency
):
    """
    Creates a new Tenant. Only accessible by Superusers.
    """
    existing_tenant = crud.get_tenant_by_name(db, name=tenant_data.name)
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenant with name '{tenant_data.name}' already exists."
        )
    return crud.create_tenant(db=db, tenant=tenant_data)

@router.get("/", response_model=List[schemas.TenantRead])
async def read_all_tenants(
    db: DbDependency,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """
    Retrieves a list of all tenants. Only accessible by Superusers.
    """
    tenants = crud.get_tenants(db=db, skip=skip, limit=limit)
    return tenants

@router.get("/{tenant_id}", response_model=schemas.TenantRead)
async def read_single_tenant(
    tenant_id: int,
    db: DbDependency
):
    """
    Retrieves a single tenant by its ID. Only accessible by Superusers.
    """
    db_tenant = crud.get_tenant(db=db, tenant_id=tenant_id)
    if db_tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return db_tenant

@router.put("/{tenant_id}", response_model=schemas.TenantRead)
async def update_existing_tenant(
    tenant_id: int,
    tenant_update_data: schemas.TenantUpdate,
    db: DbDependency
):
    """
    Updates an existing tenant's details. Only accessible by Superusers.
    """
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Check if new name conflicts with an existing tenant (if name is being changed)
    if tenant_update_data.name and tenant_update_data.name != db_tenant.name:
        existing_tenant_with_new_name = crud.get_tenant_by_name(db, name=tenant_update_data.name)
        if existing_tenant_with_new_name and existing_tenant_with_new_name.id != tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tenant name '{tenant_update_data.name}' already exists.")

    return crud.update_tenant(db=db, db_tenant=db_tenant, tenant_update=tenant_update_data)

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_tenant(
    tenant_id: int,
    db: DbDependency
):
    """
    Deletes a tenant by ID. Only accessible by Superusers.
    WARNING: This will fail if users or projects are still linked to this tenant,
    unless ON DELETE CASCADE rules are appropriately set from Tenant to User/Project models.
    Current model setup does NOT cascade these deletes from Tenant.
    """
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Add checks here: if users or projects belong to this tenant, prevent deletion
    # For now, we rely on database FK constraints to prevent deletion if children exist.
    # A more user-friendly approach would be to check here and return a 400.
    if db_tenant.users or db_tenant.projects: # Check if relationships are populated
        # To make this check effective, these relationships on Tenant model should be loaded,
        # or we can query count:
        user_count = db.query(models.User).filter(models.User.tenant_id == tenant_id).count()
        project_count = db.query(models.Project).filter(models.Project.tenant_id == tenant_id).count()
        if user_count > 0 or project_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete tenant '{db_tenant.name}'. It still has {user_count} user(s) and {project_count} project(s) associated. Please reassign or delete them first."
            )

    deleted_tenant = crud.delete_tenant(db=db, tenant_id=tenant_id)
    if deleted_tenant is None: # Should have been caught by get_tenant above
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found during delete.")
    return None # For 204 No Content