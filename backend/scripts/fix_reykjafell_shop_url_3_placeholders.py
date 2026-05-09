import re
import sys
from pathlib import Path

import pandas as pd

from app.database import SessionLocal
from app import models


PLACEHOLDER_RE = re.compile(r"/vorur/%3[Ff]|/vorur/%3[fF]", re.I)


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        print("Usage: python -m scripts.fix_reykjafell_shop_url_3_placeholders <tengill_listi.xlsx>")
        return

    excel_path = Path(argv[1]).resolve()
    if not excel_path.exists():
        print(f"File not found: {excel_path}")
        return

    df = pd.read_excel(excel_path, engine="openpyxl")

    cols = {str(c).strip().lower(): c for c in df.columns}
    nr_col = cols.get("nr.") or cols.get("nr")
    desc_col = None
    for key, original in cols.items():
        if "l" in key and "sing" in key:  # matches garbled "Lýsing"
            desc_col = original
            break

    if not nr_col or not desc_col:
        print("Could not detect required columns. Found columns:", list(df.columns))
        return

    session = SessionLocal()
    updated = 0
    skipped_no_item = 0
    skipped_no_change = 0

    try:
        for _, row in df.iterrows():
            raw_nr = row.get(nr_col)
            raw_name = row.get(desc_col)
            if raw_nr is None or raw_name is None:
                continue

            nr_str = str(raw_nr).strip()
            name = str(raw_name).strip()
            if not nr_str or nr_str.lower() == "nan" or not name or name.lower() == "nan":
                continue

            search_url = f"https://www.reykjafell.is/vorur?q={nr_str}"

            item = session.query(models.InventoryItem).filter(models.InventoryItem.name == name).first()
            if not item:
                skipped_no_item += 1
                continue

            cur = item.shop_url_3
            needs_fix = not cur or not isinstance(cur, str) or PLACEHOLDER_RE.search(cur)
            if not needs_fix:
                skipped_no_change += 1
                continue

            item.shop_url_3 = search_url
            session.add(item)
            updated += 1

        session.commit()
        print(
            "Fix complete.",
            f"updated={updated}",
            f"skipped_no_item={skipped_no_item}",
            f"skipped_no_change={skipped_no_change}",
        )
    finally:
        session.close()


if __name__ == "__main__":
    main(sys.argv)

