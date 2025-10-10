# backend/app/routers/shops.py
# New router for the Local Shops Database module.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/shops",
    tags=["Shops"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

# Helper to get a shop and verify it belongs to the user's tenant
def get_shop_for_user(shop_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Shop:
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_shop = crud.get_shop(db, shop_id=shop_id, tenant_id=effective_tenant_id)
    if not db_shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")
    return db_shop

@router.post("/", response_model=schemas.ShopRead, status_code=status.HTTP_201_CREATED)
def create_new_shop(
    shop: schemas.ShopCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Creates a new shop. Requires Admin or Project Manager role."""
    return crud.create_shop(db=db, shop=shop, tenant_id=current_user.tenant_id)

@router.get("/", response_model=List[schemas.ShopRead])
def read_all_shops(
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = 0,
    limit: int = 100
):
    """Retrieves a list of all shops for the current user's tenant."""
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_shops(db=db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{shop_id}", response_model=schemas.ShopRead)
def read_single_shop(shop_id: int, db: DbDependency, current_user: CurrentUserDependency):
    """Retrieves a single shop by its ID."""
    return get_shop_for_user(shop_id, db, current_user)

@router.put("/{shop_id}", response_model=schemas.ShopRead)
def update_existing_shop(
    shop_id: int,
    shop_update: schemas.ShopUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Updates a shop's details. Requires Admin or Project Manager role."""
    db_shop = get_shop_for_user(shop_id, db, current_user)
    return crud.update_shop(db=db, db_shop=db_shop, shop_update=shop_update)

@router.delete("/{shop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_shop(shop_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Deletes a shop. Requires Admin or Project Manager role."""
    db_shop = get_shop_for_user(shop_id, db, current_user)
    crud.delete_shop(db=db, db_shop=db_shop)
    return None