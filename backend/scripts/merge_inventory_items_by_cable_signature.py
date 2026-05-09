import re
import sys
from dataclasses import dataclass
from pathlib import Path
from difflib import SequenceMatcher
from collections import defaultdict

# Ensure `backend/` is on `sys.path` when this script is run directly.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import SessionLocal
from app import models


@dataclass(frozen=True)
class CableSignature:
    code: str  # e.g. RVK, ROF, etc (spaces/hyphens removed)
    cores: str  # e.g. 3
    area: str  # e.g. 1,5

    def key(self) -> str:
        return f"{self.code}|{self.cores}|{self.area}"


UNIT_MARKERS_RE = re.compile(r'\b(MM2|MM²|MM2|MM)\b', re.IGNORECASE)

# Example: "RV-K 3G1,5", "RVK 3g1,5mm2", "RV K 3g1,5mm"
# We intentionally require an `mm` marker right after the area to avoid matching non-cable
# formats like "3x5A" (current/voltage labeling).
G_PATTERN = re.compile(
    r'(?P<cores>\d+)\s*[Gg]\s*(?P<area>\d+(?:[.,]\d+)?)(?=\s*mm)',
    re.IGNORECASE,
)

# Other common formats:
# - "RVK 3x1,5mm2" (aka 3-core 1.5mm2)
# - "H07V-U 2x0,75mm2"
# - Sometimes separated by '*' or the multiplication sign.
X_PATTERN = re.compile(
    r'(?P<cores>\d+)\s*[xX]\s*(?P<area>\d+(?:[.,]\d+)?)(?=\s*mm)',
    re.IGNORECASE,
)
STAR_PATTERN = re.compile(
    r'(?P<cores>\d+)\s*[*×]\s*(?P<area>\d+(?:[.,]\d+)?)(?=\s*mm)',
    re.IGNORECASE,
)


def _normalize_decimal(area: str) -> str:
    # Keep it as comma because your source data uses Icelandic comma formatting.
    return area.replace('.', ',')


def _extract_cable_signature(text: str) -> CableSignature | None:
    if not text:
        return None

    s = text.strip()
    if not s:
        return None

    # Find the product code: take everything from start until the first digit.
    # For "RV-K 3G1,5..." that yields "RV-K ".
    digit_idx = None
    for i, ch in enumerate(s):
        if ch.isdigit():
            digit_idx = i
            break
    if digit_idx is None:
        return None

    raw_code = s[:digit_idx]
    code = re.sub(r'[^A-Za-z0-9]', '', raw_code).upper()
    if not code:
        return None

    # Prefer "G" notation (3G1,5) because it is common for some suppliers.
    m = G_PATTERN.search(s)
    if not m:
        m = X_PATTERN.search(s)
    if not m:
        m = STAR_PATTERN.search(s)
    if not m:
        return None

    cores = m.group('cores')
    area = _normalize_decimal(m.group('area'))
    if not cores or not area:
        return None

    # Heuristic guardrails:
    # - Most cable formulations we see are up to ~12 cores for the supplier data format.
    # - Cross-section should be a positive number and not absurdly large.
    try:
        cores_int = int(cores)
    except ValueError:
        return None

    if cores_int < 1 or cores_int > 12:
        return None

    try:
        area_float = float(area.replace(',', '.'))
    except ValueError:
        return None

    if area_float <= 0 or area_float > 300:
        return None

    return CableSignature(code=code, cores=cores, area=area)


def _normalize_for_similarity(name: str) -> str:
    if not name:
        return ''

    s = name.upper()
    s = UNIT_MARKERS_RE.sub('', s)  # remove MM / MM2 / MM²
    # normalize dash/space variations in common codes like "RV-K" vs "RVK"
    s = re.sub(r'[\s\-_/]+', '', s)
    return s


def _score_item(item: models.InventoryItem) -> int:
    # Prefer items with more integration data.
    score = 0
    score += 5 if item.shop_url_1 else 0
    score += 5 if item.shop_url_2 else 0
    score += 5 if item.shop_url_3 else 0
    score += 3 if getattr(item, "iskraft_sku", None) else 0
    score += 3 if getattr(item, "ronning_sku", None) else 0
    score += 3 if getattr(item, "reykjafell_sku", None) else 0
    score += 1 if getattr(item, "name_en", None) else 0
    score += 2 if item.category else 0
    score += 2 if item.subcategory else 0
    score += 1 if item.unit else 0
    score += 1 if item.description else 0
    return score


def _get_reference_counts(session, inventory_ids: list[int]) -> int:
    if not inventory_ids:
        return 0
    offer_refs = session.query(models.OfferLineItem).filter(models.OfferLineItem.inventory_item_id.in_(inventory_ids)).count()
    boq_refs = session.query(models.BoQItem).filter(models.BoQItem.inventory_item_id.in_(inventory_ids)).count()
    project_refs = session.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.inventory_item_id.in_(inventory_ids)).count()
    mat_refs = session.query(models.MaterialRequest).filter(models.MaterialRequest.inventory_item_id.in_(inventory_ids)).count()
    return offer_refs + boq_refs + project_refs + mat_refs


def merge_candidates_by_cable_signature(*, dry_run: bool = True, similarity_threshold: float = 0.92) -> None:
    """
    Merge inventory items that represent the same cable even if the spelling differs, e.g.
    "RV-K 3G1,5" ~= "RVK 3g1,5mm" ~= "RV K 3g1,5mm2".
    """
    session = SessionLocal()
    try:
        rows = session.query(
            models.InventoryItem.id,
            models.InventoryItem.name,
            models.InventoryItem.description,
            models.InventoryItem.unit,
            models.InventoryItem.category,
            models.InventoryItem.subcategory,
            models.InventoryItem.shop_url_1,
            models.InventoryItem.shop_url_2,
            models.InventoryItem.shop_url_3,
            models.InventoryItem.ronning_sku,
            models.InventoryItem.iskraft_sku,
            models.InventoryItem.reykjafell_sku,
            models.InventoryItem.name_en,
            models.InventoryItem.local_image_path,
        ).all()

        # Compute signature for each row.
        by_signature: dict[str, list[dict]] = defaultdict(list)
        for r in rows:
            name = r.name or ''
            desc = r.description or ''
            sig = _extract_cable_signature(name) or _extract_cable_signature(desc)
            if not sig:
                continue

            by_signature[sig.key()].append({
                "id": r.id,
                "name": name,
                "description": desc,
                "unit": r.unit,
                "category": r.category,
                "subcategory": r.subcategory,
                "shop_url_1": r.shop_url_1,
                "shop_url_2": r.shop_url_2,
                "shop_url_3": r.shop_url_3,
                "ronning_sku": r.ronning_sku,
                "iskraft_sku": r.iskraft_sku,
                "reykjafell_sku": r.reykjafell_sku,
                "name_en": r.name_en,
                "local_image_path": r.local_image_path,
            })

        sig_groups = [g for g in by_signature.values() if len(g) > 1]
        print(f"Signature groups with duplicates: {len(sig_groups)}")

        merged_groups = 0
        merged_items_deleted = 0

        # Keep merge conservative: only merge groups where category/subcategory match closely.
        for group in sig_groups:
            ids = [x["id"] for x in group]

            # Further filter: require matching unit OR both null.
            # Also require category/subcategory equality when both are present.
            # This dramatically reduces accidental merges across different variants/colors.
            base = group[0]
            same_unit = all((x["unit"] == base["unit"]) for x in group if base["unit"] is not None) or all(
                (x["unit"] is None) for x in group
            )

            base_cat = base["category"]
            base_sub = base["subcategory"]
            same_cat = True
            same_sub = True
            if base_cat is not None:
                same_cat = all(x["category"] == base_cat for x in group)
            if base_sub is not None:
                same_sub = all(x["subcategory"] == base_sub for x in group)

            if not (same_unit and same_cat and same_sub):
                continue

            # Similarity check on normalized names.
            base_norm = _normalize_for_similarity(base["name"])
            group_sorted = sorted(group, key=lambda x: _score_item(session.get(models.InventoryItem, x["id"])), reverse=True)
            canonical = group_sorted[0]
            canonical_norm = _normalize_for_similarity(canonical["name"])

            # If canonical isn't similar enough to everyone, don't merge.
            ok = True
            for x in group:
                other_norm = _normalize_for_similarity(x["name"])
                ratio = SequenceMatcher(None, canonical_norm, other_norm).ratio()
                if ratio < similarity_threshold:
                    ok = False
                    break
            if not ok:
                continue

            # Safety: do not merge if referenced by transactional tables.
            ref_count = _get_reference_counts(session, ids)
            if ref_count > 0:
                print(f"Skip group {canonical['name']} - referenced rows exist (refs={ref_count}).")
                continue

            merged_groups += 1
            if dry_run:
                print(f"[DRY] would merge {len(group)} items into: {canonical['name']} (sig group size)")
                continue

            # Perform merge: merge fields into canonical if canonical missing values.
            canonical_obj = session.get(models.InventoryItem, canonical["id"])
            for other in group:
                if other["id"] == canonical["id"]:
                    continue
                other_obj = session.get(models.InventoryItem, other["id"])
                for field in [
                    "shop_url_1",
                    "shop_url_2",
                    "shop_url_3",
                    "ronning_sku",
                    "iskraft_sku",
                    "reykjafell_sku",
                    "name_en",
                    "unit",
                    "category",
                    "subcategory",
                    "description",
                    "description_en",
                    "local_image_path",
                ]:
                    if getattr(canonical_obj, field) is None and getattr(other_obj, field) is not None:
                        setattr(canonical_obj, field, getattr(other_obj, field))
                session.delete(other_obj)
                merged_items_deleted += 1

            session.add(canonical_obj)

        if not dry_run:
            session.commit()

        print(f"{'Dry-run' if dry_run else 'Apply'} complete. Groups merged: {merged_groups}, items deleted: {merged_items_deleted}")
    finally:
        session.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply merges (deletions) instead of dry-run.")
    parser.add_argument("--similarity", type=float, default=0.92, help="Similarity threshold for normalized names.")
    args = parser.parse_args()

    merge_candidates_by_cable_signature(
        dry_run=not args.apply,
        similarity_threshold=args.similarity,
    )

