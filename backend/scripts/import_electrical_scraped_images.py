"""
Map scraped product images from a folder tree into inventory_items.local_image_path.

Expected layout (4 path segments under root):
  <Category>/<Subcategory>/<Sub-subcategory>/<filename>.<ext>

Matches DB rows using:
  - inventory_items.category  ~ folder category (normalized)
  - inventory_items.subcategory ~ "Sub / Sub-sub" with Unknown_Product segments ignored
  - filename stem vs inventory_items.name (difflib ratio)

Copies files to: backend/app/static/inventory_images/electrical/<id>.<ext>

Usage (from repo root or backend/):
  python scripts/import_electrical_scraped_images.py "C:/Users/mario/Desktop/Electrical_Images" --dry-run
  python scripts/import_electrical_scraped_images.py "C:/Users/mario/Desktop/Electrical_Images" --apply
  python scripts/import_electrical_scraped_images.py "C:/Users/mario/Desktop/Electrical_Images" --apply --min-ratio 0.88
"""
from __future__ import annotations

import argparse
import re
import shutil
import sys
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import load_only

from app.database import SessionLocal
from app import models

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def norm(s: str | None) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFC", str(s)).strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def merge_folder_sub(sub: str, subsub: str) -> str:
    s = (sub or "").strip()
    s2 = (subsub or "").strip()
    if s.lower() == "unknown_product":
        s = ""
    if s2.lower() == "unknown_product":
        s2 = ""
    if s and s2:
        return f"{s} / {s2}"
    return s or s2


def collect_images(root: Path) -> list[dict]:
    out: list[dict] = []
    for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in IMAGE_EXTS:
            continue
        rel = p.relative_to(root)
        parts = rel.parts
        if len(parts) != 4:
            continue
        cat, sub, subsub = parts[0], parts[1], parts[2]
        merged = merge_folder_sub(sub, subsub)
        out.append(
            {
                "path": p,
                "cat": cat,
                "merged": merged,
                "stem": p.stem,
                "stem_n": norm(p.stem),
                "ext": p.suffix.lower(),
            }
        )
    return out


def build_indexes(images: list[dict]):
    """(cat_norm, merged_norm) -> list of image records; cat_norm -> list where merged is empty."""
    by_pair: dict[tuple[str, str], list[dict]] = defaultdict(list)
    by_cat_only: dict[str, list[dict]] = defaultdict(list)
    for im in images:
        nc = norm(im["cat"])
        nm = norm(im["merged"])
        if nm:
            by_pair[(nc, nm)].append(im)
        else:
            by_cat_only[nc].append(im)
    merges_by_cat: dict[str, list[tuple[str, list[dict]]]] = defaultdict(list)
    for (nc, nm), lst in by_pair.items():
        merges_by_cat[nc].append((nm, lst))
    return by_pair, by_cat_only, merges_by_cat


def build_fuzzy_merge_lists(
    merges_by_cat: dict[str, list[tuple[str, list[dict]]]],
    *,
    merged_fuzzy: float,
    nc_nm_pairs: set[tuple[str, str]],
) -> dict[tuple[str, str], list[tuple[str, list[dict]]]]:
    """For each inventory (category, subcategory) pair, precompute folder merges with similar path (once)."""
    out: dict[tuple[str, str], list[tuple[str, list[dict]]]] = {}
    for nc, nm in nc_nm_pairs:
        if not nm:
            out[(nc, nm)] = []
            continue
        hits: list[tuple[str, list[dict]]] = []
        for m2, lst in merges_by_cat.get(nc, []):
            if m2 == nm:
                continue
            if m2 and nm and SequenceMatcher(None, m2, nm).ratio() >= merged_fuzzy:
                hits.append((m2, lst))
        out[(nc, nm)] = hits
    return out


def best_image_for_item(
    item: models.InventoryItem,
    by_pair: dict[tuple[str, str], list[dict]],
    by_cat_only: dict[str, list[dict]],
    fuzzy_lists: dict[tuple[str, str], list[tuple[str, list[dict]]]],
    *,
    min_ratio: float,
    min_ratio_loose: float,
) -> tuple[dict | None, float]:
    nc = norm(item.category or "")
    nm = norm(item.subcategory or "")
    name_n = norm(item.name or "")

    def score_list(cands: list[dict], cap: int | None = None) -> tuple[dict | None, float]:
        seq = cands if cap is None or len(cands) <= cap else cands[:cap]
        best: dict | None = None
        best_r = 0.0
        for im in seq:
            r = SequenceMatcher(None, im["stem_n"], name_n).ratio()
            if r > best_r:
                best_r = r
                best = im
        return best, best_r

    # 1) Exact category + merged subcategory bucket
    cands = by_pair.get((nc, nm), [])
    if cands:
        b, r = score_list(cands)
        if r >= min_ratio:
            return b, r

    # 2) Category-only bucket (Unknown_Product folders) — can be huge; narrow candidates first
    cands2 = by_cat_only.get(nc, [])
    if cands2:
        narrowed = [
            im
            for im in cands2
            if im["stem_n"] == name_n
            or im["stem_n"] in name_n
            or name_n in im["stem_n"]
            or (name_n[:10] and im["stem_n"][:10] == name_n[:10])
        ]
        # Short `name_n` can match thousands of stems via `in`; keep scoring bounded.
        if len(narrowed) > 450:
            narrowed = narrowed[:450]
        pool = narrowed if narrowed else cands2[:400]
        b, r = score_list(pool, cap=260)
        if r >= min_ratio_loose:
            return b, r

    # 3) Same category: merged label drift (precomputed fuzzy merge lists per (nc, nm))
    if nm:
        best: dict | None = None
        best_r = 0.0
        for _m2, lst in fuzzy_lists.get((nc, nm), []):
            if len(lst) > 220:
                pref = name_n[:8]
                lst_work = [im for im in lst if pref and im["stem_n"].startswith(pref)]
                if len(lst_work) < 40:
                    lst_work = [
                        im
                        for im in lst
                        if (im["stem_n"] and im["stem_n"][:6] in name_n)
                        or (name_n and name_n[:12] in im["stem_n"])
                    ]
                lst_iter = lst_work if lst_work else lst[:220]
            else:
                lst_iter = lst
            for im in lst_iter:
                r = SequenceMatcher(None, im["stem_n"], name_n).ratio()
                if r > best_r:
                    best_r = r
                    best = im
                    if best_r >= 1.0:
                        break
            if best_r >= 1.0:
                break
        if best is not None and best_r >= min_ratio:
            return best, best_r

    return None, 0.0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("images_root", type=str, help="Path to Electrical_Images (or similar) folder")
    parser.add_argument("--apply", action="store_true", help="Copy files and update DB")
    parser.add_argument("--dry-run", action="store_true", help="Print stats only (default if neither apply nor dry-run)")
    parser.add_argument("--min-ratio", type=float, default=0.88, help="Min similarity for exact merged match")
    parser.add_argument(
        "--min-ratio-loose",
        type=float,
        default=0.92,
        help="Min similarity for category-only (Unknown_Product) folders",
    )
    parser.add_argument(
        "--dest-dir",
        type=Path,
        default=None,
        help="Destination under backend/app/static (default: inventory_images/electrical)",
    )
    parser.add_argument(
        "--merged-fuzzy",
        type=float,
        default=0.93,
        help="Min similarity between folder merged path and DB subcategory (same category)",
    )
    args = parser.parse_args()

    root = Path(args.images_root).expanduser()
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        return 1

    backend_dir = Path(__file__).resolve().parents[1]
    dest_parent = args.dest_dir or (backend_dir / "app" / "static" / "inventory_images" / "electrical")
    dest_parent = dest_parent.resolve()
    dest_parent.mkdir(parents=True, exist_ok=True)

    images = collect_images(root)
    if not images:
        print(f"No images found under {root} with expected depth-3 folder layout.", file=sys.stderr)
        return 1

    by_pair, by_cat_only, merges_by_cat = build_indexes(images)
    print(
        f"Indexed images: {len(images)}  buckets(pair)={len(by_pair)}  buckets(cat-only)={len(by_cat_only)}",
        flush=True,
    )

    db = SessionLocal()
    try:
        items = (
            db.query(models.InventoryItem)
            .options(
                load_only(
                    models.InventoryItem.id,
                    models.InventoryItem.name,
                    models.InventoryItem.category,
                    models.InventoryItem.subcategory,
                    models.InventoryItem.local_image_path,
                )
            )
            .order_by(models.InventoryItem.id.asc())
            .all()
        )
        print(f"Loaded {len(items)} inventory rows; building fuzzy-merge index…", flush=True)
        nc_nm_pairs = {(norm(it.category or ""), norm(it.subcategory or "")) for it in items}
        fuzzy_lists = build_fuzzy_merge_lists(
            merges_by_cat, merged_fuzzy=args.merged_fuzzy, nc_nm_pairs=nc_nm_pairs
        )
        print("Matching…", flush=True)

        matched = 0
        skipped = 0
        rows: list[tuple[models.InventoryItem, dict, float]] = []
        match_cache: dict[tuple[str, str, str], tuple[dict | None, float]] = {}

        for i, it in enumerate(items):
            nc = norm(it.category or "")
            nm = norm(it.subcategory or "")
            nn = norm(it.name or "")
            ck = (nc, nm, nn)
            if ck in match_cache:
                im, r = match_cache[ck]
            else:
                im, r = best_image_for_item(
                    it,
                    by_pair,
                    by_cat_only,
                    fuzzy_lists,
                    min_ratio=args.min_ratio,
                    min_ratio_loose=args.min_ratio_loose,
                )
                match_cache[ck] = (im, r)
            if im and r > 0:
                matched += 1
                rows.append((it, im, r))
            else:
                skipped += 1
            if (i + 1) % 5000 == 0:
                print(f"  …{i + 1}/{len(items)}", flush=True)

        print(f"Inventory items: {len(items)}", flush=True)
        print(f"Matched: {matched}  Unmatched: {skipped}", flush=True)
        if rows:
            ratios = sorted([r for _, _, r in rows])
            print(
                f"Similarity: min={ratios[0]:.3f} p50={ratios[len(ratios)//2]:.3f} max={ratios[-1]:.3f}",
                flush=True,
            )

        if args.apply:
            updated = 0
            for it, im, r in rows:
                ext = im["ext"] if im["ext"] in IMAGE_EXTS else ".jpg"
                dest = dest_parent / f"{it.id}{ext}"
                shutil.copy2(im["path"], dest)
                web_path = f"/static/inventory_images/electrical/{dest.name}"
                it.local_image_path = web_path
                db.add(it)
                updated += 1
                if updated % 500 == 0:
                    db.commit()
                    print(f"Committed… {updated}", flush=True)
            db.commit()
            print(f"Apply complete. updated_rows={updated} dest={dest_parent}", flush=True)
        else:
            print(
                "Dry run (no DB/file changes). Pass --apply to write images + update local_image_path.",
                flush=True,
            )
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
