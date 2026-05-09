import re

from app.database import SessionLocal
from app import models


PREFIX_RE = re.compile(r"^\s*\d+\s*-\s*")


def strip_prefix(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = PREFIX_RE.sub("", value).strip()
    return cleaned or value


def main() -> None:
    session = SessionLocal()
    try:
        items = session.query(models.InventoryItem).all()
        updated = 0

        for item in items:
            new_category = strip_prefix(item.category)
            new_subcategory = strip_prefix(item.subcategory)

            changed = False
            if new_category != item.category:
                item.category = new_category
                changed = True
            if new_subcategory != item.subcategory:
                item.subcategory = new_subcategory
                changed = True

            if changed:
                session.add(item)
                updated += 1

        session.commit()
        print(f"Updated {updated} inventory rows.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

