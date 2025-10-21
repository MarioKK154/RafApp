# backend/app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Dict, Any
from pydantic import BaseModel

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory Catalog"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

# This schema is needed just for the summary response
class GlobalInventoryItem(BaseModel):
    inventory_item: schemas.InventoryItemRead
    total_quantity: float

@router.get("/global-summary", response_model=List[GlobalInventoryItem])
@limiter.limit("100/minute")
def get_global_inventory(request: Request, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Provides a summary of total quantities for each item across all projects in a tenant."""
    return crud.get_global_inventory_summary(db)

# The following endpoints now manage the CATALOG of items, not their quantities.
@router.post("/", response_model=schemas.InventoryItemRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_catalog_item(request: Request, item: schemas.InventoryItemCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    return crud.create_inventory_item(db=db, item=item)

@router.get("/", response_model=List[schemas.InventoryItemRead])
@limiter.limit("100/minute")
async def read_catalog_items(request: Request, db: DbDependency, skip: int = 0, limit: int = 100):
    return crud.get_inventory_items(db=db, skip=skip, limit=limit)

@router.get("/{item_id}", response_model=schemas.InventoryItemRead)
@limiter.limit("100/minute")
async def read_catalog_item(request: Request, item_id: int, db: DbDependency):
    db_item = crud.get_inventory_item(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return db_item

@router.put("/{item_id}", response_model=schemas.InventoryItemRead)
@limiter.limit("100/minute")
async def update_catalog_item(request: Request, item_id: int, item_update: schemas.InventoryItemUpdate, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_item = crud.get_inventory_item(db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return crud.update_inventory_item(db=db, db_item=db_item, item_update=item_update)

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_catalog_item(request: Request, item_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_item = crud.get_inventory_item(db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    crud.delete_inventory_item(db=db, db_item=db_item)
    return None