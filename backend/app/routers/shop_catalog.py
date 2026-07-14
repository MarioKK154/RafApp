# backend/app/routers/shop_catalog.py
"""
F3: Global Shop Catalog
-----------------------
Cross-tenant. Superusers manage GlobalShop records and price entries.
All authenticated users can read shops and view/compare prices.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_
from typing import Annotated, List, Optional

from .. import models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/shop-catalog",
    tags=["Shop Catalog"],
    dependencies=[Depends(security.block_subcontractor)],
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDep = Annotated[models.User, Depends(security.get_current_active_user)]
SuperuserDep = Annotated[models.User, Depends(security.require_superuser)]


# ── Global Shops ────────────────────────────────────────────────────────────────

@router.get("/shops", response_model=List[schemas.GlobalShopRead])
@limiter.limit("200/minute")
def list_shops(request: Request, db: DbDependency, current_user: CurrentUserDep):
    """List all active global shops."""
    return db.query(models.GlobalShop).filter(models.GlobalShop.is_active == True).order_by(models.GlobalShop.name).all()


@router.get("/shops/all", response_model=List[schemas.GlobalShopRead])
@limiter.limit("100/minute")
def list_all_shops(request: Request, db: DbDependency, current_user: SuperuserDep):
    """Superuser: list all shops including inactive."""
    return db.query(models.GlobalShop).order_by(models.GlobalShop.name).all()


@router.post("/shops", response_model=schemas.GlobalShopRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def create_shop(request: Request, shop: schemas.GlobalShopCreate, db: DbDependency, current_user: SuperuserDep):
    existing = db.query(models.GlobalShop).filter(models.GlobalShop.name == shop.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="A shop with this name already exists.")
    db_shop = models.GlobalShop(**shop.model_dump())
    db.add(db_shop)
    db.commit()
    db.refresh(db_shop)
    try:
        models.add_dynamic_shop_column(db, db_shop.id)
    except Exception as e:
        import logging
        logging.warning(f"Failed to add dynamic shop column for shop {db_shop.id}: {e}")
    return db_shop


@router.put("/shops/{shop_id}", response_model=schemas.GlobalShopRead)
@limiter.limit("60/minute")
def update_shop(request: Request, shop_id: int, shop: schemas.GlobalShopUpdate, db: DbDependency, current_user: SuperuserDep):
    db_shop = db.get(models.GlobalShop, shop_id)
    if not db_shop:
        raise HTTPException(status_code=404, detail="Shop not found.")
    for k, v in shop.model_dump(exclude_unset=True).items():
        setattr(db_shop, k, v)
    db.commit()
    db.refresh(db_shop)
    return db_shop


@router.delete("/shops/{shop_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def delete_shop(request: Request, shop_id: int, db: DbDependency, current_user: SuperuserDep):
    db_shop = db.get(models.GlobalShop, shop_id)
    if not db_shop:
        raise HTTPException(status_code=404, detail="Shop not found.")
    db.delete(db_shop)
    db.commit()
    return None


# ── Shop Item Prices ─────────────────────────────────────────────────────────────

@router.put("/shops/{shop_id}/items/{inventory_item_id}/price", response_model=schemas.ShopItemPriceRead)
@limiter.limit("200/minute")
def upsert_item_price(
    request: Request,
    shop_id: int,
    inventory_item_id: int,
    body: schemas.ShopItemPriceUpsert,
    db: DbDependency,
    current_user: CurrentUserDep,
):
    """
    Upsert the price for a specific (shop, inventory item) pair.
    Any authenticated non-subcontractor user can update prices.
    """
    # Verify shop and item exist
    shop = db.get(models.GlobalShop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found.")
    item = db.get(models.InventoryItem, inventory_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    existing = (
        db.query(models.ShopItemPrice)
        .filter_by(shop_id=shop_id, inventory_item_id=inventory_item_id)
        .first()
    )
    if existing:
        for k, v in body.model_dump(exclude_unset=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_price = models.ShopItemPrice(
            shop_id=shop_id,
            inventory_item_id=inventory_item_id,
            **body.model_dump()
        )
        db.add(new_price)
        db.commit()
        db.refresh(new_price)
        return new_price


@router.delete("/shops/{shop_id}/items/{inventory_item_id}/price", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_item_price(
    request: Request,
    shop_id: int,
    inventory_item_id: int,
    db: DbDependency,
    current_user: CurrentUserDep,
):
    existing = (
        db.query(models.ShopItemPrice)
        .filter_by(shop_id=shop_id, inventory_item_id=inventory_item_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return None


# ── Inventory Items With Prices (comparison view) ────────────────────────────────

@router.get("/items", response_model=List[schemas.InventoryItemWithPricesRead])
@limiter.limit("100/minute")
def list_items_with_prices(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDep,
    search: Optional[str] = Query(None, description="Filter by name or brand"),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Returns inventory items enriched with per-shop prices.
    Supports search, category filter, and pagination.
    """
    q = db.query(models.InventoryItem).options(
        selectinload(models.InventoryItem.offer_line_items)  # avoid lazy load issues
    )
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                models.InventoryItem.name.ilike(like),
                models.InventoryItem.name_en.ilike(like),
                models.InventoryItem.brand.ilike(like),
            )
        )
    if category:
        q = q.filter(models.InventoryItem.category == category)
    if subcategory:
        q = q.filter(models.InventoryItem.subcategory == subcategory)

    items = q.offset(skip).limit(limit).all()

    # Load prices in bulk
    item_ids = [i.id for i in items]
    prices = (
        db.query(models.ShopItemPrice)
        .filter(models.ShopItemPrice.inventory_item_id.in_(item_ids))
        .all()
    )
    # Group prices by inventory_item_id
    price_map: dict[int, list] = {}
    for p in prices:
        price_map.setdefault(p.inventory_item_id, []).append(p)

    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "name_en": item.name_en,
            "category": item.category,
            "subcategory": item.subcategory,
            "unit": item.unit,
            "brand": item.brand,
            "shop_prices": price_map.get(item.id, []),
        })
    return result


@router.get("/items/{inventory_item_id}/prices", response_model=List[schemas.ShopItemPriceRead])
@limiter.limit("200/minute")
def get_prices_for_item(
    request: Request,
    inventory_item_id: int,
    db: DbDependency,
    current_user: CurrentUserDep,
):
    """Get all shop prices for a specific inventory item."""
    return (
        db.query(models.ShopItemPrice)
        .filter(models.ShopItemPrice.inventory_item_id == inventory_item_id)
        .all()
    )
