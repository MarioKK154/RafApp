from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from app.database import SessionLocal
from app import models

# Emit a loud milestone every N unique q values (stdout + progress file).
MILESTONE_EVERY = 250
_PROGRESS_FILE = Path(__file__).resolve().parents[1] / ".reykjafell_scraper_progress.txt"


SEARCH_Q_RE = re.compile(r"[?&]q=([0-9]+)", re.IGNORECASE)
REAL_HREF_RE = re.compile(r"^/vorur/[0-9a-fA-F]", re.IGNORECASE)


def _extract_q(url: str) -> Optional[str]:
    if not url:
        return None
    m = SEARCH_Q_RE.search(url)
    return m.group(1) if m else None


def _pick_real_product_href(hrefs: list[str]) -> Optional[str]:
    for href in hrefs:
        if not href:
            continue
        h = href.strip()
        if not h or h == "/vorur":
            continue
        # Placeholder links look like /vorur/%3F%3F%3F...
        if "%3F" in h or "%3f" in h:
            continue
        if REAL_HREF_RE.match(h):
            return h
    return None


def _apply_product_url_for_q(db, item_ids: list[int], product_url: str) -> int:
    """Update all inventory rows for this q. Returns number of rows changed."""
    changed = 0
    try:
        for item_id in item_ids:
            it = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
            if not it or not it.shop_url_3:
                continue
            if it.shop_url_3 == product_url:
                continue
            it.shop_url_3 = product_url
            db.add(it)
            changed += 1
        if changed:
            db.commit()
        return changed
    except Exception:
        db.rollback()
        raise


def main() -> None:
    # Lazy import so normal backfills don't require playwright.
    from playwright.sync_api import sync_playwright

    db = SessionLocal()
    try:
        # Only update items that still have search URLs.
        items = (
            db.query(models.InventoryItem)
            .filter(models.InventoryItem.shop_url_3 != None)  # noqa: E711
            .filter(models.InventoryItem.shop_url_3.like("https://www.reykjafell.is/vorur?q=%"))  # noqa: E711
            .all()
        )
        if not items:
            print("No items require backfilling shop_url_3 to product pages.")
            return

        # Build q -> item_ids mapping (q values are unique most of the time).
        q_to_item_ids: Dict[str, list[int]] = {}
        for it in items:
            q = _extract_q(it.shop_url_3 or "")
            if not q:
                continue
            q_to_item_ids.setdefault(q, []).append(it.id)

        total_q = len(q_to_item_ids)
        print(f"Items to update: {len(items)} (unique q values: {total_q})")

        updated_rows = 0
        unresolved_item_rows = 0
        q_resolved = 0
        q_unresolved = 0

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            for idx, (q, item_ids) in enumerate(q_to_item_ids.items(), start=1):
                search_url = f"https://www.reykjafell.is/vorur?q={q}"
                print(f"[{idx}/{total_q}] scraping first product for q={q} ...")

                product_url: Optional[str] = None
                last_error: Optional[Exception] = None

                for attempt in range(3):
                    try:
                        page.goto(search_url, wait_until="domcontentloaded", timeout=45000)

                        start = time.time()
                        while time.time() - start < 20:
                            hrefs = page.eval_on_selector_all(
                                "a[href^='/vorur/']",
                                "els => els.map(e => e.getAttribute('href')).filter(Boolean)",
                            )
                            href = _pick_real_product_href(hrefs)
                            if href:
                                product_url = f"https://www.reykjafell.is{href}"
                                break
                            time.sleep(0.25)

                        if product_url:
                            break
                    except Exception as e:
                        last_error = e
                        time.sleep(1.0 + attempt * 1.5)

                if product_url:
                    n = _apply_product_url_for_q(db, item_ids, product_url)
                    updated_rows += n
                    q_resolved += 1
                    if n:
                        print(f"  -> committed {n} row(s) for q={q}")
                    else:
                        print(f"  -> q={q} already up to date in DB")
                else:
                    print(f"  WARNING: no product URL resolved for q={q}. Last error: {last_error}")
                    unresolved_item_rows += len(item_ids)
                    q_unresolved += 1

                if idx % MILESTONE_EVERY == 0:
                    pct = round(100 * idx / total_q, 1) if total_q else 0
                    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                    banner = (
                        f"\n{'=' * 64}\n"
                        f"  MILESTONE: {idx}/{total_q} unique q processed ({pct}%)\n"
                        f"  time: {ts}\n"
                        f"  this run: q with product URL={q_resolved}, q without={q_unresolved}\n"
                        f"  this run: inventory rows committed (updates)={updated_rows}\n"
                        f"  this run: inventory rows still on search after failed q={unresolved_item_rows}\n"
                        f"{'=' * 64}\n"
                    )
                    print(banner, flush=True)
                    try:
                        _PROGRESS_FILE.write_text(
                            f"{ts}\n"
                            f"unique_q_processed={idx}/{total_q} ({pct}%)\n"
                            f"q_resolved={q_resolved} q_unresolved={q_unresolved}\n"
                            f"rows_updated={updated_rows} rows_unresolved_items={unresolved_item_rows}\n",
                            encoding="utf-8",
                        )
                    except OSError:
                        pass

                time.sleep(0.15)

            browser.close()

        print(
            f"Backfill finished. rows_updated={updated_rows} "
            f"items_still_on_search_after_failures={unresolved_item_rows}"
        )

    finally:
        db.close()


if __name__ == "__main__":
    main()
