import os
import sys
import pandas as pd
from sqlalchemy.orm import Session

# Add the parent directory to sys.path so we can import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from app.database import SessionLocal, engine
from app import models

def import_catalog():
    print("Connecting to database...")
    db: Session = SessionLocal()
    
    print("Wiping existing inventory_items to prevent duplicates...")
    db.query(models.InventoryItem).delete()
    db.commit()
    
    excel_path = r"C:\Users\mario\.gemini\antigravity\scratch\app_ready_catalog.xlsx"
    print(f"Reading {excel_path}...")
    df = pd.read_excel(excel_path)
    
    print("Importing items...")
    items_to_insert = []
    
    for index, row in df.iterrows():
        # Handle NaN values
        name = str(row['Product name/description']) if pd.notna(row['Product name/description']) else "Unknown"
        master_cat = str(row['Master Category']) if pd.notna(row['Master Category']) else None
        subcat = str(row['Subcategory']) if pd.notna(row['Subcategory']) else None
        brand = str(row['Brand']) if pd.notna(row['Brand']) else None
        volt = str(row['Voltage']) if pd.notna(row['Voltage']) else None
        amp = str(row['Amperage']) if pd.notna(row['Amperage']) else None
        ip_rating = str(row['IP Rating']) if pd.notna(row['IP Rating']) else None
        ar_tasks = str(row['AR_Labor_Tasks_List']) if pd.notna(row['AR_Labor_Tasks_List']) else None
        
        url_ronning = str(row['Ronning URL']) if pd.notna(row['Ronning URL']) else None
        url_iskraft = str(row['Iskraft URL']) if pd.notna(row['Iskraft URL']) else None
        url_reykjafell = str(row['Reykjafell URL']) if pd.notna(row['Reykjafell URL']) else None
        
        item = models.InventoryItem(
            name=name,
            master_category=master_cat,
            category=master_cat, # Keep legacy category field populated for UI compatibility
            subcategory=subcat,
            brand=brand,
            voltage=volt,
            amperage=amp,
            ip_rating=ip_rating,
            ar_labor_tasks_list=ar_tasks,
            shop_url_1=url_ronning,
            shop_url_2=url_iskraft,
            shop_url_3=url_reykjafell,
            warehouse_quantity=0.0
        )
        items_to_insert.append(item)
        
        # Batch commit every 5000 items to save memory
        if len(items_to_insert) >= 5000:
            db.bulk_save_objects(items_to_insert)
            db.commit()
            print(f"Inserted {index + 1} items...")
            items_to_insert = []
            
    # Commit the remaining
    if items_to_insert:
        db.bulk_save_objects(items_to_insert)
        db.commit()
        
    total = db.query(models.InventoryItem).count()
    print(f"\nSuccess! Total items now in the database: {total}")
    db.close()

if __name__ == "__main__":
    import_catalog()
