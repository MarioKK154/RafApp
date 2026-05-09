import sys
from pathlib import Path

import pandas as pd

from app.database import SessionLocal
from app import models


def backfill_reykjafell_links(excel_path: Path) -> None:
    """
    Read Reyk­jafell article list from Excel and set shop_url_3 on matching
    InventoryItem rows using the search URL pattern:
        https://www.reykjafell.is/vorur?q={Nr}

    Matching is done by item name (description) which we already used when
    importing from this same Excel file.
    """
    if not excel_path.exists():
        print(f"File not found: {excel_path}")
        return

    print(f"Loading Reyk­jafell article list from: {excel_path}")
    df = pd.read_excel(excel_path)

    # Detect columns (handle possible encoding issues)
    cols = {c.strip().lower(): c for c in df.columns}
    nr_col = cols.get("nr.") or cols.get("nr")
    desc_col = None
    for key, original in cols.items():
        # catch "Lýsing" even if encoding is a bit garbled
        if "l" in key and "sing" in key:
            desc_col = original
            break

    if not nr_col or not desc_col:
        print("Could not detect required columns (Nr. / Lýsing). Aborting.")
        print("Columns were:", list(df.columns))
        return

    session = SessionLocal()
    updated = 0
    skipped_missing = 0
    skipped_has_link = 0

    try:
        for _, row in df.iterrows():
            raw_nr = row.get(nr_col)
            if raw_nr is None:
                continue
            nr_str = str(raw_nr).strip()
            if not nr_str or nr_str.lower() == "nan":
                continue

            raw_name = row.get(desc_col)
            if raw_name is None:
                continue
            name = str(raw_name).strip()
            if not name or name.lower() == "nan":
                continue

            search_url = f"https://www.reykjafell.is/vorur?q={nr_str}"

            existing = (
                session.query(models.InventoryItem)
                .filter(models.InventoryItem.name == name)
                .first()
            )
            if not existing:
                skipped_missing += 1
                continue

            if existing.shop_url_3:
                skipped_has_link += 1
                continue

            existing.shop_url_3 = search_url
            session.add(existing)
            updated += 1

        session.commit()
        print(
            f"Reykjafell link backfill complete. Updated {updated} items, "
            f"skipped {skipped_missing} with no matching inventory row, "
            f"skipped {skipped_has_link} that already had shop_url_3."
        )
    finally:
        session.close()


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        print("Usage: python -m scripts.import_reykjafell_links_from_excel <path_to_excel>")
        return
    excel_path = Path(argv[1]).resolve()
    backfill_reykjafell_links(excel_path)


if __name__ == "__main__":
    main(sys.argv)

