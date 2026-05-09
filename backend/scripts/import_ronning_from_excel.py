import sys
from pathlib import Path

import pandas as pd

from app.database import SessionLocal
from app import models


def import_ronning_articles(excel_path: Path) -> None:
    if not excel_path.exists():
        print(f"File not found: {excel_path}")
        return

    print(f"Loading Rönning article list from: {excel_path}")
    df = pd.read_excel(excel_path)

    # Normalize expected column names (handle encoding issues)
    cols = {c.strip().lower(): c for c in df.columns}
    nr_col = cols.get("nr.") or cols.get("nr")
    desc_col = None
    unit_col = None
    for key, original in cols.items():
        if "l" in key and "sing" in key:  # catches "Lýsing" even when garbled
            desc_col = original
        if "grunn" in key:
            unit_col = original

    if not nr_col or not desc_col:
        print("Could not detect required columns (Nr. / Lýsing). Aborting.")
        return

    session = SessionLocal()
    created = 0
    skipped_existing = 0

    try:
        for _, row in df.iterrows():
            nr_val = str(row.get(nr_col)).strip()
            if not nr_val or nr_val.lower() == "nan":
                continue

            name = str(row.get(desc_col) or "").strip()
            if not name:
                continue

            unit = str(row.get(unit_col) or "").strip() if unit_col else None

            # Compare to existing inventory by name; if already present, skip
            existing = (
                session.query(models.InventoryItem)
                .filter(models.InventoryItem.name == name)
                .first()
            )
            if existing:
                skipped_existing += 1
                continue

            item = models.InventoryItem(
                name=name,
                category=None,
                subcategory=None,
                description=None,
                unit=unit or None,
                low_stock_threshold=None,
                shop_url_1=None,  # actual Rönning URL can be filled later
                shop_url_2=None,
                shop_url_3=None,
                local_image_path=None,
            )
            session.add(item)
            created += 1

        session.commit()
        print(f"Import complete. Created {created} new items, skipped {skipped_existing} existing by name.")
    finally:
        session.close()


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        print("Usage: python -m scripts.import_ronning_from_excel <path_to_excel>")
        return
    excel_path = Path(argv[1]).resolve()
    import_ronning_articles(excel_path)


if __name__ == "__main__":
    main(sys.argv)

