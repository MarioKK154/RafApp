import sys
sys.path.insert(0, 'backend')
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    mains = conn.execute(text("SELECT DISTINCT main_category, main_category_en FROM labor_catalog_items")).fetchall()
    print("=== MAIN CATEGORIES ===")
    for m in mains:
        print(f"IS: {m.main_category} | EN: {m.main_category_en}")

    subs = conn.execute(text("SELECT DISTINCT sub_category, sub_category_en FROM labor_catalog_items")).fetchall()
    print("\n=== SUB CATEGORIES ===")
    for s in subs:
        print(f"IS: {s.sub_category} | EN: {s.sub_category_en}")
