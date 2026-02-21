# backend/app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from pydantic import BaseModel

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory Catalog"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Technical Dependencies
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

# Summary schema for stock level visualization
class GlobalInventoryItem(BaseModel):
    inventory_item: schemas.InventoryItemRead
    total_quantity: float

@router.get("/global-summary", response_model=List[GlobalInventoryItem])
@limiter.limit("100/minute")
def get_global_inventory(
    request: Request, 
    db: DbDependency, 
    current_user: ManagerOrAdminDependency
):
    """
    Protocol: Aggregate quantities across all project nodes.
    """
    return crud.get_global_inventory_summary(db)

# --- Catalog Management Registry ---

@router.post("/catalog", response_model=schemas.InventoryItemRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_catalog_item(
    request: Request, 
    item: schemas.InventoryItemCreate, 
    db: DbDependency, 
    current_user: ManagerOrAdminDependency
):
    """Registry: Define a new material SKU."""
    return crud.create_inventory_item(db=db, item=item)

@router.get("/catalog", response_model=List[schemas.InventoryItemRead])
@limiter.limit("100/minute")
async def read_catalog_items(
    request: Request, 
    db: DbDependency, 
    search: Optional[str] = Query(None), # FIXED: Added search parameter to prevent 422
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Telemetry: Fetch all SKU definitions.
    Supports optional search filtering to reduce registry noise.
    """
    return crud.get_inventory_items(db=db, search=search, skip=skip, limit=limit)

@router.get("/catalog/{item_id}", response_model=schemas.InventoryItemRead)
@limiter.limit("100/minute")
async def read_catalog_item(
    request: Request, 
    item_id: int, 
    db: DbDependency
):
    """Telemetry: Fetch specific SKU metadata."""
    db_item = crud.get_inventory_item(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory node not found")
    return db_item

@router.put("/catalog/{item_id}", response_model=schemas.InventoryItemRead)
@limiter.limit("100/minute")
async def update_catalog_item(
    request: Request, 
    item_id: int, 
    item_update: schemas.InventoryItemUpdate, 
    db: DbDependency, 
    current_user: ManagerOrAdminDependency
):
    """Registry: Synchronize SKU metadata (units, thresholds, identifiers)."""
    db_item = crud.get_inventory_item(db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory node not found")
    return crud.update_inventory_item(db=db, db_item=db_item, item_update=item_update)

@router.delete("/catalog/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_catalog_item(
    request: Request, 
    item_id: int, 
    db: DbDependency, 
    current_user: ManagerOrAdminDependency
):
    """Protocol: Purge SKU from registry."""
    db_item = crud.get_inventory_item(db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory node not found")
    
    crud.delete_inventory_item(db=db, db_item=db_item)
    return None