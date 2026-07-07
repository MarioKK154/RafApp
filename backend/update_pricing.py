from app.database import SessionLocal
from app.crud import get_system_setting, set_system_setting
import json

db = SessionLocal()
val = get_system_setting(db, "landing_feed_json")
if val and val.value:
    feed = json.loads(val.value)
else:
    feed = {}

feed["pricing_tiers"] = [
    {
        "name": "Sóló & Lítil (1-10)",
        "price": "16,390 ISK / mo",
        "features": [
            "Includes 2 users in base",
            "3,190 ISK per additional user",
            "Maximum cap of 41,910 ISK / mo"
        ],
        "button_text": "Get Started",
        "is_popular": False
    },
    {
        "name": "Meðalstór (11-25)",
        "price": "43,890 ISK / mo",
        "features": [
            "Includes 10 users in base",
            "2,750 ISK per additional user",
            "Maximum cap of 85,140 ISK / mo"
        ],
        "button_text": "Go Team",
        "is_popular": True
    },
    {
        "name": "Stórhópur (26-65)",
        "price": "82,390 ISK / mo",
        "features": [
            "Includes 25 users in base",
            "2,200 ISK per additional user",
            "Maximum cap of 170,390 ISK / mo"
        ],
        "button_text": "Go Business",
        "is_popular": False
    },
    {
        "name": "Fyrirtæki (66+)",
        "price": "164,890 ISK / mo",
        "features": [
            "Includes 65 users in base",
            "1,650 ISK per additional user",
            "Scales with growth"
        ],
        "button_text": "Contact Sales",
        "is_popular": False
    }
]

set_system_setting(db, "landing_feed_json", json.dumps(feed))
db.close()
print("Pricing tiers updated.")
