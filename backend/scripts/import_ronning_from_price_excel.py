import sys
from pathlib import Path

import pandas as pd

from app.database import SessionLocal
from app import models


def import_ronning_from_price_list(excel_path: Path) -> None:
    """
    Import / update Rönning items from the price list Excel.

    - Uses the 'Vara' column as product number.
    - Uses the product name column as InventoryItem.name.
    - If an InventoryItem with that name exists, updates shop_url_2
      to https://ronning.is/vara/{Vara}/ (if not already set).
    - If it does not exist, creates a new InventoryItem with that name
      and shop_url_2 set.
    """
    if not excel_path.exists():
        print(f"File not found: {excel_path}")
        return

    print(f"Loading Rönning price list from: {excel_path}")
    df = pd.read_excel(excel_path)

    cols = {c.strip().lower(): c for c in df.columns}

    # Product number column (Vara)
    vara_col = None
    for key, original in cols.items():
        if key == "vara":
            vara_col = original
            break

    # Product name column – use 'Vöruflokkur Lýsing' first if present, otherwise fallback
    name_col = None
    for key, original in cols.items():
        if "lýsing" in key or "lysing" in key or "vöruflokkur lýsing" in key or "v\u00f6ruflokkur l\u00fdsing" in key:
            name_col = original
            break

    if not vara_col or not name_col:
        print("Could not detect required columns (Vara and product name). Aborting.")
        print("Columns were:", list(df.columns))
        return

    session = SessionLocal()
    created = 0
    updated_links = 0
    skipped_no_change = 0

    try:
        for _, row in df.iterrows():
            raw_nr = row.get(vara_col)
            if raw_nr is None:
                continue
            nr_str = str(raw_nr).strip()
            if not nr_str or nr_str.lower() == "nan":
                continue

            raw_name = row.get(name_col)
            if raw_name is None:
                continue
            name = str(raw_name).strip()
            if not name or name.lower() == "nan":
                continue

            ronning_url = f"https://ronning.is/vara/{nr_str}/"

            existing = (
                session.query(models.InventoryItem)
                .filter(models.InventoryItem.name == name)
                .first()
            )
            if existing:
                if not existing.shop_url_2:
                    existing.shop_url_2 = ronning_url
                    session.add(existing)
                    updated_links += 1
                else:
                    skipped_no_change += 1
                continue

            item = models.InventoryItem(
                name=name,
                category=None,
                subcategory=None,
                description=None,
                unit=None,
                low_stock_threshold=None,
                shop_url_1=None,
                shop_url_2=ronning_url,
                shop_url_3=None,
                local_image_path=None,
            )
            session.add(item)
            created += 1

        session.commit()
        print(
            f"Rönning import complete. Created {created} new items, "
            f"updated links on {updated_links} existing items, "
            f"skipped {skipped_no_change} items with existing links."
        )
    finally:
        session.close()


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        print("Usage: python -m scripts.import_ronning_from_price_excel <path_to_excel>")
        return
    excel_path = Path(argv[1]).resolve()
    import_ronning_from_price_list(excel_path)


if __name__ == "__main__":
    main(sys.argv)

