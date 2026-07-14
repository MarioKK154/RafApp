import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud import get_system_setting

def main():
    db = SessionLocal()
    try:
        setting = get_system_setting(db, "landing_feed_json")
        if setting:
            parsed = json.loads(setting.value)
            print(json.dumps(parsed, indent=2))
        else:
            print("landing_feed_json not found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
