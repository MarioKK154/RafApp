# backend/app/routers/shops.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/shops",
    tags=["Shops"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

def get_shop_for_user(shop_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Shop:
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_shop = crud.get_shop(db, shop_id=shop_id, tenant_id=effective_tenant_id)
    if not db_shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")
    return db_shop

@router.post("/", response_model=schemas.ShopRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_new_shop(
    request: Request,
    shop: schemas.ShopCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    return crud.create_shop(db=db, shop=shop, tenant_id=current_user.tenant_id)

@router.get("/", response_model=List[schemas.ShopRead])
@limiter.limit("100/minute")
def read_all_shops(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = 0,
    limit: int = 100
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_shops(db=db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{shop_id}", response_model=schemas.ShopRead)
@limiter.limit("100/minute")
def read_single_shop(request: Request, shop_id: int, db: DbDependency, current_user: CurrentUserDependency):
    return get_shop_for_user(shop_id, db, current_user)

@router.put("/{shop_id}", response_model=schemas.ShopRead)
@limiter.limit("100/minute")
def update_existing_shop(
    request: Request,
    shop_id: int,
    shop_update: schemas.ShopUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_shop = get_shop_for_user(shop_id, db, current_user)
    return crud.update_shop(db=db, db_shop=db_shop, shop_update=shop_update)

@router.delete("/{shop_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_existing_shop(request: Request, shop_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_shop = get_shop_for_user(shop_id, db, current_user)
    crud.delete_shop(db=db, db_shop=db_shop)
    return None