import re
import sys
from collections import defaultdict

from app.database import SessionLocal
from app import models


def _score_item(item: models.InventoryItem) -> int:
    """
    Prefer items that have:
    - shop URLs set
    - category/subcategory set
    - unit set
    """
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
    return score


def merge_inventory_items_by_exact_name() -> None:
    session = SessionLocal()
    try:
        rows = session.query(models.InventoryItem.id, models.InventoryItem.name).all()
        by_name = defaultdict(list)
        for item_id, name in rows:
            if name:
                by_name[name].append(item_id)

        dup_names = [n for n, ids in by_name.items() if len(ids) > 1]
        print(f"Duplicate name groups: {len(dup_names)}")

        # Safety: if duplicates are referenced elsewhere, this script will refuse
        dup_ids = [item_id for n in dup_names for item_id in by_name[n]]
        if dup_ids:
            offer_refs = session.query(models.OfferLineItem).filter(models.OfferLineItem.inventory_item_id.in_(dup_ids)).count()
            boq_refs = session.query(models.BoQItem).filter(models.BoQItem.inventory_item_id.in_(dup_ids)).count()
            project_refs = session.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.inventory_item_id.in_(dup_ids)).count()
            mat_refs = session.query(models.MaterialRequest).filter(models.MaterialRequest.inventory_item_id.in_(dup_ids)).count()
            total_refs = offer_refs + boq_refs + project_refs + mat_refs
            print(f"Reference check for duplicates: Offer={offer_refs}, BoQ={boq_refs}, ProjectInv={project_refs}, MaterialReq={mat_refs}")
            if total_refs > 0:
                print("Aborting merge: duplicates are referenced in transactional tables.")
                return

        merged_groups = 0
        deleted = 0

        for name in dup_names:
            ids = by_name[name]
            items = session.query(models.InventoryItem).filter(models.InventoryItem.id.in_(ids)).all()
            canonical = max(items, key=_score_item)

            for other in items:
                if other.id == canonical.id:
                    continue
                # Merge fields if canonical missing them
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
                    if getattr(canonical, field) is None and getattr(other, field) is not None:
                        setattr(canonical, field, getattr(other, field))

                session.delete(other)
                deleted += 1

            session.add(canonical)
            merged_groups += 1

        session.commit()
        print(f"Merge complete. Groups merged: {merged_groups}, items deleted: {deleted}")
    finally:
        session.close()


if __name__ == "__main__":
    merge_inventory_items_by_exact_name()

