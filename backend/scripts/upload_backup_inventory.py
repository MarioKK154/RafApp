# backend/scripts/upload_backup_inventory.py
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models

SQLITE_DB = 'C:/Users/mario/Desktop/RafApp/backend/sql_app.backup_20260323_123753.db'
POSTGRES_URL = 'postgresql://postgres.tntvbultwjeyizswvqax:Tf22%26%26%25WbaJkdxb@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

def main():
    print("Reading inventory items from SQLite backup database...")
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_rows = sqlite_conn.execute("SELECT * FROM inventory_items").fetchall()
    sqlite_conn.close()
    
    print(f"Loaded {len(sqlite_rows)} items from SQLite.")

    print("Connecting to Supabase PostgreSQL...")
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    print("Clearing existing inventory items in Supabase...")
    db.query(models.InventoryItem).delete()
    db.commit()

    print("Uploading inventory items in bulk...")
    batch_size = 1000
    items_to_insert = []
    
    for row in sqlite_rows:
        # Map sqlite columns to SQLAlchemy models
        item = models.InventoryItem(
            id=row['id'],
            name=row['name'],
            description=row['description'],
            unit=row['unit'],
            low_stock_threshold=row['low_stock_threshold'],
            shop_url_1=row['shop_url_1'],
            shop_url_2=row['shop_url_2'],
            shop_url_3=row['shop_url_3'],
            local_image_path=row['local_image_path'],
            category=row['category'],
            subcategory=row['subcategory']
        )
        items_to_insert.append(item)
        
        if len(items_to_insert) >= batch_size:
            db.bulk_save_objects(items_to_insert)
            db.commit()
            print(f"Uploaded {len(items_to_insert)} items...")
            items_to_insert = []

    if items_to_insert:
        db.bulk_save_objects(items_to_insert)
        db.commit()
        print(f"Uploaded remaining {len(items_to_insert)} items.")

    print("Fixing PostgreSQL sequence for inventory_items_id_seq...")
    # Since we manually inserted IDs, we must reset the sequence generator
    from sqlalchemy import text
    db.execute(text("SELECT setval('inventory_items_id_seq', coalesce((SELECT max(id) FROM inventory_items), 1), true)"))
    db.commit()
    
    db.close()
    print("Bulk upload complete!")

if __name__ == '__main__':
    main()
