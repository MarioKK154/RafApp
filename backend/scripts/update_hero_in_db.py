"""
Upload the generated electrician hero image (incorporating RafApp for hero icon.png)
to Supabase Storage and update landing_feed_json in SystemSetting database.
"""

from pathlib import Path
import sys
import json

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.storage import upload_file
from app.database import SessionLocal
from app import models

HERO_IMG_PATH = Path(r"C:\Users\mario\.gemini\antigravity\brain\a4a1acf0-918f-45cf-9d9e-a218510c0f47\rafapp_hero_electrician_v2_1784996061922.jpg")
STATIC_DEST = Path(r"C:\Users\mario\Desktop\RafApp\backend\app\static\landing_hero_electrician.png")

def main():
    if not HERO_IMG_PATH.exists():
        print(f"Error: {HERO_IMG_PATH} not found!")
        return

    content = HERO_IMG_PATH.read_bytes()
    STATIC_DEST.write_bytes(content)
    print(f"Saved locally to {STATIC_DEST}")

    # 1. Upload to Supabase Storage
    public_url = upload_file(
        content=content,
        filename="hero_electrician.png",
        folder="landing",
        content_type="image/png"
    )
    print(f"Uploaded to Supabase Storage -> {public_url}")

    # 2. Update Database SystemSetting
    db = SessionLocal()
    try:
        setting = db.query(models.SystemSetting).filter_by(key="landing_feed_json").first()
        if setting:
            data = json.loads(setting.value)
            data["background_image_urls"] = [public_url]
            setting.value = json.dumps(data)
            db.commit()
            print("Successfully updated landing_feed_json in Database SystemSetting!")
        else:
            print("Warning: landing_feed_json SystemSetting not found, creating new setting.")
            new_data = {"background_image_urls": [public_url]}
            new_setting = models.SystemSetting(key="landing_feed_json", value=json.dumps(new_data))
            db.add(new_setting)
            db.commit()
            print("Successfully created landing_feed_json in Database SystemSetting!")
    except Exception as e:
        print(f"Error updating DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
