import sys
sys.path.insert(0, 'backend')
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    items = conn.execute(text("SELECT id, description, description_en, main_category_en, sub_category_en FROM labor_catalog_items WHERE description_en ILIKE '%trachea%' OR sub_category_en ILIKE '%trachea%' OR main_category_en ILIKE '%trachea%' LIMIT 20")).fetchall()
    print("Found trachea items in labor_catalog_items:", len(items))
    for item in items:
        print(f"ID: {item.id} | IS: {item.description} | EN: {item.description_en} | Sub: {item.sub_category_en}")

    conds = conn.execute(text("SELECT id, labor_catalog_item_id, condition_description, condition_description_en FROM labor_catalog_item_conditions WHERE condition_description_en ILIKE '%trachea%' OR condition_description_en ILIKE '%borgat%' OR condition_description_en ILIKE '%borgholes%' LIMIT 20")).fetchall()
    print("\nFound trachea/borgat condition variants:", len(conds))
    for c in conds:
        print(f"ID: {c.id} | ItemID: {c.labor_catalog_item_id} | IS: {c.condition_description} | EN: {c.condition_description_en}")
