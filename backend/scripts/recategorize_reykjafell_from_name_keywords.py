import re

from app.database import SessionLocal
from app import models


# mojibake-ish "R�R" as a standalone token (avoid matching "R�J")
PIPE_TOKEN_RE = re.compile(r"(^|[\s/\-])R[^\x00-\x7F]R([\s/\-]|$)")


def derive_category_subcategory(name: str) -> tuple[str | None, str | None]:
    if not name:
        return None, None

    upper = name.upper()

    # Cable ladders / trays
    if "KAPALSTIGI" in upper:
        return "Kapalstigar", "Kapalstigi"

    # Cables / "strengir"
    if "STRENGUR" in upper or "STRENGI" in upper:
        if "AFLSTRENGUR" in upper:
            return "Strengir", "Aflstrengir"
        if "STYR" in upper:
            return "Strengir", "Styrirstrengir"
        if "HITASTRENGUR" in upper:
            return "Strengir", "Hitastrengir"
        if "JAR" in upper and ("STRENGUR" in upper or "STRENGI" in upper):
            return "Strengir", "Jarðstrengir"
        if "PLASTSTRENGUR" in upper:
            return "Strengir", "Plaststrengir"
        if "FJARSKIPTASTRENG" in upper:
            return "Strengir", "Fjarskiptastrengir"
        if "MERKJASTRENG" in upper:
            return "Strengir", "Merkjastrengir"
        if "SKIPASTRENG" in upper:
            return "Strengir", "Skipastrengir"
        # Generic fallback for other *streng* items
        return "Strengir", "Aðrir strengir"

    # Pipes / conduits (mojibake "R�R" token or textual indicators)
    if PIPE_TOKEN_RE.search(name) or "F/R" in upper or "BLASTURS" in upper:
        return "Pípur", "Rör"

    # Connectors/fittings
    if "TENGILL" in upper:
        return "Tengi", "Tengill"
    if "TENGI" in upper:
        return "Tengi", "Tengi"
    if "KUBB" in upper:
        return "Tengi", "Tengikubbar"

    # Switchgear / rofar (these show up as ROFI/ROF in the mojibake)
    # Use ROFI first (more specific), then ROF as fallback.
    if "ROFI" in upper or "SAMROFI" in upper or "KRUNUROFI" in upper:
        return "Rofar", "Rofar"
    if "ROF" in upper:
        return "Rofar", "Rofar"

    # Lighting
    if "LED" in upper or "PERA" in upper or "LJ" in upper:
        return "Ljós", "Ljós"

    # Fasteners / clips / ties
    if "KAPALB" in upper or "FESTI" in upper or "KLIPPA" in upper:
        return "Festingar", "Festingar"

    # Panels/cabinets
    if "SKAP" in upper or "SKÁP" in upper or "TAFLA" in upper or "DIN" in upper:
        return "Töflubúnaður", "Töflubúnaður"

    return None, None


def main() -> None:
    session = SessionLocal()
    try:
        q = (
            session.query(models.InventoryItem)
            .filter(models.InventoryItem.shop_url_3 != None)  # noqa: E711
        )

        items = q.all()
        print(f"Re-categorizing Reykjasfell items: {len(items)}")

        updated = 0
        for it in items:
            new_cat, new_sub = derive_category_subcategory(it.name or "")
            if not new_cat:
                continue

            # Avoid unnecessary churn if it already matches.
            it.category = new_cat
            it.subcategory = new_sub or it.subcategory
            updated += 1

        session.commit()
        print(f"Done. Updated {updated} items.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

