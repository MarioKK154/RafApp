import sys
from pathlib import Path

# Ensure `backend/` is on `sys.path` when this script is run directly.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.database import SessionLocal
from app import models


# Focus: make the two-level category tree in the Shop UI look closer to the supplier groupings.
# Currently implemented:
# - Cable families: any "*strengir" category becomes top-level "Strengir", and the specific type moves to subcategory.
# - Cable ladder families (Ronning "Lagna*") -> top-level "Kapalstigar".
# - Pipes: "P�pur" -> "Pípur" and "R�r" -> "Rör".

STRENGIR_TOP = "Strengir"

STRICT_SUBCATEGORY_FIX = {
    # common mojibake that appears in DB category values (and we may copy into subcategory)
    "St�ristrengir": "Stýrisstrengir",
    "G�mm�-og kranastrengir": "Gúmmí- og kranastrengir",
}

CATEGORY_TO_KAPALSTIGAR = (
    "lagnalei",
    "lagnalei�",
    "lagnaleið",
    "lagnaleiðir",
    "lagnaefni",
)

PIP_CATEGORY_FIX = {
    "P�pur": "Pípur",
}

PIP_SUBCATEGORY_FIX = {
    "R�r": "Rör",
    "Ror": "Rör",
}


def _normalize_strengir_bucket(item: models.InventoryItem) -> bool:
    """Move any "*strengir" category into top-level "Strengir"."""
    if not item.category:
        return False

    cat = item.category.strip()
    if not cat:
        return False

    if cat.lower() == STRENGIR_TOP.lower():
        return False

    if "strengir" not in cat.lower():
        return False

    # The specific type becomes the subcategory.
    new_sub = STRICT_SUBCATEGORY_FIX.get(cat, cat)
    if not item.subcategory or item.subcategory.strip() == "":
        item.subcategory = new_sub
    else:
        # Prefer keeping subcategory if it's already specific and not generic.
        # If subcategory is identical to the old category, it's likely not yet moved, so we update it.
        sub = item.subcategory.strip()
        if sub.lower() == cat.lower():
            item.subcategory = new_sub
        else:
            item.subcategory = sub

    item.category = STRENGIR_TOP
    return True


def _normalize_pipes_bucket(item: models.InventoryItem) -> bool:
    if not item.category:
        return False

    changed = False
    cat = item.category.strip()
    lower = cat.lower()
    # Be tolerant to mojibake differences: we primarily want to catch the known pipe bucket.
    new_cat = PIP_CATEGORY_FIX.get(cat) if cat in PIP_CATEGORY_FIX else None
    if not new_cat:
        # "P�pur" ends with "pur" but "Tangir / Klippur" is not desired.
        if lower.startswith("p") and lower.endswith("pur"):
            new_cat = "Pípur"

    if new_cat and new_cat != item.category:
        item.category = new_cat
        changed = True

    if item.subcategory:
        sub = item.subcategory.strip()
        new_sub = PIP_SUBCATEGORY_FIX.get(sub)
        if not new_sub:
            # Mojibake variant like "R�r" contains the replacement char and should become "Rör".
            if "�" in sub and sub.lower().endswith("r"):
                new_sub = "Rör"

        if new_sub and new_sub != item.subcategory:
            item.subcategory = new_sub
            changed = True

    return changed


def _normalize_ronning_cable_ladders_bucket(item: models.InventoryItem) -> bool:
    """Map Ronning "Lagna*" families into top-level Kapalstigar."""
    if not item.category or not item.shop_url_1:
        return False

    cat = item.category.strip()
    if not cat:
        return False

    upper = cat.lower()
    if any(token in upper for token in CATEGORY_TO_KAPALSTIGAR):
        item.category = "Kapalstigar"
        # Keep the original category label as detail.
        if not item.subcategory or item.subcategory.strip() == "":
            item.subcategory = cat
        return True

    return False


def main() -> None:
    session = SessionLocal()
    try:
        items = session.query(models.InventoryItem).all()
        updated = 0

        for item in items:
            changed = False
            changed |= _normalize_strengir_bucket(item)
            changed |= _normalize_pipes_bucket(item)
            changed |= _normalize_ronning_cable_ladders_bucket(item)

            if changed:
                session.add(item)
                updated += 1

        session.commit()
        print(f"Refined Shop buckets for {updated} inventory rows.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

