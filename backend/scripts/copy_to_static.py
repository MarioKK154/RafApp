import os
import shutil
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

POSTGRES_URL = "postgresql://postgres.tntvbultwjeyizswvqax:Tf22%26%26%25WbaJkdxb@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

def main():
    src_dir = Path(r"C:\Users\mario\Desktop\ProductImages")
    dest_dir = Path(__file__).resolve().parent.parent / "app" / "static" / "ProductImages"
    dest_dir.mkdir(parents=True, exist_ok=True)

    print(f"Copying files from {src_dir} to {dest_dir}...")
    
    if not src_dir.exists():
        print(f"Source directory {src_dir} does not exist!")
        return

    # Copy files
    copied_count = 0
    for f in os.listdir(src_dir):
        src_file = src_dir / f
        if src_file.is_file():
            dest_file = dest_dir / f
            shutil.copy(src_file, dest_file)
            copied_count += 1
            
    print(f"Copied {copied_count} files successfully.")

    # Update database local_image_path to be relative /static/ProductImages/filename
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    items = db.execute(text("SELECT id, name, local_image_path FROM inventory_items")).fetchall()
    updated_count = 0

    for item_id, name, path in items:
        if path:
            filename = Path(path).name
            relative_path = f"/static/ProductImages/{filename}"
            db.execute(
                text("UPDATE inventory_items SET local_image_path = :path WHERE id = :id"),
                {"path": relative_path, "id": item_id}
            )
            updated_count += 1

    db.commit()
    print(f"Updated {updated_count} item image paths in the database to be relative.")
    db.close()

if __name__ == "__main__":
    main()
