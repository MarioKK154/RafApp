"""
Upload new high resolution company logo for Rafverktakar Suðurnesja (Tenant ID: 2)
to Supabase Storage and update Tenant record in Database.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.storage import upload_file
from app.database import SessionLocal
from app import models

LOGO_SRC = Path(r"C:\Users\mario\.gemini\antigravity\brain\a4a1acf0-918f-45cf-9d9e-a218510c0f47\rafsud_company_logo_1784996741414.jpg")

def main():
    if not LOGO_SRC.exists():
        print(f"Error: {LOGO_SRC} not found!")
        return

    content = LOGO_SRC.read_bytes()
    public_url = upload_file(
        content=content,
        filename="logo.png",
        folder="tenant_assets/2",
        content_type="image/png"
    )
    print(f"Uploaded to Supabase Storage -> {public_url}")

    db = SessionLocal()
    try:
        t2 = db.query(models.Tenant).filter_by(id=2).first()
        if t2:
            t2.logo_url = public_url
            db.commit()
            print("Successfully updated Tenant 2 logo_url in Database!")
        else:
            print("Error: Tenant 2 not found in DB!")
    except Exception as e:
        print(f"Error updating DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
