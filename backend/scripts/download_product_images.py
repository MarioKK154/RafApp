"""
Product Image Downloader for RafApp Inventory
=============================================
Strategy per item:
  1. Try to scrape the product image from supplier pages:
     shop_url_1 = Ronning, shop_url_2 = Iskraft, shop_url_3 = Reykjafell
  2. Fall back to DuckDuckGo Images search on product name.

Images are saved to:  C:\\Users\\mario\\Desktop\\ProductImages\\
Filename format:      {item_id}_{safe_name}.jpg

After downloading, local_image_path in inventory_items is updated.

Run time estimate: ~2-5 min for 648 items (0.5s delay between requests).
"""

import os
import re
import sys
import time
import math
import hashlib
import requests
from pathlib import Path
from urllib.parse import urljoin, urlparse, quote_plus

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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,is;q=0.8",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
DELAY = 0.5  # seconds between requests — be polite to servers


def safe_name(s, max_len=60):
    """Convert product name to a filesystem-safe string."""
    s = re.sub(r"[^\w\s\-\.]", "", s or "item")
    s = re.sub(r"\s+", "_", s.strip())
    return s[:max_len] or "item"


def is_valid_image_url(url):
    if not url:
        return False
    path = urlparse(url).path.lower()
    return any(path.endswith(ext) for ext in SUPPORTED_EXT)


def download_image(img_url, dest_path: Path) -> bool:
    """Download img_url to dest_path. Returns True on success."""
    try:
        r = SESSION.get(img_url, timeout=10, stream=True)
        if r.status_code == 200 and "image" in r.headers.get("Content-Type", ""):
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
            if dest_path.stat().st_size > 2000:  # skip tiny/broken images
                return True
            dest_path.unlink(missing_ok=True)
    except Exception:
        pass
    return False


# ── Supplier scrapers ──────────────────────────────────────────────────────

def scrape_ronning(url) -> str | None:
    """Scrape main product image from ronning.is"""
    try:
        r = SESSION.get(url, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        # Ronning typically uses <img class="product-image"> or og:image
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]
        img = soup.select_one(".product-image img, .product__image img, img.main-image")
        if img and img.get("src"):
            return urljoin(url, img["src"])
        # Fallback: first large image in page
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if any(src.lower().endswith(e) for e in SUPPORTED_EXT) and "thumb" not in src.lower():
                return urljoin(url, src)
    except Exception:
        pass
    return None


def scrape_iskraft(url) -> str | None:
    """Scrape main product image from iskraft.husa.is"""
    try:
        r = SESSION.get(url, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]
        img = soup.select_one(".product-image img, .product-img img, picture img")
        if img:
            src = img.get("src") or img.get("data-src")
            if src:
                return urljoin(url, src)
    except Exception:
        pass
    return None


def scrape_reykjafell(url) -> str | None:
    """Scrape main product image from reykjafell.is"""
    try:
        r = SESSION.get(url, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]
        img = soup.select_one(".product-image img, .gallery__image img, img.lazy")
        if img:
            src = img.get("data-src") or img.get("src")
            if src:
                return urljoin(url, src)
    except Exception:
        pass
    return None


# ── DuckDuckGo Images fallback ─────────────────────────────────────────────

def duckduckgo_image(query) -> str | None:
    """Search DuckDuckGo Images and return first result URL."""
    try:
        # Step 1: get vqd token
        r = SESSION.get(
            "https://duckduckgo.com/",
            params={"q": query, "iax": "images", "ia": "images"},
            timeout=10
        )
        vqd_match = re.search(r'vqd=["\']([\d-]+)["\']', r.text)
        if not vqd_match:
            return None
        vqd = vqd_match.group(1)
        time.sleep(0.3)

        # Step 2: query images API
        r2 = SESSION.get(
            "https://duckduckgo.com/i.js",
            params={
                "l": "us-en",
                "o": "json",
                "q": query,
                "vqd": vqd,
                "f": ",,,,,",
                "p": "1",
            },
            timeout=10
        )
        data = r2.json()
        results = data.get("results", [])
        for res in results[:5]:
            img_url = res.get("image")
            if img_url and is_valid_image_url(img_url):
                return img_url
    except Exception:
        pass
    return None


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    items = db.query(models.InventoryItem).order_by(models.InventoryItem.id).all()
    print(f"Found {len(items)} inventory items to process.\n")
    print(f"Saving images to: {OUTPUT_DIR}\n")

    success = 0
    skipped = 0
    failed  = 0

    for i, item in enumerate(items, 1):
        sname = safe_name(item.name)
        # Try multiple extensions
        for ext in (".jpg", ".png", ".webp"):
            dest = OUTPUT_DIR / f"{item.id}_{sname}{ext}"
            if dest.exists() and dest.stat().st_size > 2000:
                print(f"[{i}/{len(items)}] SKIP  {item.name[:50]} (already downloaded)")
                skipped += 1
                # Ensure DB is updated
                if not item.local_image_path:
                    item.local_image_path = str(dest)
                break
        else:
            dest = OUTPUT_DIR / f"{item.id}_{sname}.jpg"
            img_url = None
            source  = None

            # 1. Try Ronning
            if item.shop_url_1 and not img_url:
                img_url = scrape_ronning(item.shop_url_1)
                source  = "Ronning"
                time.sleep(DELAY)

            # 2. Try Iskraft
            if item.shop_url_2 and not img_url:
                img_url = scrape_iskraft(item.shop_url_2)
                source  = "Iskraft"
                time.sleep(DELAY)

            # 3. Try Reykjafell
            if item.shop_url_3 and not img_url:
                img_url = scrape_reykjafell(item.shop_url_3)
                source  = "Reykjafell"
                time.sleep(DELAY)

            # 4. DuckDuckGo fallback
            if not img_url:
                query   = f"{item.name} electrical cable product"
                img_url = duckduckgo_image(query)
                source  = "DuckDuckGo"
                time.sleep(DELAY)

            if img_url:
                # Adjust extension if needed
                parsed_ext = Path(urlparse(img_url).path).suffix.lower()
                if parsed_ext in SUPPORTED_EXT:
                    dest = OUTPUT_DIR / f"{item.id}_{sname}{parsed_ext}"

                ok = download_image(img_url, dest)
                if ok:
                    item.local_image_path = str(dest)
                    print(f"[{i}/{len(items)}] ✓ {item.name[:50]} ({source})")
                    success += 1
                else:
                    print(f"[{i}/{len(items)}] ✗ {item.name[:50]} (download failed, src={source})")
                    failed += 1
            else:
                print(f"[{i}/{len(items)}] ✗ {item.name[:50]} (no image found)")
                failed += 1

        # Commit every 50 items
        if i % 50 == 0:
            db.commit()
            print(f"  --- Committed {i} items so far ---")

    db.commit()
    db.close()

    print(f"\n{'='*60}")
    print(f"DONE. Processed {len(items)} items.")
    print(f"  ✓ Downloaded: {success}")
    print(f"  ↷ Skipped (already existed): {skipped}")
    print(f"  ✗ Failed: {failed}")
    print(f"\nImages saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
