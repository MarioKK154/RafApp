"""
Replace/import inventory catalog from a merged Excel catalog.

Expected columns (case-insensitive aliases supported):
- Category
- Subcategory
- Sub-subcategory
- Product name/description
- Ronning URL
- Iskraft URL
- Reykjafell URL

Usage:
    python scripts/import_inventory_from_catalog_excel.py "C:/path/merged_electrical_catalog.xlsx" --replace
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


def _resolve_fields(row: dict) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str], Optional[str], Optional[str], Optional[str]]:
    category = _pick(row, ["Category", "Main category"])
    sub = _pick(row, ["Subcategory"])
    sub_sub = _pick(row, ["Sub-subcategory", "Sub subcategory"])
    name = _pick(row, ["Product name/description", "Product", "Name", "Description"])
    ronning = _pick(row, ["Ronning URL", "Ronning"])
    iskraft = _pick(row, ["Iskraft URL", "Iskraft"])
    reykjafell = _pick(row, ["Reykjafell URL", "Reykjafell", "Reykjavfell"])
    return category, sub, sub_sub, name, ronning, iskraft, reykjafell


def _merge_subcategory(sub: Optional[str], sub_sub: Optional[str]) -> Optional[str]:
    if sub and sub_sub:
        return f"{sub} / {sub_sub}"
    return sub or sub_sub


def _replace_inventory_table(db) -> None:
    # This is intended for test/demo environments to swap catalog versions.
    db.query(models.ProjectInventoryItem).delete(synchronize_session=False)
    db.query(models.BoQItem).delete(synchronize_session=False)
    db.query(models.MaterialRequest).delete(synchronize_session=False)
    db.query(models.OfferLineItem).delete(synchronize_session=False)
    db.query(models.InventoryItem).delete(synchronize_session=False)
    db.commit()


def import_catalog_excel(path: Path, replace: bool) -> None:
    if not path.exists():
        raise SystemExit(f"Catalog file not found: {path}")

    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        if replace:
            _replace_inventory_table(db)

        df = pd.read_excel(path)
        rows = df.to_dict(orient="records")
        for row in rows:
            category, sub, sub_sub, name, ronning, iskraft, reykjafell = _resolve_fields(row)
            if not name:
                skipped += 1
                continue

            subcategory = _merge_subcategory(sub, sub_sub)
            item_in = schemas.InventoryItemCreate(
                name=name,
                category=category,
                subcategory=subcategory,
                description=None,
                unit=None,
                low_stock_threshold=None,
                shop_url_1=ronning,
                shop_url_2=iskraft,
                shop_url_3=reykjafell,
                local_image_path=None,
            )
            crud.create_inventory_item(db, item_in)
            created += 1

        total = db.query(models.InventoryItem).count()
        print(f"Catalog import complete. created={created}, skipped={skipped}, total_inventory_items={total}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import merged electrical catalog Excel into inventory.")
    parser.add_argument("xlsx_path", type=str, help="Path to merged catalog Excel file.")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete older inventory catalog records first (recommended for version replacement).",
    )
    args = parser.parse_args()
    import_catalog_excel(Path(args.xlsx_path).expanduser(), replace=args.replace)


if __name__ == "__main__":
    main()

