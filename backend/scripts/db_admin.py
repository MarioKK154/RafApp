import os
import sys
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.app.database import SessionLocal

def reset_catalog(force=False):
    if not force:
        print("WARNING: This will delete all items in 'inventory_items', 'labor_catalog_items', and their related mapping tables.")
        confirm = input("Type 'YES' to continue: ")
        if confirm != 'YES':
            print("Aborted.")
            return

    db = SessionLocal()
    try:
        # Cascade will delete project_inventory_items and project_labor_items, etc.
        # But projects, users, tenants will remain intact.
        print("Truncating inventory_items...")
        db.execute(text("TRUNCATE TABLE inventory_items RESTART IDENTITY CASCADE"))
        print("Truncating labor_catalog_items...")
        db.execute(text("TRUNCATE TABLE labor_catalog_items RESTART IDENTITY CASCADE"))
        db.commit()
        print("Catalog tables reset successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error resetting catalog: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    force = "--force" in sys.argv
    if "reset-catalog" in sys.argv:
        reset_catalog(force=force)
    else:
        print("Usage: python db_admin.py reset-catalog [--force]")
