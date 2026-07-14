"""
Import "RafApp product database.xlsx" into Supabase inventory_items table.
Clears existing items first, then bulk-inserts all 579 rows.
"""
import sys
from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import models

EXCEL_PATH = r"C:\Users\mario\Desktop\RafApp product database.xlsx"
POSTGRES_URL = (
    "postgresql://postgres.tntvbultwjeyizswvqax"
    ":Tf22%26%26%25WbaJkdxb"
    "@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
)

def nan_to_none(val):
    """Convert pandas NaN to None for clean DB inserts."""
    if val is None:
        return None
    try:
        import math
        if math.isnan(val):
            return None
    except (TypeError, ValueError):
        pass
    return str(val).strip() if isinstance(val, str) else val


def main():
    print(f"Reading: {EXCEL_PATH}")
    df = pd.read_excel(EXCEL_PATH)
    print(f"Loaded {len(df)} rows, columns: {df.columns.tolist()}")

    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    print("Clearing existing inventory_items...")
    # Delete dependent rows first
    db.execute(text("DELETE FROM material_requests"))
    db.execute(text("DELETE FROM boq_items"))
    db.execute(text("DELETE FROM offer_line_items"))
    db.execute(text("DELETE FROM project_inventory_items"))
    db.execute(text("DELETE FROM inventory_items"))
    db.commit()
    print("Cleared.")

    items = []
    for _, row in df.iterrows():
        name_en = nan_to_none(row.get("Product English"))
        name_is = nan_to_none(row.get("Product Icelandic"))
        # Use English name as primary (name), Icelandic as name_en fallback
        primary_name = name_en or name_is or "Unnamed"
        icelandic_name = name_is or name_en

        item = models.InventoryItem(
            name=primary_name,
            name_en=name_en,
            master_category=nan_to_none(row.get("Main category English")),
            category=nan_to_none(row.get("Subcategory English")),
            category_en=nan_to_none(row.get("Subcategory English")),
            subcategory=nan_to_none(row.get("Sub-subcategory English")),
            subcategory_en=nan_to_none(row.get("Sub-subcategory English")),
            # Store Icelandic in description field for reference
            description=icelandic_name if icelandic_name != primary_name else None,
            shop_url_1=nan_to_none(row.get("Ronning")),
            shop_url_2=nan_to_none(row.get("Iskraft")),
            shop_url_3=nan_to_none(row.get("Reykjafell")),
            local_image_path=nan_to_none(row.get("Image path")),
            warehouse_quantity=0.0,
        )
        items.append(item)

    print(f"Inserting {len(items)} items in batches...")
    batch_size = 200
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        db.bulk_save_objects(batch)
        db.commit()
        print(f"  Inserted rows {i+1}–{min(i+batch_size, len(items))}")

    # Reset sequence
    db.execute(text("SELECT setval('inventory_items_id_seq', coalesce((SELECT max(id) FROM inventory_items), 1), true)"))
    db.commit()
    db.close()

    print(f"\nDone! {len(items)} items imported into inventory_items.")


if __name__ == "__main__":
    main()
