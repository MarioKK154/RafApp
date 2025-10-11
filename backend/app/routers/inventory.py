# backend/app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Union, Optional, Literal

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)]
TeamLeaderOrHigher = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]

AllowedInventorySortFields = Literal["name", "quantity", "location"]
AllowedSortDirections = Literal["asc", "desc"]

@router.post("/", response_model=schemas.InventoryItemRead, status_code=status.HTTP_201_CREATED)
async def create_new_inventory_item(item: schemas.InventoryItemCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    return crud.create_inventory_item(db=db, item=item)

@router.get("/", response_model=List[schemas.InventoryItemRead])
async def read_all_inventory_items(
    db: DbDependency,
    search: Optional[str] = Query(None, description="Search term for item name"),
    sort_by: Optional[AllowedInventorySortFields] = Query('name'),
    sort_dir: Optional[AllowedSortDirections] = Query('asc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    return crud.get_inventory_items(db=db, search=search, sort_by=sort_by, sort_dir=sort_dir, skip=skip, limit=limit)

@router.get("/{item_id}", response_model=Union[schemas.InventoryItemReadWithURLs, schemas.InventoryItemRead])
async def read_single_inventory_item(item_id: int, db: DbDependency, current_user: CurrentUserDependency):
    db_item = crud.get_inventory_item(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    if current_user.role in ["admin", "project manager"]:
        return schemas.InventoryItemReadWithURLs.model_validate(db_item)
    return schemas.InventoryItemRead.model_validate(db_item)

@router.put("/{item_id}", response_model=schemas.InventoryItemRead)
async def update_existing_inventory_item(item_id: int, item_update: schemas.InventoryItemUpdate, db: DbDependency, current_user: ManagerOrAdminDependency):
    updated_item = crud.update_inventory_item(db=db, item_id=item_id, item_update=item_update)
    if updated_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return updated_item

@router.put("/{item_id}/needed", response_model=schemas.InventoryItemRead)
async def update_item_needed_quantity(item_id: int, needed_qty_data: schemas.InventoryItemUpdateNeededQty, db: DbDependency, current_user: TeamLeaderOrHigher):
    updated_item = crud.update_inventory_item_needed_quantity(db=db, item_id=item_id, quantity_needed=needed_qty_data.quantity_needed)
    if updated_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return updated_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_inventory_item(item_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    deleted_item = crud.delete_inventory_item(db=db, item_id=item_id)
    if deleted_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return None