from app.database import SessionLocal
from app import models


def _assign(name: str) -> tuple[str, str]:
    n = (name or "").upper()

    # Tools
    if any(k in n for k in ["KLAUKE", "GREENLEE", "WERA", "T�NG", "TANG", "KLIPP", "STANS", "INTERCABLE"]):
        return "Verkfæri", "Handverkfæri"

    # Lighting
    if any(k in n for k in ["LAMP", "LJ", "LED", "PERA", "KASTARABRAUT"]):
        return "Ljós", "Ljós"

    # Switchgear / controls
    if any(k in n for k in ["ROFI", "SAMROFI", "VARROFI", "HNAPP", "PUSH", "RMQ", "DIL", "LI�I", "RELAY", "SNARI"]):
        return "Rofar", "Rofar"

    # Panels / board components
    if any(k in n for k in ["TAFL", "SK�P", "SKAP", "DIN", "NEOZED", "SPENNIR", "STRAUMSP", "V�RN"]):
        return "Töflubúnaður", "Töflubúnaður"

    # Boxes / enclosures / junction-like
    if any(k in n for k in ["BOX", "KASSI", "KASS", "D�S", "DOS"]):
        return "Tengibox", "Tengibox"

    # Connectors / terminals / crimp
    if any(k in n for k in ["TENGI", "TENGILL", "RA�T", "HERPITENGI", "KAPALSK�R", "V�RAH�LKAR", "KL�"]):
        return "Tengi", "Tengi"

    # Cables / wires
    if any(k in n for k in ["KAPAL", "SN�RA", "H07V", "�DR�TTARV�R", "NYM", "EXQ", "MMJ", "RV-K"]):
        return "Strengir", "Aðrir strengir"

    # Heating
    if any(k in n for k in ["HITA", "OFN", "K�T"]):
        return "Hitatæki", "Hitatæki"

    # Smart/control protocols
    if any(k in n for k in ["KNX", "DALI"]):
        return "Hússtjórnunarkerfi", "Hússtjórnunarkerfi"

    return "Annað efni", "Óflokkað"


def main() -> None:
    session = SessionLocal()
    try:
        q = session.query(models.InventoryItem).filter(
            (models.InventoryItem.category == None)  # noqa: E711
            | (models.InventoryItem.category == "Uncategorized")
        )
        rows = q.all()
        print(f"Categorizing remaining rows: {len(rows)}")

        for item in rows:
            cat, sub = _assign(item.name or "")
            item.category = cat
            item.subcategory = sub
            session.add(item)

        session.commit()
        print(f"Updated rows: {len(rows)}")
    finally:
        session.close()


if __name__ == "__main__":
    main()

