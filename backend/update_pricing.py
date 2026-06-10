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
        "name": "Sóló & Lítil",
        "price": "14,900 ISK/mo",
        "features": [
            "1 – 10 employees",
            "2 users included",
            "2,900 ISK per additional user"
        ],
        "button_text": "Get Started",
        "is_popular": False
    },
    {
        "name": "Meðalstór",
        "price": "39,900 ISK/mo",
        "features": [
            "11 – 25 employees",
            "10 users included",
            "2,500 ISK per additional user"
        ],
        "button_text": "Get Started",
        "is_popular": True
    },
    {
        "name": "Stórhópur",
        "price": "74,900 ISK/mo",
        "features": [
            "26 – 65 employees",
            "25 users included",
            "2,000 ISK per additional user"
        ],
        "button_text": "Get Started",
        "is_popular": False
    },
    {
        "name": "Fyrirtæki",
        "price": "149,900 ISK/mo",
        "features": [
            "66+ employees",
            "65 users included",
            "1,500 ISK per additional user",
            "Scales with growth"
        ],
        "button_text": "Get Started",
        "is_popular": False
    }
]

set_system_setting(db, "landing_feed_json", json.dumps(feed))
db.close()
print("Pricing tiers updated.")
