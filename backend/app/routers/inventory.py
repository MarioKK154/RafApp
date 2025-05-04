# backend/app/routers/inventory.py
# Uncondensed Version: Added endpoint to update needed quantity
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Union

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/inventory", # Prefix defined here
    tags=["Inventory"],
    dependencies=[Depends(security.get_current_active_user)] # Base auth
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)]
# --- NEW: Dependency for TL/PM/Admin ---
TeamLeaderOrHigher = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]


@router.post("/", response_model=schemas.InventoryItemRead, status_code=status.HTTP_201_CREATED)
async def create_new_inventory_item(
    item: schemas.InventoryItemCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency # Require Manager/Admin
):
    """Creates a new inventory item (Requires Manager or Admin role)."""
    return crud.create_inventory_item(db=db, item=item)

@router.get("/", response_model=List[Union[schemas.InventoryItemReadWithURLs, schemas.InventoryItemRead]])
async def read_all_inventory_items(
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = 0,
    limit: int = 100
):
    """
    Retrieves inventory items.
    Admins/PMs see items with URLs, other roles see items without URLs.
    """
    items_db = crud.get_inventory_items(db=db, skip=skip, limit=limit)
    if current_user.role in ["admin", "project manager"]:
        return [schemas.InventoryItemReadWithURLs.model_validate(item) for item in items_db]
    else:
        return [schemas.InventoryItemRead.model_validate(item) for item in items_db]


@router.get("/{item_id}", response_model=Union[schemas.InventoryItemReadWithURLs, schemas.InventoryItemRead])
async def read_single_inventory_item(
    item_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Retrieves a single inventory item by ID.
    Admins/PMs see item with URLs, other roles see item without URLs.
    """
    db_item = crud.get_inventory_item(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    if current_user.role in ["admin", "project manager"]:
        return schemas.InventoryItemReadWithURLs.model_validate(db_item)
    else:
        return schemas.InventoryItemRead.model_validate(db_item)


@router.put("/{item_id}", response_model=schemas.InventoryItemRead)
async def update_existing_inventory_item(
    item_id: int,
    item_update: schemas.InventoryItemUpdate, # Full update schema
    db: DbDependency,
    current_user: ManagerOrAdminDependency # Require Manager/Admin
):
    """Updates an existing inventory item (Requires Manager or Admin role)."""
    updated_item = crud.update_inventory_item(db=db, item_id=item_id, item_update=item_update)
    if updated_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    # Return basic read schema (no URLs needed usually after update response)
    return updated_item

# --- NEW: Endpoint to update needed quantity ---
@router.put("/{item_id}/needed", response_model=schemas.InventoryItemRead)
async def update_item_needed_quantity(
    item_id: int,
    needed_qty_data: schemas.InventoryItemUpdateNeededQty, # Use specific schema
    db: DbDependency,
    current_user: TeamLeaderOrHigher # Allow TL, PM, Admin
):
    """Updates only the 'quantity_needed' for an inventory item (Requires TL, PM, or Admin role)."""
    updated_item = crud.update_inventory_item_needed_quantity(
        db=db,
        item_id=item_id,
        quantity_needed=needed_qty_data.quantity_needed
    )
    if updated_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    # Return basic read schema
    return updated_item
# --- End New Endpoint ---


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_inventory_item(
    item_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency # Require Manager/Admin
):
    """Deletes an existing inventory item (Requires Manager or Admin role)."""
    deleted_item = crud.delete_inventory_item(db=db, item_id=item_id)
    if deleted_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return None