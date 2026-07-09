import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud import get_system_setting, set_system_setting

def main():
    db = SessionLocal()
    try:
        setting = get_system_setting(db, "landing_feed_json")
        if not setting:
            print("Error: landing_feed_json not found.")
            return

        parsed = json.loads(setting.value)
        if "contact_persons" not in parsed or not parsed["contact_persons"]:
            parsed["contact_persons"] = [{}]
        
        parsed["contact_persons"][0].update({
            "name": "Mario Klaric Kukuz",
            "title": "CEO / Forstjóri",
            "title_en": "CEO",
            "title_is": "Forstjóri",
            "email": "mario@rafapp.is",
            "phone": "+354 858 9280",
            "image_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80"
        })

        set_system_setting(db, "landing_feed_json", json.dumps(parsed))
        print("Successfully updated contact info in DB.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
