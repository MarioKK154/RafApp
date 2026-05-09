import argparse
import re
import time
from pathlib import Path
from typing import Optional
from html.parser import HTMLParser

import pandas as pd
import requests

from app.database import SessionLocal
from app import models


PRODUCT_PATH_RE = re.compile(r"^/vorur/[0-9a-fA-F]{24,}-")


def _detect_columns(df: pd.DataFrame) -> tuple[Optional[str], Optional[str]]:
    cols = {str(c).strip().lower(): c for c in df.columns}
    nr_col = cols.get("nr.") or cols.get("nr")
    desc_col = None
    for key, original in cols.items():
        if "l" in key and "sing" in key:
            desc_col = original
            break
    return nr_col, desc_col


class _HrefCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() != "a":
            return
        for key, value in attrs:
            if key.lower() == "href" and value:
                self.hrefs.append(str(value))


def _extract_first_product_url(html: str) -> Optional[str]:
    parser = _HrefCollector()
    parser.feed(html)

    # First try strict product detail URL shape:
    # /vorur/<hex-id>-slug
    for href in parser.hrefs:
        h = href.strip()
        if PRODUCT_PATH_RE.match(h):
            return f"https://www.reykjafell.is{h}"

    # Fallback: first /vorur/ link that is not the generic listing page.
    for href in parser.hrefs:
        h = href.strip()
        if h.startswith("/vorur/") and h != "/vorur":
            return f"https://www.reykjafell.is{h}"

    return None


def backfill_reykjafell_product_urls(
    excel_path: Path,
    delay_s: float = 0.35,
    request_timeout_s: float = 25.0,
    limit: Optional[int] = None,
) -> None:
    if not excel_path.exists():
        print(f"File not found: {excel_path}")
        return

    print(f"Loading Reykjafell list from: {excel_path}")
    df = pd.read_excel(excel_path, engine="openpyxl")

    nr_col, desc_col = _detect_columns(df)
    if not nr_col or not desc_col:
        print("Could not detect required columns (Nr / Lýsing).")
        print("Columns:", list(df.columns))
        return

    session = SessionLocal()
    http = requests.Session()
    http.headers.update({"User-Agent": "Mozilla/5.0 (RafApp URL backfill bot)"})

    scanned = 0
    updated = 0
    skipped_missing_item = 0
    skipped_no_result = 0
    skipped_no_change = 0
    request_errors = 0

    try:
        for _, row in df.iterrows():
            if limit is not None and scanned >= limit:
                break

            raw_nr = row.get(nr_col)
            raw_name = row.get(desc_col)
            if raw_nr is None or raw_name is None:
                continue

            nr_str = str(raw_nr).strip()
            name = str(raw_name).strip()
            if not nr_str or nr_str.lower() == "nan" or not name or name.lower() == "nan":
                continue

            scanned += 1
            search_url = f"https://www.reykjafell.is/vorur?q={nr_str}"

            try:
                resp = http.get(search_url, timeout=request_timeout_s)
                if resp.status_code != 200:
                    request_errors += 1
                    time.sleep(delay_s)
                    continue
                product_url = _extract_first_product_url(resp.text)
            except Exception:
                request_errors += 1
                time.sleep(delay_s)
                continue

            if not product_url:
                skipped_no_result += 1
                time.sleep(delay_s)
                continue

            item = (
                session.query(models.InventoryItem)
                .filter(models.InventoryItem.name == name)
                .first()
            )
            if not item:
                skipped_missing_item += 1
                time.sleep(delay_s)
                continue

            if item.shop_url_3 == product_url:
                skipped_no_change += 1
                time.sleep(delay_s)
                continue

            item.shop_url_3 = product_url
            session.add(item)
            updated += 1

            # Commit in small batches to keep progress safe.
            if updated % 100 == 0:
                session.commit()
                print(f"Progress: scanned={scanned}, updated={updated}")

            time.sleep(delay_s)

        session.commit()
        print("Reykjafell product-url backfill complete.")
        print(
            f"scanned={scanned}, updated={updated}, "
            f"skipped_missing_item={skipped_missing_item}, skipped_no_result={skipped_no_result}, "
            f"skipped_no_change={skipped_no_change}, request_errors={request_errors}"
        )
    finally:
        session.close()
        http.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill shop_url_3 with exact Reykjafell product URLs by search")
    parser.add_argument("excel_path", help="Path to tengill listi.xlsx")
    parser.add_argument("--delay", type=float, default=0.35, help="Delay between requests in seconds")
    parser.add_argument("--timeout", type=float, default=25.0, help="HTTP request timeout in seconds")
    parser.add_argument("--limit", type=int, default=None, help="Optional max rows to process")
    args = parser.parse_args()

    backfill_reykjafell_product_urls(
        excel_path=Path(args.excel_path).resolve(),
        delay_s=args.delay,
        request_timeout_s=args.timeout,
        limit=args.limit,
    )


if __name__ == "__main__":
    main()

