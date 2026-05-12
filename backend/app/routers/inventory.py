# backend/app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Dict, Any
from pydantic import BaseModel

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory Catalog"],
    dependencies=[Depends(security.block_subcontractor)]
)

# Technical Dependencies
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]
SuperuserDependency = Annotated[models.User, Depends(security.require_superuser)]

# Summary schema for stock level visualization
class GlobalInventoryItem(BaseModel):
    inventory_item: schemas.InventoryItemRead
    warehouse_quantity: float
    allocated_quantity: float
    total_quantity: float


class InventoryCatalogSubFilter(BaseModel):
    key: str
    label: str


class InventoryCatalogFilter(BaseModel):
    category: str
    category_display: str
    subcategories: List[InventoryCatalogSubFilter]

@router.get("/global-summary", response_model=List[GlobalInventoryItem])
@limiter.limit("100/minute")
def get_global_inventory(
    request: Request, 
    db: DbDependency, 
    current_user: ManagerOrAdminDependency
):
    """
    Stock overview: central warehouse quantity plus quantities allocated on projects (per SKU).
    """
    rows = crud.get_global_inventory_summary(db)
    return [
        GlobalInventoryItem(
            inventory_item=r["inventory_item"],
            warehouse_quantity=r["warehouse_quantity"],
            allocated_quantity=r["allocated_quantity"],
            total_quantity=r["total_quantity"],
        )
        for r in rows
    ]

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
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    shops: Optional[str] = Query(
        None,
        description="Comma-separated supplier keys: ronning,iskraft,reykjafell",
    ),
    shop_match: str = Query(
        "any",
        pattern="^(any|all)$",
        description="any=in at least one selected shop, all=in every selected shop (merged items)",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=4000),
):
    """
    Catalog SKUs with optional filters.
    Search runs across names, descriptions, and supplier SKU columns using expanded variants
    (e.g. comma/dot separators, g vs x between digits for multi-core markup).
    """
    parsed_shops: List[str] = []
    allowed = frozenset({"ronning", "iskraft", "reykjafell"})
    if shops:
        for part in shops.split(","):
            key = part.strip().lower()
            if key in allowed:
                parsed_shops.append(key)

    return crud.get_inventory_items(
        db=db,
        search=search,
        category=category,
        subcategory=subcategory,
        shops=parsed_shops if parsed_shops else None,
        shop_match_all=shop_match == "all",
        skip=skip,
        limit=limit,
    )


@router.get("/catalog/filters", response_model=List[InventoryCatalogFilter])
@limiter.limit("30/minute")
async def read_catalog_filters(
    request: Request,
    db: DbDependency,
    lang: Optional[str] = Query(None, description="UI language (e.g. en, is) for category/subcategory display labels"),
):
    """
    Fetch distinct category/subcategory pairs for the catalog UI.
    """
    rows = crud.get_inventory_catalog_filters(db=db, lang=lang)
    return [InventoryCatalogFilter.model_validate(r) for r in rows]


@router.post("/catalog/super/mirror-is-to-en", response_model=Dict[str, Any])
@limiter.limit("5/minute")
async def mirror_inventory_catalog_is_to_en(
    request: Request,
    db: DbDependency,
    current_user: SuperuserDependency,
):
    """Fill empty English catalog fields from Icelandic primaries (bulk). Superuser only."""
    return crud.mirror_inventory_catalog_is_to_en(db)

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