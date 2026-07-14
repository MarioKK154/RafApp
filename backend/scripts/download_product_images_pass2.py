"""
Second-pass image downloader — targets items that failed in the first pass.
Fixes:
  1. Iskraft hotlink protection: if supplier scrape fails to download,
     immediately fall through to DuckDuckGo instead of reporting failure.
  2. Better DuckDuckGo queries: use English name + category context.
  3. Cleans up 6 unnamed/empty items from the DB.
  4. Skips items that already have a local_image_path set.
"""
import os
import re
import sys
import time
import math
import requests
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import models

POSTGRES_URL = (
    "postgresql://postgres.tntvbultwjeyizswvqax"
    ":Tf22%26%26%25WbaJkdxb"
    "@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
)

OUTPUT_DIR = Path(r"C:\Users\mario\Desktop\ProductImages")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
DELAY = 0.6


def safe_name(s, max_len=60):
    s = re.sub(r"[^\w\s\-\.]", "", s or "item")
    s = re.sub(r"\s+", "_", s.strip())
    return s[:max_len] or "item"


def download_image(img_url, dest_path: Path) -> bool:
    """Download image — strips Referer to avoid hotlink blocks."""
    try:
        hdrs = {**HEADERS, "Referer": "https://www.google.com/"}
        r = requests.get(img_url, headers=hdrs, timeout=12, stream=True)
        ct = r.headers.get("Content-Type", "")
        if r.status_code == 200 and ("image" in ct or "octet" in ct):
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
            if dest_path.stat().st_size > 3000:
                return True
            dest_path.unlink(missing_ok=True)
    except Exception:
        pass
    return False


def scrape_og_image(url) -> str | None:
    """Generic og:image scraper — works for all three suppliers."""
    try:
        r = SESSION.get(url, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]
        # Try twitter:image too
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content"):
            return tw["content"]
        # Try first product image
        for sel in [
            ".product-image img", "img.product__image",
            ".gallery img", "picture source", "img.lazy",
        ]:
            tag = soup.select_one(sel)
            if tag:
                src = tag.get("data-src") or tag.get("srcset") or tag.get("src") or tag.get("content")
                if src:
                    # srcset may have multiple sizes — take first URL
                    src = src.split()[0]
                    return urljoin(url, src)
    except Exception:
        pass
    return None


def duckduckgo_image(query) -> str | None:
    """DuckDuckGo Images — returns first downloadable image URL."""
    try:
        r = SESSION.get(
            "https://duckduckgo.com/",
            params={"q": query, "iax": "images", "ia": "images"},
            timeout=10,
        )
        vqd_match = re.search(r'vqd=["\']([\d-]+)["\']', r.text)
        if not vqd_match:
            return None
        vqd = vqd_match.group(1)
        time.sleep(0.3)
        r2 = SESSION.get(
            "https://duckduckgo.com/i.js",
            params={"l": "us-en", "o": "json", "q": query,
                    "vqd": vqd, "f": ",,,,,", "p": "1"},
            timeout=10,
        )
        results = r2.json().get("results", [])
        for res in results[:8]:
            img_url = res.get("image", "")
            ext = Path(urlparse(img_url).path).suffix.lower()
            if img_url and ext in SUPPORTED_EXT:
                return img_url
    except Exception:
        pass
    return None


def build_query(item: models.InventoryItem) -> str:
    """Build a good English search query from item metadata."""
    name = item.name_en or item.name or ""
    cat  = item.category or item.master_category or ""
    # Translate common Icelandic category words
    cat = cat.replace("Strengir", "cable").replace("Ror", "conduit").replace("Rör", "conduit")
    # Clean up Icelandic characters for better search results
    for ic, en in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),
                   ("ý","y"),("þ","th"),("ð","d"),("æ","ae"),("ö","o")]:
        name = name.replace(ic, en).replace(ic.upper(), en.upper())
    return f"{name} {cat} electrical product".strip()


def main():
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Delete unnamed items (empty rows from Pipes sheet)
    unnamed = db.query(models.InventoryItem).filter(
        models.InventoryItem.name == "Unnamed"
    ).all()
    if unnamed:
        print(f"Removing {len(unnamed)} unnamed/empty items from DB...")
        for u in unnamed:
            db.delete(u)
        db.commit()
        print("Done.\n")

    # Only process items without an image yet
    items = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.local_image_path.is_(None))
        .order_by(models.InventoryItem.id)
        .all()
    )
    print(f"Items still needing images: {len(items)}")
    print(f"Saving to: {OUTPUT_DIR}\n")

    success = 0
    failed  = 0

    for i, item in enumerate(items, 1):
        sname    = safe_name(item.name)
        img_url  = None
        source   = None

        # Try each supplier URL — with hotlink-bypass download
        for url_attr, src_label in [
            ("shop_url_1", "Ronning"),
            ("shop_url_2", "Iskraft"),
            ("shop_url_3", "Reykjafell"),
        ]:
            supplier_url = getattr(item, url_attr)
            if not supplier_url:
                continue
            scraped = scrape_og_image(supplier_url)
            time.sleep(DELAY)
            if scraped:
                # Try to download with hotlink bypass
                ext  = Path(urlparse(scraped).path).suffix.lower() or ".jpg"
                if ext not in SUPPORTED_EXT:
                    ext = ".jpg"
                dest = OUTPUT_DIR / f"{item.id}_{sname}{ext}"
                ok   = download_image(scraped, dest)
                if ok:
                    img_url = scraped
                    source  = src_label
                    item.local_image_path = str(dest)
                    break
                # If download failed, keep trying other suppliers (don't stop here)

        # DuckDuckGo fallback if no supplier worked
        if not img_url:
            query   = build_query(item)
            ddg_url = duckduckgo_image(query)
            time.sleep(DELAY)
            if ddg_url:
                ext  = Path(urlparse(ddg_url).path).suffix.lower() or ".jpg"
                if ext not in SUPPORTED_EXT:
                    ext = ".jpg"
                dest = OUTPUT_DIR / f"{item.id}_{sname}{ext}"
                ok   = download_image(ddg_url, dest)
                if ok:
                    img_url = ddg_url
                    source  = "DuckDuckGo"
                    item.local_image_path = str(dest)

        if img_url:
            print(f"[{i}/{len(items)}] OK  {item.name[:55]} ({source})")
            success += 1
        else:
            print(f"[{i}/{len(items)}] --  {item.name[:55]} (no image found)")
            failed += 1

        if i % 50 == 0:
            db.commit()
            print(f"  --- committed {i} ---")

    db.commit()
    db.close()

    print(f"\n{'='*60}")
    print(f"Second pass complete. {len(items)} items processed.")
    print(f"  Downloaded: {success}")
    print(f"  Still missing: {failed}")
    total = list(OUTPUT_DIR.glob("*"))
    print(f"\nTotal images in folder: {len(total)}")


if __name__ == "__main__":
    main()
