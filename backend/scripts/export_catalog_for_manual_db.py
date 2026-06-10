import pandas as pd
from app.database import SessionLocal
from app.models import LaborCatalogItem

def main():
    db = SessionLocal()
    try:
        items = db.query(LaborCatalogItem).all()
        
        data = []
        for item in items:
            data.append({
                "Main category English": item.main_category_en or "",
                "Main category Icelandic": item.main_category or "",
                "Subcategory English": item.sub_category_en or "",
                "Subcategory Icelandic": item.sub_category or "",
                "Sub-subcategory English": "",
                "Sub-subcategory Icelandic": "",
                "Product English": item.description_en or "",
                "Product Icelandic": item.description or "",
                "Iskraft": "",
                "Ronning": "",
                "Reykjafell": "",
                "Image path": ""
            })
            
        df = pd.DataFrame(data)
        
        # We need to drop duplicates since multiple conditions share the same LaborCatalogItem
        # Actually LaborCatalogItem is already distinct per item in our current DB setup.
        df.drop_duplicates(inplace=True)
        
        # Sort by categories
        df.sort_values(by=["Main category Icelandic", "Subcategory Icelandic", "Product Icelandic"], inplace=True)
        
        output_path = r'C:\Users\mario\Desktop\Labor_Catalog_To_Inventory.xlsx'
        df.to_excel(output_path, index=False)
        print(f"Successfully exported {len(df)} items to {output_path}")
        
    finally:
        db.close()

if __name__ == '__main__':
    main()
