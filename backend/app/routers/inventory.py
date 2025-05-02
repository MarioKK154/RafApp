# backend/app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

@router.post("/", response_model=schemas.InventoryItemRead, status_code=status.HTTP_201_CREATED)
async def create_new_inventory_item(
    item: schemas.InventoryItemCreate,
    db: DbDependency
):
    """Creates a new inventory item."""
    return crud.create_inventory_item(db=db, item=item)

@router.get("/", response_model=List[schemas.InventoryItemRead])
async def read_all_inventory_items(
    skip: int = 0,
    limit: int = 100,
    db: DbDependency
):
    """Retrieves a list of all inventory items."""
    items = crud.get_inventory_items(db=db, skip=skip, limit=limit)
    return items

@router.get("/{item_id}", response_model=schemas.InventoryItemRead)
async def read_single_inventory_item(
    item_id: int,
    db: DbDependency
):
    """Retrieves a single inventory item by its ID."""
    db_item = crud.get_inventory_item(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return db_item

@router.put("/{item_id}", response_model=schemas.InventoryItemRead)
async def update_existing_inventory_item(
    item_id: int,
    item_update: schemas.InventoryItemUpdate,
    db: DbDependency
):
    """Updates an existing inventory item."""
    # TODO: Add authorization check if needed
    updated_item = crud.update_inventory_item(db=db, item_id=item_id, item_update=item_update)
    if updated_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return updated_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_inventory_item(
    item_id: int,
    db: DbDependency
):
    """Deletes an existing inventory item."""
    # TODO: Add authorization check if needed
    deleted_item = crud.delete_inventory_item(db=db, item_id=item_id)
    if deleted_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return None