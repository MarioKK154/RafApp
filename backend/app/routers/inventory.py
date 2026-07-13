# backend/app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Dict, Any
from pydantic import BaseModel

from .. import crud, models, schemas, security, storage
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
    subsubcategories: List['InventoryCatalogSubFilter'] = []


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

@router.post("/catalog/upload-image", response_class=JSONResponse)
@limiter.limit("20/minute")
async def upload_catalog_material_image(
    request: Request,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
    file: UploadFile = File(...),
):
    """Store a local catalog material image on disk; returns URL path for local_image_path."""
    from pathlib import Path
    import uuid

    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
    MAX_SIZE_MB = 10

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image must be one of: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image must be under {MAX_SIZE_MB}MB",
        )
    
    filename = f"mat_{uuid.uuid4().hex[:16]}{ext}"
    content_type = file.content_type or "image/png"
    url_path = storage.upload_file(content, filename, "inventory_images", content_type=content_type)
    return JSONResponse({"url": url_path})

@router.get("/catalog", response_model=List[schemas.InventoryItemRead])
@limiter.limit("100/minute")
async def read_catalog_items(
    request: Request,
    db: DbDependency,
    search: Optional[str] = Query(None),
    master_category: Optional[str] = Query(None, description="Top-level category IS key"),
    category: Optional[str] = Query(None, description="Subcategory IS key"),
    subcategory: Optional[str] = Query(None, description="Sub-subcategory IS key (optional)"),
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
    Catalog SKUs with optional 3-level hierarchy filters.
    Level 1: master_category, Level 2: category (subcategory), Level 3: subcategory (sub-subcategory).
    Search runs across names, descriptions, and supplier SKU columns.
    """
    parsed_shops: List[str] = []
    if shops:
        for part in shops.split(","):
            key = part.strip().lower()
            if key:
                parsed_shops.append(key)

    return crud.get_inventory_items(
        db=db,
        search=search,
        master_category=master_category,
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

@router.get("/catalog/all-categories-distinct")
@limiter.limit("60/minute")
async def get_all_categories_distinct(request: Request, db: DbDependency):
    rows = db.query(
        models.InventoryItem.master_category, 
        models.InventoryItem.category, 
        models.InventoryItem.subcategory
    ).distinct().all()
    
    return [
        {"master_category": r[0], "category": r[1], "subcategory": r[2]}
        for r in rows
    ]

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

@router.post("/catalog/bulk-edit", response_model=Dict[str, int])
@limiter.limit("100/minute")
async def bulk_edit_catalog_items(
    request: Request,
    payload: schemas.InventoryBulkEdit,
    db: DbDependency,
    current_user: SuperuserDependency
):
    """Bulk move items to new categories/subcategories."""
    items = db.query(models.InventoryItem).filter(models.InventoryItem.id.in_(payload.item_ids)).all()
    count = 0
    for item in items:
        if payload.master_category is not None: item.master_category = payload.master_category
        if payload.category is not None: item.category = payload.category
        if payload.subcategory is not None: item.subcategory = payload.subcategory
        count += 1
    db.commit()
    return {"updated": count}

@router.post("/catalog/bulk-delete", response_model=Dict[str, int])
@limiter.limit("20/minute")
async def bulk_delete_catalog_items(
    request: Request,
    payload: schemas.InventoryBulkDelete,
    db: DbDependency,
    current_user: SuperuserDependency
):
    """Bulk delete items."""
    items = db.query(models.InventoryItem).filter(models.InventoryItem.id.in_(payload.item_ids)).all()
    count = 0
    for item in items:
        db.delete(item)
        count += 1
    db.commit()
    return {"deleted": count}

@router.post("/catalog/merge", response_model=Dict[str, Any])
@limiter.limit("20/minute")
async def merge_catalog_items(
    request: Request,
    payload: schemas.InventoryMerge,
    db: DbDependency,
    current_user: SuperuserDependency
):
    """Merge secondary items into a primary item."""
    primary = db.query(models.InventoryItem).filter(models.InventoryItem.id == payload.primary_item_id).first()
    if not primary:
        raise HTTPException(status_code=404, detail="Primary item not found")
        
    secondaries = db.query(models.InventoryItem).filter(models.InventoryItem.id.in_(payload.secondary_item_ids)).all()
    if not secondaries:
        raise HTTPException(status_code=404, detail="No valid secondary items found")
        
    for sec in secondaries:
        if not primary.ronning_sku and sec.ronning_sku: primary.ronning_sku = sec.ronning_sku
        if not primary.iskraft_sku and sec.iskraft_sku: primary.iskraft_sku = sec.iskraft_sku
        if not primary.reykjafell_sku and sec.reykjafell_sku: primary.reykjafell_sku = sec.reykjafell_sku
        if not primary.shop_url_1 and sec.shop_url_1: primary.shop_url_1 = sec.shop_url_1
        if not primary.shop_url_2 and sec.shop_url_2: primary.shop_url_2 = sec.shop_url_2
        if not primary.shop_url_3 and sec.shop_url_3: primary.shop_url_3 = sec.shop_url_3
        if not primary.brand and sec.brand: primary.brand = sec.brand

        # Remap Foreign Keys using direct updates
        try:
            db.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.inventory_item_id == sec.id).update({"inventory_item_id": primary.id})
        except Exception: pass
        
        try:
            db.query(models.BoQItem).filter(models.BoQItem.inventory_item_id == sec.id).update({"inventory_item_id": primary.id})
        except Exception: pass
        
        try:
            db.query(models.OfferLineItem).filter(models.OfferLineItem.inventory_item_id == sec.id).update({"inventory_item_id": primary.id})
        except Exception: pass
        
        try:
            db.query(models.MaterialRequest).filter(models.MaterialRequest.inventory_item_id == sec.id).update({"inventory_item_id": primary.id})
        except Exception: pass
        
        db.delete(sec)
        
    db.commit()
    return {"merged": len(secondaries), "primary_id": primary.id}

