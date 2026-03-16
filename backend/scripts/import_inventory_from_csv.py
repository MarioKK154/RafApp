import argparse
import csv
from pathlib import Path
from typing import Optional

from app.database import SessionLocal
from app import models, schemas, crud


def normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


def build_category_fields(row: dict) -> tuple[Optional[str], Optional[str]]:
    """
    Map CSV columns into the two-level category model we have:
    - category: Main category (e.g. 'Cables')
    - subcategory: 'Subcategory / Sub-subcategory' when both exist, otherwise whichever is present
    """
    main = normalize_text(row.get("Main category"))
    sub = normalize_text(row.get("Subcategory"))
    sub_sub = normalize_text(row.get("Sub-subcategory"))

    if sub and sub_sub:
        sub_combined = f"{sub} / {sub_sub}"
    else:
        sub_combined = sub or sub_sub

    return main, sub_combined


def upsert_inventory_item_from_row(db, row: dict) -> Optional[models.InventoryItem]:
    """
    Create or update a single InventoryItem from a CSV row.

    CSV columns expected (header names are trimmed case-sensitive matches):
    - Main category
    - Subcategory
    - Sub-subcategory
    - Product
    - Iskraft
    - Ronning
    - Reykjavfell
    """
    # Normalize keys to be robust against extra spaces / BOM etc.
    normalized_row = { (k or "").strip(): v for k, v in row.items() }

    name = normalize_text(normalized_row.get("Product"))
    if not name:
        # Skip rows without a product name
        return None

    category, subcategory = build_category_fields(normalized_row)

    # Map supplier URLs into schema fields
    # NOTE: schema comments:
    #   shop_url_1: Ronning
    #   shop_url_2: Iskraft
    #   shop_url_3: Reykjafell
    iskraft_url = normalize_text(normalized_row.get("Iskraft"))
    ronning_url = normalize_text(normalized_row.get("Ronning"))
    # Handle both possible spellings just in case
    reykjafell_url = normalize_text(
        normalized_row.get("Reykjafell") or normalized_row.get("Reykjafell ")
    )

    # Try to find an existing item by (name, category, subcategory)
    existing = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.name == name)
        .first()
    )

    if existing:
        # Always update category / subcategory and URLs from CSV
        if category:
            existing.category = category
        if subcategory:
            existing.subcategory = subcategory
        if ronning_url:
            existing.shop_url_1 = ronning_url
        if iskraft_url:
            existing.shop_url_2 = iskraft_url
        if reykjafell_url:
            existing.shop_url_3 = reykjafell_url

        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    # New item
    item_create = schemas.InventoryItemCreate(
        name=name,
        category=category,
        subcategory=subcategory,
        description=None,
        unit=None,
        low_stock_threshold=None,
        shop_url_1=ronning_url,
        shop_url_2=iskraft_url,
        shop_url_3=reykjafell_url,
        local_image_path=None,
    )
    return crud.create_inventory_item(db=db, item=item_create)


def import_inventory(csv_path: Path) -> None:
    db = SessionLocal()
    created = 0
    updated = 0
    try:
        # Use latin-1 to tolerate non-UTF8 exports from Excel while preserving characters
        with csv_path.open("r", encoding="latin-1", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                before_commit_count = db.query(models.InventoryItem).count()
                item = upsert_inventory_item_from_row(db, row)
                if item is None:
                    continue
                after_commit_count = db.query(models.InventoryItem).count()
                if after_commit_count > before_commit_count:
                    created += 1
                else:
                    updated += 1
    finally:
        db.close()

    print(f"Import complete. Created: {created}, updated: {updated}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import inventory items into RafApp from a CSV file."
    )
    parser.add_argument("csv_path", help="Path to CSV file (e.g. Rafapp materials(Cables).csv)")
    args = parser.parse_args()

    csv_path = Path(args.csv_path).expanduser().resolve()
    if not csv_path.is_file():
        raise SystemExit(f"CSV file not found: {csv_path}")

    import_inventory(csv_path)


if __name__ == "__main__":
    main()

