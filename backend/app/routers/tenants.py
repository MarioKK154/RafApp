# backend/app/routers/tenants.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
    dependencies=[Depends(security.require_superuser)]
)

DbDependency = Annotated[Session, Depends(get_db)]

@router.post("/", response_model=schemas.TenantRead, status_code=status.HTTP_201_CREATED)
async def create_new_tenant(tenant_data: schemas.TenantCreate, db: DbDependency):
    existing_tenant = crud.get_tenant_by_name(db, name=tenant_data.name)
    if existing_tenant:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tenant with name '{tenant_data.name}' already exists.")
    return crud.create_tenant(db=db, tenant=tenant_data)

@router.get("/", response_model=List[schemas.TenantRead])
async def read_all_tenants(db: DbDependency, skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200)):
    return crud.get_tenants(db=db, skip=skip, limit=limit)

@router.get("/{tenant_id}", response_model=schemas.TenantRead)
async def read_single_tenant(tenant_id: int, db: DbDependency):
    db_tenant = crud.get_tenant(db=db, tenant_id=tenant_id)
    if db_tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return db_tenant

@router.put("/{tenant_id}", response_model=schemas.TenantRead)
async def update_existing_tenant(tenant_id: int, tenant_update_data: schemas.TenantUpdate, db: DbDependency):
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    if tenant_update_data.name and tenant_update_data.name != db_tenant.name:
        existing = crud.get_tenant_by_name(db, name=tenant_update_data.name)
        if existing and existing.id != tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tenant name '{tenant_update_data.name}' already exists.")
    return crud.update_tenant(db=db, db_tenant=db_tenant, tenant_update=tenant_update_data)

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_tenant(tenant_id: int, db: DbDependency):
    db_tenant = crud.get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    user_count = db.query(models.User).filter(models.User.tenant_id == tenant_id).count()
    project_count = db.query(models.Project).filter(models.Project.tenant_id == tenant_id).count()
    if user_count > 0 or project_count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot delete tenant. It has {user_count} user(s) and {project_count} project(s) associated.")
    
    crud.delete_tenant(db=db, tenant_id=tenant_id)
    return None