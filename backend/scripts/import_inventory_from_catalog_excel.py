"""
Replace/import inventory catalog from a merged Excel catalog.

Reads ONLY the product sheets: Cables, Cable trays and ladders, Pipes.

Field mapping:
  Main category IS/EN  -> master_category / (stored alongside category_en)
  Subcategory IS/EN    -> category / category_en
  Sub-subcategory IS/EN-> subcategory / subcategory_en  (optional)
  Product IS/EN        -> name / name_en
  Iskraft URL          -> shop_url_2
  Ronning URL          -> shop_url_1
  Reykjafell URL       -> shop_url_3
  Image path           -> local_image_path

Usage:
    python scripts/import_inventory_from_catalog_excel.py "C:/path/product database.xlsx" --replace
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional
import sys

import pandas as pd
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal
from app import models, schemas, crud

# Only these sheets contain product data
PRODUCT_SHEETS = ["Cables", "Cable trays and ladders", "Pipes"]


def _clean(v: object) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    if not s or s.lower() == "nan":
        return None
    return s


def _pick(row: dict, names: list[str]) -> Optional[str]:
    lowered = {str(k).strip().lower(): v for k, v in row.items()}
    for n in names:
        if n.lower() in lowered:
            return _clean(lowered[n.lower()])
    return None


def _resolve_fields(row: dict) -> tuple[
    Optional[str], Optional[str],   # master_category IS, EN
    Optional[str], Optional[str],   # category (subcategory) IS, EN
    Optional[str], Optional[str],   # subcategory (sub-sub) IS, EN
    Optional[str], Optional[str],   # name IS, EN
    Optional[str], Optional[str], Optional[str],  # shop URLs: ronning, iskraft, reykjafell
    Optional[str],                  # image path
]:
    master_cat    = _pick(row, ["Main category Icelandic", "Main category"])
    master_cat_en = _pick(row, ["Main category English"])

    category    = _pick(row, ["Subcategory Icelandic", "Subcategory"])
    category_en = _pick(row, ["Subcategory English"])

    subcategory    = _pick(row, ["Sub-subcategory Icelandic", "Sub subcategory Icelandic", "Sub-subcategory"])
    subcategory_en = _pick(row, ["Sub-subcategory English", "Sub subcategory English"])

    name    = _pick(row, ["Product Icelandic", "Product name/description", "Name"])
    name_en = _pick(row, ["Product English", "Product name/description English"])

    ronning    = _pick(row, ["Ronning"])
    iskraft    = _pick(row, ["Iskraft"])
    reykjafell = _pick(row, ["Reykjafell"])
    image_path = _pick(row, ["Image path", "Local image path"])

    return master_cat, master_cat_en, category, category_en, subcategory, subcategory_en, name, name_en, ronning, iskraft, reykjafell, image_path


def _replace_inventory_table(db) -> None:
    db.query(models.ProjectInventoryItem).delete(synchronize_session=False)
    db.query(models.BoQItem).delete(synchronize_session=False)
    db.query(models.MaterialRequest).delete(synchronize_session=False)
    db.query(models.OfferLineItem).delete(synchronize_session=False)
    db.query(models.InventoryItem).delete(synchronize_session=False)
    db.commit()


def import_catalog_excel(path: Path, replace: bool) -> None:
    if not path.exists():
        raise SystemExit(f"Catalog file not found: {path}")

    xl = pd.ExcelFile(path)
    available_sheets = xl.sheet_names
    sheets_to_import = [s for s in PRODUCT_SHEETS if s in available_sheets]
    skipped_sheets = [s for s in PRODUCT_SHEETS if s not in available_sheets]
    if skipped_sheets:
        print(f"Note: sheets not found (skipped): {skipped_sheets}")
    if not sheets_to_import:
        raise SystemExit("No product sheets found in the file.")

    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        if replace:
            _replace_inventory_table(db)

        for sheet_name in sheets_to_import:
            df = pd.read_excel(xl, sheet_name=sheet_name)
            rows = df.to_dict(orient="records")
            sheet_created = 0
            sheet_skipped = 0

            for row in rows:
                (
                    master_cat, master_cat_en,
                    category, category_en,
                    subcategory, subcategory_en,
                    name, name_en,
                    ronning, iskraft, reykjafell,
                    image_path,
                ) = _resolve_fields(row)

                # Name fallbacks between IS and EN
                if not name and name_en:
                    name = name_en
                if not name_en and name:
                    name_en = name
                if not name:
                    sheet_skipped += 1
                    continue

                # Master category: keep IS as primary key, EN as display
                if not master_cat and master_cat_en:
                    master_cat = master_cat_en
                if not master_cat_en and master_cat:
                    master_cat_en = master_cat

                # Subcategory strategy: use EN as the primary key (stored in `category`)
                # because IS names are often missing or non-descriptive (e.g. all Cables = "Rafstrengir").
                # IS stored in `category_en` as the secondary/display field.
                # If only IS exists, use it as key.
                if category_en and category:
                    # Both exist: use EN as key, IS as label
                    cat_key_val = category_en
                    cat_label_val = category
                elif category_en:
                    cat_key_val = category_en
                    cat_label_val = category_en
                elif category:
                    cat_key_val = category
                    cat_label_val = category
                else:
                    cat_key_val = None
                    cat_label_val = None

                # Sub-subcategory: same strategy — EN as key, IS as label
                if subcategory_en and subcategory:
                    sub_key_val = subcategory_en
                    sub_label_val = subcategory
                elif subcategory_en:
                    sub_key_val = subcategory_en
                    sub_label_val = subcategory_en
                elif subcategory:
                    sub_key_val = subcategory
                    sub_label_val = subcategory
                else:
                    sub_key_val = None
                    sub_label_val = None

                item_in = schemas.InventoryItemCreate(
                    name=name,
                    name_en=name_en,
                    master_category=master_cat,
                    category=cat_key_val,        # EN subcategory as primary key
                    category_en=cat_label_val,   # IS subcategory as label/alt
                    subcategory=sub_key_val,      # EN sub-sub as primary key (optional)
                    subcategory_en=sub_label_val, # IS sub-sub as label/alt
                    description=None,
                    unit=None,
                    low_stock_threshold=None,
                    shop_url_1=ronning,
                    shop_url_2=iskraft,
                    shop_url_3=reykjafell,
                    local_image_path=image_path,
                )
                crud.create_inventory_item(db, item_in)
                sheet_created += 1

            created += sheet_created
            skipped += sheet_skipped
            print(f"  Sheet '{sheet_name}': created={sheet_created}, skipped={sheet_skipped}")

        total = db.query(models.InventoryItem).count()
        print(f"\nCatalog import complete. created={created}, skipped={skipped}, total_inventory_items={total}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import product catalog Excel into inventory.")
    parser.add_argument("xlsx_path", type=str, help="Path to product database Excel file.")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete older inventory catalog records first (recommended for version replacement).",
    )
    args = parser.parse_args()
    import_catalog_excel(Path(args.xlsx_path).expanduser(), replace=args.replace)


if __name__ == "__main__":
    main()
