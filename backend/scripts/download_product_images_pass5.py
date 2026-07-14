"""
Fifth-pass image downloader — Bing Images fallback.
Targets any remaining items in the database that still do not have a local image path.
Downloads the first matching image thumbnail from Bing Images (scaled up to 400x400)
and saves it to the desktop ProductImages folder, then updates the database.
"""
import os
import re
import sys
import time
import requests
from pathlib import Path
from urllib.parse import urlparse, quote_plus
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
    "Accept-Language": "en-US,en;q=0.9",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
DELAY = 1.0  # Be polite to Bing


def safe_name(s, max_len=60):
    s = re.sub(r"[^\w\s\-\.]", "", s or "item")
    s = re.sub(r"\s+", "_", s.strip())
    return s[:max_len] or "item"


def clean_query(name):
    # Clean up name for search engines
    q = name.strip()
    # Remove some Icelandic specific terms or formatting if they clutter search
    return q


def fetch_bing_image_url(query) -> str | None:
    """Queries Bing Images and returns the first thumbnail URL scaled up to 400x400."""
    search_url = f"https://www.bing.com/images/search?q={quote_plus(query)}"
    try:
        r = SESSION.get(search_url, timeout=10)
        if r.status_code != 200:
            return None
        
        soup = BeautifulSoup(r.text, "html.parser")
        # Find all img tags that look like Bing Image Search thumbnails
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if "bing.net/th" in src or "bing.com/th" in src:
                # Scaled up version using regex replacement for w and h parameters
                scaled_src = re.sub(r'([?&])w=\d+', r'\1w=400', src)
                scaled_src = re.sub(r'([?&])h=\d+', r'\1h=400', scaled_src)
                if 'w=400' not in scaled_src:
                    scaled_src += '&w=400' if '?' in scaled_src else '?w=400'
                if 'h=400' not in scaled_src:
                    scaled_src += '&h=400' if '?' in scaled_src else '?h=400'
                return scaled_src
    except Exception as e:
        print(f"Error fetching Bing image for '{query}': {e}")
    return None



def download_image(img_url, dest_path: Path) -> bool:
    try:
        r = SESSION.get(img_url, timeout=12, stream=True)
        ct = r.headers.get("Content-Type", "")
        if r.status_code == 200 and ("image" in ct or "octet" in ct):
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
            if dest_path.stat().st_size > 1000:  # Lowered threshold to 1KB for WebP/highly-efficient JPEGs
                return True
            dest_path.unlink(missing_ok=True)
    except Exception as e:
        print(f"Error downloading {img_url}: {e}")
    return False


def main():
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Query items missing images
    items = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.local_image_path.is_(None))
        .order_by(models.InventoryItem.id)
        .all()
    )
    print(f"Items still needing images: {len(items)}")
    print(f"Saving to: {OUTPUT_DIR}\n")

    success = 0
    failed = 0

    for i, item in enumerate(items, 1):
        sname = safe_name(item.name)
        
        # Build search query
        query = clean_query(item.name)
        if item.category:
            # e.g., 'EKKJ 4x6/6 Cu 1kV Cables'
            query += f" {item.category}"
            
        print(f"[{i}/{len(items)}] Searching for: '{query}'...")
        
        img_url = fetch_bing_image_url(query)
        time.sleep(DELAY)
        
        if img_url:
            dest = OUTPUT_DIR / f"{item.id}_{sname}.jpg"
            ok = download_image(img_url, dest)
            if ok:
                item.local_image_path = str(dest)
                print(f"  -> SUCCESS: Downloaded from Bing to {dest.name}")
                success += 1
            else:
                print(f"  -> FAILED: Download verification failed for {img_url}")
                failed += 1
        else:
            print(f"  -> FAILED: No image found on Bing")
            failed += 1
            
        if i % 10 == 0:
            db.commit()
            print(f"  --- Committed {i} items ---")

    db.commit()
    db.close()

    print(f"\n{'='*60}")
    print(f"Scrape pass complete. {len(items)} items processed.")
    print(f"  Downloaded: {success}")
    print(f"  Failed: {failed}")
    
    # Final verification print
    total = list(OUTPUT_DIR.glob("*"))
    print(f"\nTotal images in folder: {len(total)}")


if __name__ == "__main__":
    main()
