import os
import sys
import shutil
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal
from app import models

def main():
    manuals_dir = Path(r"C:\Users\mario\Desktop\Manuals")
    static_tutorials_dir = Path(__file__).resolve().parents[1] / "static" / "tutorials"
    
    # Create static directory if it doesn't exist
    static_tutorials_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        # Get demo tenant and an author (admin)
        tenant = db.query(models.Tenant).filter(models.Tenant.id == 2).first()
        admin = db.query(models.User).filter(models.User.email == "admin.demo@rafapp.is").first()
        
        if not tenant or not admin:
            print("Demo tenant or admin user not found. Run seed_demo_tenant.py first.")
            return

        # Find all PDF files recursively
        pdf_files = list(manuals_dir.rglob("*.pdf"))
        print(f"Found {len(pdf_files)} PDFs in {manuals_dir}")
        
        count = 0
        for pdf_path in pdf_files:
            # Check if it already exists in DB
            filename = pdf_path.name
            existing = db.query(models.Tutorial).filter(models.Tutorial.title == filename).first()
            if existing:
                continue
                
            # Copy file to static folder
            dest_path = static_tutorials_dir / filename
            shutil.copy2(pdf_path, dest_path)
            
            # Determine category based on folder or filename
            category = models.TutorialCategory.industrial
            lower_path = str(pdf_path).lower()
            if "dali" in lower_path or "dimmer" in lower_path or "lighting" in lower_path:
                category = models.TutorialCategory.dali_system
            elif "fire" in lower_path or "bs_5839" in lower_path or "proreact" in lower_path:
                category = models.TutorialCategory.fire_system
            elif "access" in lower_path:
                category = models.TutorialCategory.access_system
            elif "smart" in lower_path or "knx" in lower_path:
                category = models.TutorialCategory.smart_home
                
            # Create tutorial record
            tutorial = models.Tutorial(
                title=filename,
                category=category,
                description=f"Installation manual and wiring guide: {filename}",
                file_path=f"/static/tutorials/{filename}",
                tenant_id=tenant.id,
                author_id=admin.id
            )
            db.add(tutorial)
            count += 1
            
        db.commit()
        print(f"Successfully seeded {count} new manuals to the Tutorials database.")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
