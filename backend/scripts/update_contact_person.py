import sys
import os
import json
from pathlib import Path

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud import get_system_setting, set_system_setting
from app.storage import upload_file

def main():
    photo_path = Path(r"C:\Users\mario\Desktop\LinkedIn.png")
    if not photo_path.exists():
        print(f"Error: Photo path does not exist: {photo_path}")
        sys.exit(1)
        
    print(f"Reading photo: {photo_path}")
    with open(photo_path, "rb") as f:
        photo_bytes = f.read()
        
    print("Uploading photo to storage...")
    # Upload with name linkedin.png into folder contact_photos
    image_url = upload_file(
        content=photo_bytes,
        filename="linkedin.png",
        folder="contact_photos",
        content_type="image/png"
    )
    print(f"Uploaded photo. URL is: {image_url}")
    
    db = SessionLocal()
    try:
        setting = get_system_setting(db, "landing_feed_json")
        if not setting:
            print("Error: landing_feed_json not found in DB.")
            sys.exit(1)
            
        parsed = json.loads(setting.value)
        
        # Define the exact contact person list
        contact_person = {
            "name": "Mario Klaric Kukuz",
            "title": "CEO",
            "title_en": "CEO",
            "title_is": "CEO",
            "email": "mario@rafapp.is",
            "phone": "+354 858 9280",
            "image_url": image_url
        }
        
        parsed["contact_persons"] = [contact_person]
        
        # Save back to database
        set_system_setting(db, "landing_feed_json", json.dumps(parsed))
        print("Successfully updated landing_feed_json in DB with the correct contact person info!")
        
    except Exception as e:
        print(f"Error updating DB: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
