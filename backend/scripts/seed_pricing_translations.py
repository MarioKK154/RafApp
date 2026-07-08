import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud import get_system_setting, set_system_setting

TRANSLATED_TIERS = [
    {
        "name": "Sóló & Lítil (1-10)",
        "name_en": "Solo & Small (1-10)",
        "name_is": "Sóló & Lítil (1-10)",
        "price": "16,390 ISK / mo",
        "features": [
            "Includes 2 users in base",
            "3,190 ISK per additional user",
            "Maximum cap of 41,910 ISK / mo"
        ],
        "features_en": [
            "Includes 2 users in base",
            "3,190 ISK per additional user",
            "Maximum cap of 41,910 ISK / mo"
        ],
        "features_is": [
            "2 notendur innifaldir í grunni",
            "3.190 ISK á hvern auka notanda",
            "Hámarksgjald 41.910 ISK / mánuði"
        ],
        "button_text": "Get Started",
        "button_text_en": "Get Started",
        "button_text_is": "Hefja prufu",
        "is_popular": False
    },
    {
        "name": "Meðalstór (11-25)",
        "name_en": "Medium (11-25)",
        "name_is": "Meðalstór (11-25)",
        "price": "43,890 ISK / mo",
        "features": [
            "Includes 10 users in base",
            "2,750 ISK per additional user",
            "Maximum cap of 85,140 ISK / mo"
        ],
        "features_en": [
            "Includes 10 users in base",
            "2,750 ISK per additional user",
            "Maximum cap of 85,140 ISK / mo"
        ],
        "features_is": [
            "10 notendur innifaldir í grunni",
            "2.750 ISK á hvern auka notanda",
            "Hámarksgjald 85.140 ISK / mánuði"
        ],
        "button_text": "Go Team",
        "button_text_en": "Go Team",
        "button_text_is": "Velja Team",
        "is_popular": True
    },
    {
        "name": "Stórhópur (26-65)",
        "name_en": "Large Group (26-65)",
        "name_is": "Stórhópur (26-65)",
        "price": "82,390 ISK / mo",
        "features": [
            "Includes 25 users in base",
            "2,200 ISK per additional user",
            "Maximum cap of 170,390 ISK / mo"
        ],
        "features_en": [
            "Includes 25 users in base",
            "2,200 ISK per additional user",
            "Maximum cap of 170,390 ISK / mo"
        ],
        "features_is": [
            "25 notendur innifaldir í grunni",
            "2.200 ISK á hvern auka notanda",
            "Hámarksgjald 170.390 ISK / mánuði"
        ],
        "button_text": "Go Business",
        "button_text_en": "Go Business",
        "button_text_is": "Velja Business",
        "is_popular": False
    },
    {
        "name": "Fyrirtæki (66+)",
        "name_en": "Enterprise (66+)",
        "name_is": "Fyrirtæki (66+)",
        "price": "164,890 ISK / mo",
        "features": [
            "Includes 65 users in base",
            "1,650 ISK per additional user",
            "Scales with growth"
        ],
        "features_en": [
            "Includes 65 users in base",
            "1,650 ISK per additional user",
            "Scales with growth"
        ],
        "features_is": [
            "65 notendur innifaldir í grunni",
            "1.650 ISK á hvern auka notanda",
            "Skalar með vexti fyrirtækisins"
        ],
        "button_text": "Contact Sales",
        "button_text_en": "Contact Sales",
        "button_text_is": "Hafa samband",
        "is_popular": False
    }
]

def main():
    db = SessionLocal()
    try:
        setting = get_system_setting(db, "landing_feed_json")
        if not setting:
            print("Error: landing_feed_json not found.")
            return

        parsed = json.loads(setting.value)
        parsed["pricing_tiers"] = TRANSLATED_TIERS

        set_system_setting(db, "landing_feed_json", json.dumps(parsed))
        print("Successfully seeded all Icelandic and English translations for pricing tiers!")
        for t in TRANSLATED_TIERS:
            print(f"  - {t['name_en']} / {t['name_is']}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
