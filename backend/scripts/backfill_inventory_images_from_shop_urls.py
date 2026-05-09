from __future__ import annotations

import argparse
import csv
import json
import mimetypes
import re
import sys
import time
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal
from app import models


BACKEND_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BACKEND_DIR / "app" / "static"
IMAGE_DIR = STATIC_DIR / "inventory_images" / "products"
MANIFEST_PATH = BACKEND_DIR / "image_backfill_manifest.csv"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
IMG_MIME_PREFIX = "image/"
MAX_IMAGE_BYTES = 12 * 1024 * 1024  # 12MB safety cap


def _extract_meta_content(html: str, attr: str, value: str) -> list[str]:
    # Keep it regex-based to avoid adding parser dependencies.
    pattern = re.compile(
        rf'<meta[^>]+{attr}=["\']{re.escape(value)}["\'][^>]+content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    return [m.group(1).strip() for m in pattern.finditer(html) if m.group(1).strip()]


def _extract_json_ld_images(html: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.IGNORECASE | re.DOTALL,
    ):
        raw = m.group(1).strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue

        def harvest(node: object) -> None:
            if isinstance(node, dict):
                image = node.get("image")
                if isinstance(image, str) and image.strip():
                    out.append(image.strip())
                elif isinstance(image, list):
                    for v in image:
                        if isinstance(v, str) and v.strip():
                            out.append(v.strip())
                for v in node.values():
                    harvest(v)
            elif isinstance(node, list):
                for v in node:
                    harvest(v)

        harvest(data)
    return out


def _extract_img_srcs(html: str) -> list[str]:
    srcs = []
    for attr in ("src", "data-src", "data-original"):
        pattern = re.compile(rf'<img[^>]+{attr}=["\']([^"\']+)["\']', re.IGNORECASE)
        srcs.extend([m.group(1).strip() for m in pattern.finditer(html) if m.group(1).strip()])
    return srcs


def _looks_bad_image(url: str) -> bool:
    u = url.lower()
    bad_tokens = ("logo", "icon", "sprite", "placeholder", "favicon")
    return any(tok in u for tok in bad_tokens)


def _candidate_images(page_url: str, html: str) -> list[str]:
    candidates: list[str] = []
    candidates.extend(_extract_meta_content(html, "property", "og:image"))
    candidates.extend(_extract_meta_content(html, "name", "twitter:image"))
    candidates.extend(_extract_json_ld_images(html))
    candidates.extend(_extract_img_srcs(html))

    seen = set()
    out = []
    for raw in candidates:
        abs_url = urljoin(page_url, raw)
        if abs_url in seen:
            continue
        seen.add(abs_url)
        if _looks_bad_image(abs_url):
            continue
        out.append(abs_url)
    return out


def _supplier_from_url(url: str) -> str:
    u = (url or "").lower()
    if "reykjafell" in u:
        return "reykjafell"
    if "ronning" in u or "johanronning" in u:
        return "ronning"
    if "iskraft" in u or "husa.is" in u:
        return "iskraft"
    return "unknown"


def _pick_priority_urls(
    item: models.InventoryItem,
    *,
    include_ronning: bool = True,
    include_iskraft: bool = True,
    include_reykjafell: bool = True,
) -> Iterable[tuple[str, str]]:
    # Requested order: Reykjafell -> Ronning -> Iskraft
    if include_reykjafell and item.shop_url_3:
        yield "reykjafell", item.shop_url_3
    if include_ronning and item.shop_url_1:
        yield "ronning", item.shop_url_1
    if include_iskraft and item.shop_url_2:
        yield "iskraft", item.shop_url_2


def _extension_from_response(resp: requests.Response, fallback_url: str) -> str:
    ctype = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    if ctype.startswith(IMG_MIME_PREFIX):
        ext = mimetypes.guess_extension(ctype) or ""
        if ext:
            return ext
    p = urlparse(fallback_url).path
    ext = Path(p).suffix.lower()
    return ext if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp") else ".jpg"


def _download_image(session: requests.Session, image_url: str) -> tuple[bytes | None, str | None]:
    try:
        resp = session.get(image_url, timeout=45, headers={"User-Agent": UA}, stream=True, allow_redirects=True)
        resp.raise_for_status()
        ctype = (resp.headers.get("Content-Type") or "").lower()
        if IMG_MIME_PREFIX not in ctype:
            return None, None
        chunks = []
        total = 0
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > MAX_IMAGE_BYTES:
                return None, None
            chunks.append(chunk)
        data = b"".join(chunks)
        if not data:
            return None, None
        return data, _extension_from_response(resp, image_url)
    except Exception:
        return None, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill inventory product images from supplier URLs.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing local_image_path values.")
    parser.add_argument("--delay", type=float, default=0.15, help="Delay between product fetches.")
    parser.add_argument("--limit", type=int, default=0, help="Process at most N items (0 = all).")
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH, help="CSV manifest output path.")
    parser.add_argument("--skip-ronning", action="store_true", help="Skip Ronning URLs (shop_url_1).")
    parser.add_argument("--skip-iskraft", action="store_true", help="Skip Iskraft URLs (shop_url_2).")
    parser.add_argument("--skip-reykjafell", action="store_true", help="Skip Reykjafell URLs (shop_url_3).")
    args = parser.parse_args()

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    http = requests.Session()
    http.headers.update({"User-Agent": UA, "Accept-Language": "is-IS,is;q=0.9,en;q=0.8"})

    rows = []
    updated = skipped_existing = not_found = errors = 0
    page_cache: dict[str, str | None] = {}
    image_cache: dict[str, tuple[bytes, str] | None] = {}
    try:
        items = db.query(models.InventoryItem).order_by(models.InventoryItem.id.asc()).all()
        if args.limit and args.limit > 0:
            items = items[: args.limit]

        for idx, item in enumerate(items, start=1):
            if item.local_image_path and not args.overwrite:
                skipped_existing += 1
                rows.append(
                    {
                        "id": item.id,
                        "name": item.name,
                        "status": "skipped_existing",
                        "source": "",
                        "shop_url": "",
                        "image_url": "",
                        "local_image_path": item.local_image_path or "",
                    }
                )
                continue

            resolved = False
            for source, shop_url in _pick_priority_urls(
                item,
                include_ronning=not args.skip_ronning,
                include_iskraft=not args.skip_iskraft,
                include_reykjafell=not args.skip_reykjafell,
            ):
                try:
                    cached_image_url = page_cache.get(shop_url)
                    if cached_image_url is None and shop_url not in page_cache:
                        resp = http.get(shop_url, timeout=45, headers={"User-Agent": UA})
                        if resp.status_code != 200:
                            page_cache[shop_url] = None
                            continue
                        html = resp.text or ""
                        candidates = _candidate_images(shop_url, html)
                        page_cache[shop_url] = candidates[0] if candidates else None
                        cached_image_url = page_cache[shop_url]
                    if not cached_image_url:
                        continue

                    cached_binary = image_cache.get(cached_image_url)
                    if cached_binary is None and cached_image_url not in image_cache:
                        data, ext = _download_image(http, cached_image_url)
                        image_cache[cached_image_url] = (data, ext) if (data and ext) else None
                        cached_binary = image_cache[cached_image_url]
                    if not cached_binary:
                        continue

                    data, ext = cached_binary
                    fname = f"{source}_{item.id}{ext}"
                    path = IMAGE_DIR / fname
                    path.write_bytes(data)
                    web_path = f"/static/inventory_images/products/{fname}"
                    item.local_image_path = web_path
                    db.add(item)
                    updated += 1
                    rows.append(
                        {
                            "id": item.id,
                            "name": item.name,
                            "status": "updated",
                            "source": source,
                            "shop_url": shop_url,
                            "image_url": cached_image_url,
                            "local_image_path": web_path,
                        }
                    )
                    resolved = True
                    break
                except Exception:
                    continue

            if not resolved:
                not_found += 1
                rows.append(
                    {
                        "id": item.id,
                        "name": item.name,
                        "status": "not_found",
                        "source": "",
                        "shop_url": "",
                        "image_url": "",
                        "local_image_path": item.local_image_path or "",
                    }
                )

            if idx % 50 == 0:
                db.commit()
                print(
                    f"[{idx}/{len(items)}] updated={updated} skipped_existing={skipped_existing} "
                    f"not_found={not_found} errors={errors}",
                    flush=True,
                )
            if args.delay > 0:
                time.sleep(args.delay)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        http.close()

    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    with args.manifest.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["id", "name", "status", "source", "shop_url", "image_url", "local_image_path"],
        )
        w.writeheader()
        for row in rows:
            w.writerow(row)

    print(
        f"Image backfill complete. updated={updated} skipped_existing={skipped_existing} "
        f"not_found={not_found} errors={errors} manifest={args.manifest}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
