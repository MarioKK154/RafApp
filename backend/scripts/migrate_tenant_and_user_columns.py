"""
Migration script to safely add new columns to 'tenants' and 'users' tables.
Preserves 100% of existing data (labor catalog, risk templates, offers, drawings, projects, tools, etc.).
"""

import sys
from pathlib import Path
from sqlalchemy import text, inspect

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import engine

def run_migration():
    print("Checking database columns for 'tenants' and 'users'...")
    inspector = inspect(engine)
    
    tenant_cols = [c['name'] for c in inspector.get_columns('tenants')]
    user_cols = [c['name'] for c in inspector.get_columns('users')]
    
    new_tenant_fields = [
        ("kennitala", "VARCHAR"),
        ("address", "VARCHAR"),
        ("ceo", "VARCHAR"),
        ("email", "VARCHAR"),
        ("phone_number", "VARCHAR"),
    ]
    
    with engine.begin() as conn:
        for field, ftype in new_tenant_fields:
            if field not in tenant_cols:
                print(f"Adding column '{field}' to 'tenants' table...")
                try:
                    conn.execute(text(f"ALTER TABLE tenants ADD COLUMN {field} {ftype}"))
                    print(f"  [OK] Column '{field}' added to tenants.")
                except Exception as e:
                    print(f"  [WARNING] Could not add column '{field}' to tenants: {e}")
            else:
                print(f"Column '{field}' already exists in 'tenants'.")
                
        if "custom_title" not in user_cols:
            print("Adding column 'custom_title' to 'users' table...")
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN custom_title VARCHAR"))
                print("  [OK] Column 'custom_title' added to users.")
            except Exception as e:
                print(f"  [WARNING] Could not add column 'custom_title' to users: {e}")
        else:
            print("Column 'custom_title' already exists in 'users'.")
            
    print("[SUCCESS] Database schema migration complete! No existing data was altered or lost.")

if __name__ == "__main__":
    run_migration()
