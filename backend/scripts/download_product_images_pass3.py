"""
Third-pass image downloader — highly robust.
Targeting the remaining 390 items without images.
Improvements:
  1. Handles Iskraft, Reykjafell, and Ronning using specific advanced parsing rules.
  2. Bypasses hotlink protection by setting Referer header to the base supplier domain.
  3. Filters out default/placeholder images using a strict blacklist.
  4. Downloads a generic flexible conduit image for Plastbarki items that have no supplier URLs.
"""
import os
import re
import sys
import time
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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,is;q=0.8",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
BLACKLIST = {
    "default", "fbshare", "logo", "icon", "husa.png", "banner", 
    "avatar", "placeholder", "spinner", "sharing", "facebook"
}

DELAY = 0.5


def safe_name(s, max_len=60):
    s = re.sub(r"[^\w\s\-\.]", "", s or "item")
    s = re.sub(r"\s+", "_", s.strip())
    return s[:max_len] or "item"


def is_blacklisted(url):
    url_lower = url.lower()
    return any(word in url_lower for word in BLACKLIST)


def download_image(img_url, dest_path: Path, referer: str = None) -> bool:
    """Download image with a specific Referer header to bypass hotlink blocks."""
    try:
        hdrs = {**HEADERS}
        if referer:
            hdrs["Referer"] = referer
        r = requests.get(img_url, headers=hdrs, timeout=15, stream=True)
        ct = r.headers.get("Content-Type", "")
        if r.status_code == 200 and ("image" in ct or "octet" in ct):
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
            if dest_path.stat().st_size > 3000:
                return True
            dest_path.unlink(missing_ok=True)
    except Exception as e:
        print(f"Error downloading {img_url}: {e}")
    return False


def get_supplier_image(url) -> str | None:
    """Scrape product page using custom selectors for Iskraft, Reykjafell, and Ronning."""
    try:
        r = SESSION.get(url, timeout=12)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()

        # ── Iskraft ──
        if "iskraft" in domain or "husa.is" in domain:
            # 1. Custom class for main image
            img = soup.select_one("img.product-imgmain")
            if img and img.get("src"):
                src = img.get("src")
                if not is_blacklisted(src):
                    return urljoin(url, src)
            # 2. General /media/ images on page
            for img in soup.find_all("img"):
                src = img.get("src", "")
                if "/media/" in src and not is_blacklisted(src):
                    return urljoin(url, src)

        # ── Reykjafell ──
        elif "reykjafell" in domain:
            for sel in [".gallery__image img", ".product-image img", "img.lazy"]:
                img = soup.select_one(sel)
                if img and img.get("src"):
                    src = img.get("src")
                    if not is_blacklisted(src):
                        return urljoin(url, src)
            # Find any cdn.integrator.is image
            for img in soup.find_all("img"):
                src = img.get("src", "")
                if ("integrator.is" in src or "/media/" in src) and not is_blacklisted(src):
                    return urljoin(url, src)

        # ── Ronning ──
        elif "ronning" in domain:
            for sel in [".product-image img", ".product__image img", "img.main-image"]:
                img = soup.select_one(sel)
                if img and img.get("src"):
                    src = img.get("src")
                    if not is_blacklisted(src):
                        return urljoin(url, src)
            # Find any image with product SKU pattern or /vara/
            for img in soup.find_all("img"):
                src = img.get("src", "")
                if ("/product/" in src or "/media/" in src or "/vara/" in src) and not is_blacklisted(src):
                    return urljoin(url, src)

        # ── Generic fallback if no domain matched ──
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            content = og.get("content")
            if not is_blacklisted(content):
                return content

        for img in soup.find_all("img"):
            src = img.get("src", "")
            if src.startswith("http") and not is_blacklisted(src):
                return src

    except Exception as e:
        print(f"Error scraping {url}: {e}")
    return None


def main():
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Get items missing images
    items = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.local_image_path.is_(None))
        .order_by(models.InventoryItem.id)
        .all()
    )
    print(f"Items still needing images: {len(items)}")
    print(f"Saving to: {OUTPUT_DIR}\n")

    # Generic flexible conduit image for Plastbarki items
    barki_img_url = "https://upload.wikimedia.org/wikipedia/commons/d/d1/Flexible_conduit.jpg"
    barki_dest = OUTPUT_DIR / "generic_flexible_conduit.jpg"
    has_barki_img = barki_dest.exists() and barki_dest.stat().st_size > 3000
    if not has_barki_img:
        print("Downloading generic flexible conduit image...")
        has_barki_img = download_image(barki_img_url, barki_dest)

    success = 0
    failed  = 0

    for i, item in enumerate(items, 1):
        sname = safe_name(item.name)
        img_url = None
        source = None

        # Handle Plastbarki generic fallback
        if "plastbarki" in item.name.lower() and has_barki_img:
            dest = OUTPUT_DIR / f"{item.id}_{sname}.jpg"
            # Copy generic file to item's name
            import shutil
            shutil.copy(str(barki_dest), str(dest))
            item.local_image_path = str(dest)
            print(f"[{i}/{len(items)}] OK  {item.name[:55]} (Generic Plastbarki)")
            success += 1
            continue

        # Try supplier URLs in order
        for url_attr, src_label in [
            ("shop_url_1", "Ronning"),
            ("shop_url_2", "Iskraft"),
            ("shop_url_3", "Reykjafell"),
        ]:
            supplier_url = getattr(item, url_attr)
            if not supplier_url:
                continue
            
            scraped = get_supplier_image(supplier_url)
            time.sleep(DELAY)
            if scraped:
                # Use domain-specific referer to bypass hotlink protection
                parsed_url = urlparse(supplier_url)
                referer = f"{parsed_url.scheme}://{parsed_url.netloc}/"
                
                # Determine extension
                ext = Path(urlparse(scraped).path).suffix.lower() or ".jpg"
                if ext not in SUPPORTED_EXT:
                    ext = ".jpg"
                
                dest = OUTPUT_DIR / f"{item.id}_{sname}{ext}"
                ok = download_image(scraped, dest, referer=referer)
                if ok:
                    img_url = scraped
                    source = src_label
                    item.local_image_path = str(dest)
                    break

        if img_url:
            print(f"[{i}/{len(items)}] OK  {item.name[:55]} ({source})")
            success += 1
        else:
            print(f"[{i}/{len(items)}] --  {item.name[:55]} (no image found)")
            failed += 1

        if i % 30 == 0:
            db.commit()
            print(f"  --- committed {i} items ---")

    db.commit()
    db.close()

    print(f"\n{'='*60}")
    print(f"Scrape pass complete. {len(items)} items processed.")
    print(f"  Downloaded: {success}")
    print(f"  Still missing: {failed}")
    total = list(OUTPUT_DIR.glob("*"))
    print(f"\nTotal images in folder: {len(total)}")


if __name__ == "__main__":
    main()
