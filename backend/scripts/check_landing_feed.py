import sys
import os
import json

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud import get_system_setting

def main():
    db = SessionLocal()
    try:
        setting = get_system_setting(db, "landing_feed_json")
        if setting:
            print("System Setting Found!")
            print(setting.value[:500] + "...")
            parsed = json.loads(setting.value)
            print("\nKeys in landing feed JSON:", list(parsed.keys()))
            print("\nContact Persons:")
            print(json.dumps(parsed.get("contact_persons"), indent=2))
        else:
            print("landing_feed_json not found in DB.")
    except Exception as e:
        print(f"Error checking setting: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
