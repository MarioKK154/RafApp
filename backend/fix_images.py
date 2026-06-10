import os
import shutil
from pathlib import Path
from app.database import SessionLocal
from app.models import InventoryItem

STATIC_DIR = Path(__file__).resolve().parent / 'app' / 'static' / 'inventory_images'

def main():
    db = SessionLocal()
    
    count = 0
    for file in os.listdir(STATIC_DIR):
        if not file[0].isdigit():
            continue
            
        parts = file.split('_', 1)
        if len(parts) < 2:
            continue
            
        item_id_str = parts[0]
        ext = os.path.splitext(file)[1]
        
        try:
            item_id = int(item_id_str)
        except ValueError:
            continue
            
        new_filename = f"{item_id}{ext}"
        old_path = STATIC_DIR / file
        new_path = STATIC_DIR / new_filename
        
        if old_path != new_path:
            if new_path.exists():
                old_path.unlink()
            else:
                old_path.rename(new_path)
        
        item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
        if item:
            item.local_image_path = f"static/inventory_images/{new_filename}"
            count += 1
            
    db.commit()
    print(f"Fixed {count} images.")

if __name__ == '__main__':
    main()
