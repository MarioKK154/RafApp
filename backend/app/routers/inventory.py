# backend/app/routers/inventory.py
# Corrected Version: Removed redundant prefix
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Union, Optional, Literal

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    # REMOVE prefix="/inventory", # <--- Remove this line
    tags=["Inventory"],
    dependencies=[Depends(security.get_current_active_user)] # Base auth
)

# Dependency type hints (as before)
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)]
TeamLeaderOrHigher = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]

# Define allowed sort fields and directions
AllowedInventorySortFields = Literal["name", "quantity", "location"]
AllowedSortDirections = Literal["asc", "desc"]


# --- Endpoints ---

# POST / (create) - Path relative to prefix in main.py is "/"
@router.post("/", response_model=schemas.InventoryItemRead, status_code=status.HTTP_201_CREATED)
async def create_new_inventory_item(
    item: schemas.InventoryItemCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Creates a new inventory item (Requires Manager or Admin role)."""
    return crud.create_inventory_item(db=db, item=item)

# GET / (list) - Path relative to prefix in main.py is "/"
@router.get("/", response_model=List[schemas.InventoryItemRead])
async def read_all_inventory_items(
    db: DbDependency,
    # current_user: CurrentUserDependency, # Already enforced at router level
    search: Optional[str] = Query(None, description="Search term for item name"),
    sort_by: Optional[AllowedInventorySortFields] = Query('name', description="Field to sort by"),
    sort_dir: Optional[AllowedSortDirections] = Query('asc', description="Sort direction"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    items = crud.get_inventory_items(
        db=db, search=search, sort_by=sort_by, sort_dir=sort_dir, skip=skip, limit=limit
    )
    return items

# GET /{item_id} (get single) - Path relative to prefix in main.py is "/{item_id}"
@router.get("/{item_id}", response_model=Union[schemas.InventoryItemReadWithURLs, schemas.InventoryItemRead])
async def read_single_inventory_item(
    item_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Retrieves a single inventory item. Admins/PMs see URLs."""
    db_item = crud.get_inventory_item(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    if current_user.role in ["admin", "project manager"]:
        return schemas.InventoryItemReadWithURLs.model_validate(db_item)
    else:
        return schemas.InventoryItemRead.model_validate(db_item)

# PUT /{item_id} (update) - Path relative to prefix in main.py is "/{item_id}"
@router.put("/{item_id}", response_model=schemas.InventoryItemRead)
async def update_existing_inventory_item(
    item_id: int,
    item_update: schemas.InventoryItemUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Updates an existing inventory item (Requires Manager or Admin role)."""
    updated_item = crud.update_inventory_item(db=db, item_id=item_id, item_update=item_update)
    if updated_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return updated_item

# PUT /{item_id}/needed (update needed qty) - Path is "/{item_id}/needed"
@router.put("/{item_id}/needed", response_model=schemas.InventoryItemRead)
async def update_item_needed_quantity(
    item_id: int,
    needed_qty_data: schemas.InventoryItemUpdateNeededQty,
    db: DbDependency,
    current_user: TeamLeaderOrHigher
):
    """Updates only the 'quantity_needed' for an item (Requires TL, PM, or Admin role)."""
    updated_item = crud.update_inventory_item_needed_quantity(
        db=db,
        item_id=item_id,
        quantity_needed=needed_qty_data.quantity_needed
    )
    if updated_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return updated_item

# DELETE /{item_id} (delete) - Path is "/{item_id}"
@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_inventory_item(
    item_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Deletes an existing inventory item (Requires Manager or Admin role)."""
    deleted_item = crud.delete_inventory_item(db=db, item_id=item_id)
    if deleted_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return None