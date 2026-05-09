"""
Resolve Ískraft product URL + description for each local image whose filename stem is the webshop SKU,
optionally update inventory_items (shop_url_2, description, local_image_path, iskraft_sku).

API (no login):
  GET https://iskraft.husa.is/webapi/search/query/{query}?from=0&count=N&storeAlias=Iskraft

Default images (served as /static/...):
  backend/app/static/inventory_images/iskraft_images/

Examples (run from backend/:  cd backend && python scripts/backfill_iskraft_from_local_images.py)
  python scripts/backfill_iskraft_from_local_images.py
  python scripts/backfill_iskraft_from_local_images.py --resume --out-csv iskraft_manifest.csv
  python scripts/backfill_iskraft_from_local_images.py --apply-db --from-manifest iskraft_manifest.csv
  python scripts/backfill_iskraft_from_local_images.py --apply-db   # after a manifest run in same command
"""
from __future__ import annotations

import argparse
import csv
import os
import random
import re
import sys
import time
import urllib.parse
from pathlib import Path

import requests

ISKRAFT_SEARCH_BASE = "https://iskraft.husa.is/webapi/search/query"
ISKRAFT_PUBLIC_ORIGIN = "https://www.iskraft.is"
STORE_ALIAS = "Iskraft"
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
APP_STATIC = BACKEND_DIR / "app" / "static" / "inventory_images" / "iskraft_images"
LEGACY_STATIC = BACKEND_DIR / "static" / "inventory_images" / "iskraft_images"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}

CSV_FIELDS = [
    "file_name",
    "stem",
    "query_used",
    "status",
    "sku",
    "title",
    "description",
    "product_url",
    "local_image_web_path",
    "note",
]


def default_images_dir() -> Path:
    if APP_STATIC.is_dir():
        return APP_STATIC
    if LEGACY_STATIC.is_dir():
        return LEGACY_STATIC
    return APP_STATIC


def stem_to_sku_candidates(stem: str) -> list[str]:
    stem = stem.strip()
    if not stem:
        return []
    out = [stem]
    if "_" in stem:
        base = stem.split("_", 1)[0].strip()
        if base and base not in out:
            out.append(base)
    return out


def search_iskraft(
    session: requests.Session,
    query: str,
    *,
    count: int = 20,
    from_: int = 0,
    max_retries: int = 5,
) -> dict | None:
    if len(query) < 3:
        return None
    path_seg = urllib.parse.quote(query, safe="")
    url = (
        f"{ISKRAFT_SEARCH_BASE}/{path_seg}"
        f"?from={from_}&count={count}&storeAlias={STORE_ALIAS}"
    )
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "is-IS",
        "Accept": "application/json",
    }
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            r = session.get(url, headers=headers, timeout=45)
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(min(2 ** attempt, 30) + random.random())
                continue
            if r.status_code != 200:
                return None
            return r.json()
        except (requests.RequestException, ValueError) as e:
            last_exc = e
            time.sleep(min(2 ** attempt, 20) + random.random())
    if last_exc:
        return None
    return None


def pick_product(payload: dict | None, wanted: str) -> dict | None:
    if not payload or not payload.get("IsSuccess"):
        return None
    products = payload.get("Products") or []
    wanted_norm = wanted.strip()
    for p in products:
        if (p.get("SKU") or "").strip() == wanted_norm:
            return p
    for p in products:
        for im in p.get("Images") or []:
            if (im.get("Name") or "").strip() == wanted_norm:
                return p
    if len(products) == 1:
        return products[0]
    return None


def product_page_url(product: dict) -> str:
    rel = (product.get("Url") or "").strip()
    if not rel.startswith("/"):
        rel = "/" + rel
    return urllib.parse.urljoin(ISKRAFT_PUBLIC_ORIGIN + "/", rel.lstrip("/"))


def relative_served_path(images_dir: Path, file_path: Path) -> str:
    try:
        rel = file_path.resolve().relative_to(images_dir.resolve().parent.parent)
        return str(rel).replace("\\", "/")
    except ValueError:
        return f"inventory_images/iskraft_images/{file_path.name}"


def collect_image_files(images_dir: Path) -> list[Path]:
    if not images_dir.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(images_dir.iterdir()):
        if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES:
            out.append(p)
    return out


def read_manifest_by_stem(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    out: dict[str, dict[str, str]] = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames:
            for row in reader:
                stem = (row.get("stem") or "").strip()
                if stem:
                    out[stem] = {k: (row.get(k) or "") for k in CSV_FIELDS}
    return out


def write_manifest(path: Path, files: list[Path], rows_by_stem: dict[str, dict[str, str]], images_dir: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        for fp in files:
            stem = fp.stem
            row = rows_by_stem.get(stem)
            if row:
                w.writerow(row)
            else:
                w.writerow(
                    {
                        "file_name": fp.name,
                        "stem": stem,
                        "query_used": "",
                        "status": "error",
                        "sku": "",
                        "title": "",
                        "description": "",
                        "product_url": "",
                        "local_image_web_path": "/static/" + relative_served_path(images_dir, fp),
                        "note": "missing row",
                    }
                )


def process_one_stem(
    session: requests.Session,
    fp: Path,
    images_dir: Path,
) -> dict[str, str]:
    stem = fp.stem
    local_web = "/static/" + relative_served_path(images_dir, fp)
    row_base: dict[str, str] = {
        "file_name": fp.name,
        "stem": stem,
        "query_used": "",
        "status": "",
        "sku": "",
        "title": "",
        "description": "",
        "product_url": "",
        "local_image_web_path": local_web,
        "note": "",
    }
    candidates = stem_to_sku_candidates(stem)
    if not candidates:
        row_base["status"] = "skipped"
        row_base["note"] = "empty stem"
        return row_base

    chosen = None
    used_query = ""
    for cand in candidates:
        if len(cand) < 3:
            row_base["note"] = "SKU shorter than 3 chars (API rejects)"
            continue
        if not re.match(r"^[A-Za-z0-9_-]+$", cand):
            row_base["note"] = "stem has unsafe characters for search path"
            continue
        used_query = cand
        data = search_iskraft(session, cand)
        if data is None:
            row_base["note"] = "http error, non-json, or retries exhausted"
            continue
        if not data.get("IsSuccess"):
            err = (data.get("ErrorMessage") or "").strip()
            row_base["note"] = err or "IsSuccess false"
            continue
        prod = pick_product(data, cand)
        if prod:
            chosen = prod
            break
        row_base["note"] = "no matching product in results"

    if chosen:
        row_base["query_used"] = used_query
        row_base["status"] = "ok"
        row_base["sku"] = (chosen.get("SKU") or "").strip()
        row_base["title"] = (chosen.get("Title") or "").strip()
        row_base["description"] = (chosen.get("Description") or "").strip()
        row_base["product_url"] = product_page_url(chosen)
    else:
        row_base["query_used"] = used_query
        row_base["status"] = "not_found" if not row_base["note"] else "error"
    return row_base


def _name_matches_sku(name: str, sku: str) -> bool:
    name = (name or "").strip()
    sku = (sku or "").strip()
    if not name or not sku:
        return False
    if name == sku:
        return True
    for sep in (" ", "\t", "-", "/", ":", "|"):
        if name.startswith(sku + sep):
            return True
    return False


def find_inventory_targets(db, sku: str):
    """Return ORM rows to update for this Ískraft SKU (0, 1, or many)."""
    from app import models

    sku = sku.strip()
    if not sku:
        return []

    direct = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.iskraft_sku == sku)
        .all()
    )
    if direct:
        return direct

    q = db.query(models.InventoryItem).filter(models.InventoryItem.iskraft_sku.is_(None))
    candidates = q.all()
    matched = [it for it in candidates if _name_matches_sku(it.name, sku)]
    return matched


def apply_manifest_to_db(
    manifest_path: Path,
    *,
    force_shop_url: bool,
    force_description: bool,
    force_local_image: bool,
    dry_run: bool,
    conflicts_out: Path,
) -> tuple[int, int, int]:
    """Returns (updated, skipped_no_match, skipped_conflict)."""
    sys.path.insert(0, str(BACKEND_DIR))
    os.chdir(BACKEND_DIR)
    from app.database import SessionLocal
    from app import models

    updated = 0
    skipped_nm = 0
    skipped_cf = 0
    conflict_lines: list[str] = []

    rows = []
    with manifest_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if (row.get("status") or "").strip() == "ok" and (row.get("sku") or "").strip():
                rows.append(row)

    session = SessionLocal()
    try:
        for row in rows:
            sku = row["sku"].strip()
            url = (row.get("product_url") or "").strip()
            desc = (row.get("description") or "").strip()
            img = (row.get("local_image_web_path") or "").strip()

            targets = find_inventory_targets(session, sku)
            if not targets:
                skipped_nm += 1
                continue
            if len(targets) > 1:
                ids = ",".join(str(t.id) for t in targets)
                skipped_cf += 1
                conflict_lines.append(f"sku={sku} ids=[{ids}] name_samples={targets[0].name!r} …")
                continue

            item = targets[0]
            if item.iskraft_sku and item.iskraft_sku.strip() != sku:
                skipped_cf += 1
                conflict_lines.append(
                    f"sku={sku} id={item.id} existing_iskraft_sku={item.iskraft_sku!r}"
                )
                continue

            if dry_run:
                updated += 1
                continue

            item.iskraft_sku = sku
            if url and (force_shop_url or not (item.shop_url_2 or "").strip()):
                item.shop_url_2 = url
            if desc and (force_description or not (item.description or "").strip()):
                item.description = desc
            if img and (force_local_image or not (item.local_image_path or "").strip()):
                item.local_image_path = img

            updated += 1

        if not dry_run:
            session.commit()
    finally:
        session.close()

    if conflict_lines:
        conflicts_out.parent.mkdir(parents=True, exist_ok=True)
        conflicts_out.write_text("\n".join(conflict_lines) + "\n", encoding="utf-8")

    return updated, skipped_nm, skipped_cf


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build Ískraft manifest from local images and optionally update the inventory DB."
    )
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=None,
        help=f"Image folder (default: {APP_STATIC} or legacy {LEGACY_STATIC})",
    )
    parser.add_argument(
        "--out-csv",
        type=Path,
        default=BACKEND_DIR / "iskraft_images_manifest.csv",
        help="Manifest CSV path",
    )
    parser.add_argument("--delay", type=float, default=0.4, help="Seconds between API calls")
    parser.add_argument("--limit", type=int, default=0, help="Max image files (0 = all)")
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Reuse existing manifest rows with status=ok; re-fetch the rest",
    )
    parser.add_argument(
        "--from-manifest",
        type=Path,
        default=None,
        help="Skip scraping; only run --apply-db using this CSV",
    )
    parser.add_argument(
        "--apply-db",
        action="store_true",
        help="Update inventory_items from manifest rows (status=ok)",
    )
    parser.add_argument(
        "--apply-dry-run",
        action="store_true",
        help="With --apply-db, show counts only (no commit)",
    )
    parser.add_argument("--force-shop-url", action="store_true", help="Overwrite shop_url_2 when set")
    parser.add_argument("--force-description", action="store_true", help="Overwrite description when set")
    parser.add_argument("--force-local-image", action="store_true", help="Overwrite local_image_path when set")
    parser.add_argument(
        "--conflicts-out",
        type=Path,
        default=BACKEND_DIR / "iskraft_apply_conflicts.txt",
        help="Log ambiguous DB matches",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=100,
        help="Print progress every N images (0 = quiet)",
    )
    args = parser.parse_args()

    if args.from_manifest:
        if not args.from_manifest.exists():
            print(f"Manifest not found: {args.from_manifest}", file=sys.stderr)
            return 1
        if not args.apply_db:
            print("With --from-manifest, add --apply-db (and optional --apply-dry-run).", file=sys.stderr)
            return 1
        u, sn, sc = apply_manifest_to_db(
            args.from_manifest,
            force_shop_url=args.force_shop_url,
            force_description=args.force_description,
            force_local_image=args.force_local_image,
            dry_run=args.apply_dry_run,
            conflicts_out=args.conflicts_out,
        )
        print(
            f"Apply DB: updated={u} no_match={sn} conflict_or_mismatch={sc} "
            f"dry_run={args.apply_dry_run}"
        )
        if sc:
            print(f"See {args.conflicts_out}")
        return 0

    images_dir = args.images_dir or default_images_dir()
    files = collect_image_files(images_dir)
    if args.limit and args.limit > 0:
        files = files[: args.limit]

    if not files:
        print(f"No images under {images_dir}", file=sys.stderr)
        return 1

    rows_by_stem: dict[str, dict[str, str]] = {}
    if args.resume:
        rows_by_stem = read_manifest_by_stem(args.out_csv)

    session = requests.Session()
    ok = err = 0
    t0 = time.monotonic()

    for i, fp in enumerate(files):
        stem = fp.stem
        if args.resume:
            prev = rows_by_stem.get(stem)
            if prev and prev.get("status") == "ok":
                if prev.get("sku"):
                    ok += 1
                    continue

        row = process_one_stem(session, fp, images_dir)
        rows_by_stem[stem] = row
        if row.get("status") == "ok":
            ok += 1
        else:
            err += 1

        if args.progress_every and (i + 1) % args.progress_every == 0:
            elapsed = time.monotonic() - t0
            print(
                f"[{i+1}/{len(files)}] ok={ok} other={err} "
                f"elapsed={elapsed:.0f}s manifest={args.out_csv.name}"
            )

        if args.delay > 0 and i + 1 < len(files):
            time.sleep(args.delay)

    write_manifest(args.out_csv, files, rows_by_stem, images_dir)
    elapsed = time.monotonic() - t0
    print(f"Wrote manifest: {args.out_csv} rows={len(files)} ok={ok} other={err} elapsed={elapsed:.1f}s")

    if args.apply_db:
        u, sn, sc = apply_manifest_to_db(
            args.out_csv,
            force_shop_url=args.force_shop_url,
            force_description=args.force_description,
            force_local_image=args.force_local_image,
            dry_run=args.apply_dry_run,
            conflicts_out=args.conflicts_out,
        )
        print(
            f"Apply DB: updated={u} no_match={sn} conflict_or_mismatch={sc} "
            f"dry_run={args.apply_dry_run}"
        )
        if sc:
            print(f"See {args.conflicts_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
