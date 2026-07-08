import sys
from pathlib import Path
from sqlalchemy import or_

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import InventoryItem
from app.storage import upload_file

def run():
    # Read files
    img_3x_path = Path("C:/Users/mario/Desktop/ProductImages/Powerflex Rv-k 3x.png")
    img_1x_path = Path("C:/Users/mario/Desktop/ProductImages/Powerflex Rv-k Singlecore.png")
    
    if not img_3x_path.exists():
        print(f"Error: {img_3x_path} not found!")
        return
    if not img_1x_path.exists():
        print(f"Error: {img_1x_path} not found!")
        return
        
    print("Reading image files...")
    with open(img_3x_path, "rb") as f:
        content_3x = f.read()
    with open(img_1x_path, "rb") as f:
        content_1x = f.read()
        
    print("Uploading 3x image to Supabase Storage...")
    url_3x = upload_file(
        content=content_3x,
        filename="powerflex_rv_k_3x.png",
        folder="inventory_images",
        content_type="image/png"
    )
    print(f"Uploaded 3x to: {url_3x}")
    
    print("Uploading 1x image to Supabase Storage...")
    url_1x = upload_file(
        content=content_1x,
        filename="powerflex_rv_k_singlecore.png",
        folder="inventory_images",
        content_type="image/png"
    )
    print(f"Uploaded 1x to: {url_1x}")
    
    # Update DB
    db = SessionLocal()
    try:
        # Update 3x/3g items
        items_3x = db.query(InventoryItem).filter(
            or_(
                InventoryItem.name.like("%Powerflex Rv-k 3g%"),
                InventoryItem.name.like("%Powerflex Rv-k 3x%")
            )
        ).all()
        
        print(f"Found {len(items_3x)} items for 3x matching criteria.")
        for item in items_3x:
            item.local_image_path = url_3x
            print(f"  Updated: {item.name}")
            
        # Update 1x/1g items
        items_1x = db.query(InventoryItem).filter(
            or_(
                InventoryItem.name.like("%Powerflex Rv-k 1x%"),
                InventoryItem.name.like("%Powerflex Rv-k 1g%")
            )
        ).all()
        
        print(f"Found {len(items_1x)} items for 1x matching criteria.")
        for item in items_1x:
            item.local_image_path = url_1x
            print(f"  Updated: {item.name}")
            
        db.commit()
        print("Database transaction successfully committed!")
    except Exception as e:
        db.rollback()
        print(f"Database error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
