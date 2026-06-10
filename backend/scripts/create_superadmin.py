import os
import sys

# Add the parent directory to sys.path so we can import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from app.database import SessionLocal
from app.models import User
from app.security import get_password_hash

def create_admin():
    db = SessionLocal()
    
    email = "admin@rafapp.is"
    password = "admin123"
    
    print(f"Checking for user: {email}")
    user = db.query(User).filter(User.email == email).first()
    
    if user:
        print("Superadmin already exists. Updating password and permissions...")
        user.hashed_password = get_password_hash(password)
        user.is_superuser = True
        user.role = "superuser"
        db.commit()
        print("Successfully updated existing superadmin.")
    else:
        print("Creating new superadmin...")
        new_user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name="System Admin",
            is_active=True,
            is_superuser=True,
            role="superuser"
        )
        db.add(new_user)
        db.commit()
        print("Successfully created new superadmin.")
        
    db.close()

if __name__ == "__main__":
    create_admin()
