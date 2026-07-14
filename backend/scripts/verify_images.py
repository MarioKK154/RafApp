import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

POSTGRES_URL = "postgresql://postgres.tntvbultwjeyizswvqax:Tf22%26%26%25WbaJkdxb@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

def main():
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    items = db.execute(text("SELECT id, name, local_image_path FROM inventory_items")).fetchall()
    print(f"Checking {len(items)} items from database...")

    missing_path = 0
    missing_file = 0
    small_file = 0
    ok = 0

    for item_id, name, path in items:
        if not path:
            missing_path += 1
            print(f"Item {item_id} ({name}): path is None/empty")
            continue
        
        if not os.path.exists(path):
            missing_file += 1
            print(f"Item {item_id} ({name}): file does not exist at {path}")
            continue
            
        size = os.path.getsize(path)
        if size < 500:
            small_file += 1
            print(f"Item {item_id} ({name}): file is too small ({size} bytes) at {path}")
            continue
            
        ok += 1

    print("\nVerification Summary:")
    print(f"  Valid items: {ok}")
    print(f"  Missing path: {missing_path}")
    print(f"  Missing file on disk: {missing_file}")
    print(f"  Tiny/corrupted file: {small_file}")

    db.close()

if __name__ == "__main__":
    main()
