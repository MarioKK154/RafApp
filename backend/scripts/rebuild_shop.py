import sys
import os
import pandas as pd
from pathlib import Path
from thefuzz import process, fuzz
import json

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app import models

# Categories to skip because they contain non-physical items
SKIP_MAIN_CATEGORIES = ['ALMENNT']

# We only consider rows in Excel that have at least one URL
EXCEL_PATH = r"C:\Users\mario\Desktop\final_engineered_catalog.xlsx"

def build_shop():
    print("Connecting to database...")
    db = SessionLocal()
    
    print("Loading engineered catalog...")
    try:
        df = pd.read_excel(EXCEL_PATH)
        # Filter out rows with no URLs to speed up matching
        df = df.dropna(subset=['Ronning URL', 'Iskraft URL', 'Reykjafell URL'], how='all')
        
        # Clean descriptions
        df['Product name/description'] = df['Product name/description'].astype(str).str.strip()
        
        # Build choices dictionary mapping description -> row data
        # If there are duplicate descriptions, we'll just keep the first one
        catalog_choices = {}
        for _, row in df.iterrows():
            desc = row['Product name/description']
            if desc and desc.lower() != 'nan':
                catalog_choices[desc] = {
                    'ronning': row.get('Ronning URL'),
                    'iskraft': row.get('Iskraft URL'),
                    'reykjafell': row.get('Reykjafell URL')
                }
        
        choices_list = list(catalog_choices.keys())
        print(f"Loaded {len(choices_list)} physical product choices from Excel.")
    except Exception as e:
        print(f"Error loading Excel: {e}")
        choices_list = []
        catalog_choices = {}

    print("Fetching labor catalog items...")
    labor_items = db.query(models.LaborCatalogItem).all()
    
    print("Clearing existing inventory_items...")
    # Using TRUNCATE CASCADE to ensure everything is wiped properly
    # Note: We already did this with db_admin.py, but just to be sure we do it again
    from sqlalchemy import text
    db.execute(text("TRUNCATE TABLE inventory_items RESTART IDENTITY CASCADE"))
    db.commit()

    created_count = 0
    match_count = 0

    print("Rebuilding shop...")
    for l_item in labor_items:
        # Skip ALMENNT and empty items
        if l_item.main_category in SKIP_MAIN_CATEGORIES:
            continue
        if not l_item.description:
            continue
            
        # Optional heuristic: skip hourly rates just in case
        if "tímagjald" in l_item.description.lower() or "útmæling" in l_item.description.lower():
            continue

        # Try to find a match in the engineered catalog
        ronning_url = None
        iskraft_url = None
        reykjafell_url = None

        if choices_list:
            # We use token_set_ratio for fuzzy matching
            best_match = process.extractOne(l_item.description, choices_list, scorer=fuzz.token_set_ratio)
            
            # If confidence is > 75%, we consider it a match
            if best_match and best_match[1] > 75:
                match_desc = best_match[0]
                urls = catalog_choices[match_desc]
                ronning_url = urls['ronning'] if pd.notna(urls['ronning']) else None
                iskraft_url = urls['iskraft'] if pd.notna(urls['iskraft']) else None
                reykjafell_url = urls['reykjafell'] if pd.notna(urls['reykjafell']) else None
                match_count += 1

        # We will bundle the ar.is task ID in the ar_labor_tasks_list so we can link them
        ar_labor_tasks_list = json.dumps([l_item.id])

        new_inv = models.InventoryItem(
            name=l_item.description,
            name_en=l_item.description_en,
            master_category=l_item.main_category,
            category=l_item.sub_category,
            category_en=l_item.sub_category_en,
            description="Innflutt úr ar.is verðskrá.",
            description_en="Imported from ar.is catalog.",
            unit=l_item.unit if l_item.unit else "stk",
            ar_labor_tasks_list=ar_labor_tasks_list,
            # Vendor URLs
            shop_url_1=ronning_url,
            shop_url_2=iskraft_url,
            shop_url_3=reykjafell_url,
            warehouse_quantity=0.0
        )
        db.add(new_inv)
        created_count += 1

        if created_count % 100 == 0:
            print(f"Created {created_count} items in shop...")
            db.commit()

    db.commit()
    print(f"Successfully rebuilt shop with {created_count} items!")
    print(f"Total items linked to URLs via Fuzzy Matching: {match_count}")
    
if __name__ == '__main__':
    build_shop()
