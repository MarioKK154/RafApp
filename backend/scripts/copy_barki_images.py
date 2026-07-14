import sys
from pathlib import Path
import shutil
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

POSTGRES_URL = "postgresql://postgres.tntvbultwjeyizswvqax:Tf22%26%26%25WbaJkdxb@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

def main():
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Find Plaströr images we can copy from
    plastro_items = db.execute(text("SELECT id, name, local_image_path FROM inventory_items WHERE name LIKE 'Plaströr %' ORDER BY name")).fetchall()
    plastro_map = {} # size (e.g. '16mm') -> local_image_path
    for item_id, name, img_path in plastro_items:
        size = name.split()[-1] # '16mm'
        if img_path:
            plastro_map[size] = img_path

    print("Plaströr map:", plastro_map)

    # Find Plastbarki items
    barki_items = db.execute(text("SELECT id, name FROM inventory_items WHERE name LIKE 'Plastbarki %' ORDER BY name")).fetchall()
    for barki_id, name in barki_items:
        size = name.split()[-1] # '16mm'
        if size in plastro_map:
            src_path = plastro_map[size]
            dest_filename = f"{barki_id}_Plastbarki_{size}.jpg"
            dest_path = Path(src_path).parent / dest_filename
            
            # Copy file
            shutil.copy(src_path, str(dest_path))
            
            # Update database
            db.execute(text("UPDATE inventory_items SET local_image_path = :path WHERE id = :id"), {'path': str(dest_path), 'id': barki_id})
            print(f"Updated {name} with image {dest_filename}")

    db.commit()
    db.close()

if __name__ == "__main__":
    main()
