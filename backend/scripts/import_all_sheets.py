"""
Full multi-sheet import from RafApp product database.xlsx into Supabase.
Merges: Cables (579), Cable trays and ladders (45), Pipes (24) = 648 items total.
Vendor-link sheets (Iskraft, Reykjafell, Johan Ronning) are skipped — they
are subsets of the product sheets, used only to backfill missing URLs.
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

# Sheets that contain real products
PRODUCT_SHEETS = ["Cables", "Cable trays and ladders", "Pipes"]

# Vendor URL sheets — used to backfill missing URLs on the product rows
VENDOR_SHEETS = {
    "Iskraft":       "Iskraft",
    "Reykjafell":    "Reykjafell",
    "Johan Ronning": "Ronning",
}


def n(val):
    """Return None for NaN/empty, else stripped string."""
    if val is None:
        return None
    try:
        import math
        if isinstance(val, float) and math.isnan(val):
            return None
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    return s if s and s.lower() != "nan" else None


def load_product_sheets(excel_path):
    xl = pd.ExcelFile(excel_path)
    frames = []
    for sheet in PRODUCT_SHEETS:
        df = pd.read_excel(xl, sheet_name=sheet)
        df["_sheet"] = sheet
        frames.append(df)
    combined = pd.concat(frames, ignore_index=True)
    return combined, xl


def build_vendor_lookup(xl):
    """
    Build a dict keyed by (product_name_lower) → {iskraft_url, ronning_url, reykjafell_url}
    from the three vendor link sheets.
    """
    lookup = {}  # product_name_lower → dict of urls

    for sheet_name, col_name in VENDOR_SHEETS.items():
        try:
            df = pd.read_excel(xl, sheet_name=sheet_name)
        except Exception:
            continue
        for _, row in df.iterrows():
            prod = n(row.get("Product English"))
            if not prod:
                continue
            key = prod.lower().strip()
            if key not in lookup:
                lookup[key] = {}
            url = n(row.get(col_name))
            if url:
                mapping = {"Iskraft": "iskraft", "Ronning": "ronning", "Reykjafell": "reykjafell"}
                lookup[key][mapping[col_name]] = url
    return lookup


def main():
    print(f"Reading: {EXCEL_PATH}")
    combined, xl = load_product_sheets(EXCEL_PATH)
    print(f"Total rows across product sheets: {len(combined)}")

    print("Building vendor URL lookup from vendor sheets...")
    vendor_lookup = build_vendor_lookup(xl)
    print(f"Vendor lookup entries: {len(vendor_lookup)}")

    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    print("Clearing existing inventory data...")
    db.execute(text("DELETE FROM material_requests"))
    db.execute(text("DELETE FROM boq_items"))
    db.execute(text("DELETE FROM offer_line_items"))
    db.execute(text("DELETE FROM project_inventory_items"))
    db.execute(text("DELETE FROM inventory_items"))
    db.commit()
    print("Cleared.")

    items = []
    for _, row in combined.iterrows():
        name_en   = n(row.get("Product English"))
        name_is   = n(row.get("Product Icelandic"))
        primary   = name_en or name_is or "Unnamed"
        icelandic = name_is

        # Category fields — English preferred, Icelandic fallback
        master_cat_en = n(row.get("Main category English"))
        master_cat_is = n(row.get("Main category Icelandic"))
        master_cat    = master_cat_en or master_cat_is

        subcat_en  = n(row.get("Subcategory English"))
        subcat_is  = n(row.get("Subcategory Icelandic"))
        subcat     = subcat_en or subcat_is

        subsubcat_en = n(row.get("Sub-subcategory English"))
        subsubcat_is = n(row.get("Sub-subcategory Icelandic"))
        subsubcat    = subsubcat_en or subsubcat_is

        # Supplier URLs from the product sheet itself
        ronning    = n(row.get("Ronning"))
        iskraft    = n(row.get("Iskraft"))
        reykjafell = n(row.get("Reykjafell"))

        # Backfill missing URLs from vendor sheets
        vkey = primary.lower().strip()
        if vkey in vendor_lookup:
            vmap = vendor_lookup[vkey]
            if not ronning:    ronning    = vmap.get("ronning")
            if not iskraft:    iskraft    = vmap.get("iskraft")
            if not reykjafell: reykjafell = vmap.get("reykjafell")

        item = models.InventoryItem(
            name            = primary,
            name_en         = name_en,
            description     = icelandic if icelandic and icelandic != primary else None,
            master_category = master_cat,
            category        = subcat,
            category_en     = subcat_en,
            subcategory     = subsubcat,
            subcategory_en  = subsubcat_en,
            shop_url_1      = ronning,
            shop_url_2      = iskraft,
            shop_url_3      = reykjafell,
            local_image_path= n(row.get("Image path")),
            warehouse_quantity = 0.0,
        )
        items.append(item)

    print(f"\nInserting {len(items)} items in batches of 200...")
    batch_size = 200
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        db.bulk_save_objects(batch)
        db.commit()
        print(f"  Inserted rows {i+1}–{min(i+batch_size, len(items))}")

    db.execute(text(
        "SELECT setval('inventory_items_id_seq', "
        "coalesce((SELECT max(id) FROM inventory_items), 1), true)"
    ))
    db.commit()
    db.close()

    print(f"\n✅ Done! {len(items)} items imported into inventory_items.")
    print(f"   Breakdown:")
    for sheet in PRODUCT_SHEETS:
        count = sum(1 for _, r in combined.iterrows() if r.get("_sheet") == sheet)
        print(f"   · {sheet}: {count} rows")


if __name__ == "__main__":
    main()
