import os
import sys

# Add the parent directory to sys.path so we can import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from app.database import SessionLocal
from app.models import User, Tenant

def setup_default_tenant():
    db = SessionLocal()
    
    # 1. Ensure Default Tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == 1).first()
    if not tenant:
        print("Creating default Tenant (ID=1)...")
        tenant = Tenant(id=1, name="RafApp Default", is_active=True)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        print(f"Created Tenant: {tenant.name}")
    else:
        print(f"Default Tenant already exists: {tenant.name}")

    # 2. Assign Superadmin to Tenant
    email = "admin@rafapp.is"
    user = db.query(User).filter(User.email == email).first()
    if user:
        if user.tenant_id != 1:
            user.tenant_id = 1
            db.commit()
            print(f"Successfully assigned user {email} to Tenant ID 1.")
        else:
            print(f"User {email} is already assigned to Tenant ID 1.")
    else:
        print(f"WARNING: User {email} not found. Please run create_superadmin.py first.")

    db.close()

if __name__ == "__main__":
    setup_default_tenant()
