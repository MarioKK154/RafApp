# backend/setup_dev.py
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models, security

def setup_database():
    # 1. Clear existing database file for a clean slate
    db_file = "sql_app.db"
    if os.path.exists(db_file):
        print(f"Removing existing database: {db_file}")
        os.remove(db_file)

    # 2. Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 3. Create the System Tenant (ID 1)
        # Every multi-tenant app needs a 'base' tenant for global users.
        print("Initializing System Tenant...")
        system_tenant = models.Tenant(
            name="System Root",
            is_active=True
        )
        db.add(system_tenant)
        db.commit()
        db.refresh(system_tenant)

        # 4. Create your Superuser Account
        print("Creating Superuser account...")
        hashed_password = security.get_password_hash("admin123") # Change this immediately!
        superuser = models.User(
            email="admin@rafapp.com",
            full_name="System Superadmin",
            hashed_password=hashed_password,
            role="superuser",
            is_active=True,
            is_superuser=True,
            tenant_id=system_tenant.id
        )
        db.add(superuser)

        # 5. Seed default Inventory Catalog
        print("Seeding Inventory Catalog...")
        items = [
            models.InventoryItem(name="2.5mm Copper Cable", unit="meter", low_stock_threshold=50.0),
            models.InventoryItem(name="Single Socket Outlet", unit="piece", low_stock_threshold=10.0),
            models.InventoryItem(name="Circuit Breaker 16A", unit="piece", low_stock_threshold=5.0),
            models.InventoryItem(name="PVC Conduit 20mm", unit="meter", low_stock_threshold=100.0),
        ]
        db.add_all(items)

        # 6. Seed default Labor Catalog
        print("Seeding Labor Catalog...")
        labor_items = [
            models.LaborCatalogItem(
                description="General Electrical Installation", 
                default_unit_price=85.0, 
                unit="hour", 
                tenant_id=system_tenant.id
            ),
            models.LaborCatalogItem(
                description="Fault Finding & Repair", 
                default_unit_price=95.0, 
                unit="hour", 
                tenant_id=system_tenant.id
            ),
        ]
        db.add_all(labor_items)

        db.commit()
        print("\n" + "="*30)
        print("DATABASE SETUP SUCCESSFUL")
        print(f"Superadmin Email: {superuser.email}")
        print("Superadmin Password: admin123")
        print("System Tenant ID: 1")
        print("="*30)

    except Exception as e:
        print(f"Error during setup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_database()