import sys
from pathlib import Path

# Ensure `backend/` is on `sys.path` when this script is run directly.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.database import SessionLocal
from app import models


CATEGORY_MAP = {
    "A�rir rofar og tenglar": "Aðrir rofar og tenglar",
    "Dyras�mar": "Dyrasímar",
    "Gaumlj�s og �r�stihnappa": "Gaumljós og þrýstihnappar",
    "G�mm�-og kranastrengir": "Gúmmí- og kranastrengir",
    "H�sstj�rnunarkerfi": "Hússtjórnunarkerfi",
    "I�na�ar-, g�tu- og fl��l�sing": "Iðnaðar-, götu- og flóðlýsing",
    "Kl�r, fj�ltengi & framl": "Klær, fjöltengi & framl.",
    "LED-bor�ar og fylgihlutir": "LED-borðar og fylgihlutir",
    "Lagnalei�ir": "Lagnaleiðir",
    "Ljos": "Ljós",
    "M�lar og m�lit�ki": "Mælar og mælitæki",
    "M�torar,hra�ast.,mj�kr�s": "Mótorar, hraðast., mjúkræs",
    "Nemar,vakar og li�ar": "Nemar, vöktar og liðar",
    "Ney�arl�sing": "Neyðarlýsing",
    "Rafb�lar": "Rafbílar",
    "Rofab�na�ur": "Rofabúnaður",
    "Straumspennar og aflgj.": "Straumspennar og aflgjafar",
    "St�ristrengir": "Stýrisstrengir",
    "T�flub�na�ur": "Töflubúnaður",
    "T�flusk�par": "Töfluskápar",
    "T�lvutengingar": "Tölvutengingar",
    "Veitub�na�ur": "Veitubúnaður",
    "Verkf�ri": "Verkfæri",
    "�dr�ttar- og t�fluv�r": "Ídráttar- og töfluvír",
}


SUBCATEGORY_MAP = {
    "Adrir strengir": "Aðrir strengir",
    "Hitastengir": "Hitastrengir",
    "Jardstrengir": "Jarðstrengir",
    "Ljos": "Ljós",
    "Lj�sb�na�ur": "Ljósbúnaður",
    "Ror": "Rör",
    "St�rib�na�ur": "Stýribúnaður",
    "T�flub�na�ur": "Töflubúnaður",
    "Tengib�na�ur": "Tengibúnaður",
    "Net- og fjarskiptab�na�ur": "Net- og fjarskiptabúnaður",
}


def main() -> None:
    session = SessionLocal()
    try:
        items = session.query(models.InventoryItem).all()
        updated = 0

        for item in items:
            new_category = CATEGORY_MAP.get(item.category, item.category)
            new_subcategory = SUBCATEGORY_MAP.get(item.subcategory, item.subcategory)

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
        print(f"Normalized labels for {updated} inventory rows.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

