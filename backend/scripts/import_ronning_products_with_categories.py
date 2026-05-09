import re
import sys
from pathlib import Path

import pandas as pd

from app.database import SessionLocal
from app import models


def _parse_numeric_prefix(value: str) -> str | None:
    """
    Extract leading digits (e.g. "0003455 - ... " -> "0003455").
    """
    m = re.match(r"^\s*(\d+)", value or "")
    return m.group(1) if m else None


def _parse_desc_after_dash(value: str) -> str | None:
    """
    Extract text after the first dash following a leading number.
    Example: "0003455 - N1XZ1-AR ..." -> "N1XZ1-AR ..."
    """
    if not value:
        return None
    # Replace any leading digits + dash with ""
    v = re.sub(r"^\s*\d+\s*-\s*", "", value)
    v = v.strip()
    return v if v else None


def _parse_code_and_label(value: str) -> tuple[str, str] | None:
    """
    Parse strings like:
      "0110 -Aflstrengir" -> ("0110", "Aflstrengir")
      "0100-Rafstrengir" -> ("0100", "Rafstrengir")
    """
    if not value:
        return None
    v = str(value).strip()
    m = re.match(r"^\s*(\d+)\s*-\s*(.+?)\s*$", v)
    if not m:
        # also handle "0100-Rafstrengir" with no spaces around dash (still matches above)
        return None
    code = m.group(1).strip()
    label = m.group(2).strip()
    return code, label


def import_ronning_products_with_categories(excel_path: Path) -> None:
    if not excel_path.exists():
        print(f"File not found: {excel_path}")
        return

    print(f"Loading Ronning product list from: {excel_path}")
    df = pd.read_excel(excel_path)

    cols = {c.strip().lower(): c for c in df.columns}
    vara_col = cols.get("vara") or next((c for c in df.columns if str(c).strip().lower() == "vara"), None)
    if not vara_col:
        raise RuntimeError("Could not find 'Vara' column in Excel.")

    # "Vöruflokkur Lýsing" column
    group_desc_col = None
    for key, original in cols.items():
        if ("flokkur" in key or "v\u00f6ruflokkur" in key or "v\u00f6ruflokkur" in str(original).lower() or "v\u00f6ruflokkur" in key) and (
            "l" in key and "sing" in key
        ):
            group_desc_col = original
            break
    if not group_desc_col:
        # fallback: first column containing "l\u00fdsing" / "lýsing"
        for key, original in cols.items():
            if "l" in key and "sing" in key:
                group_desc_col = original
                break

    # "Yfirflokkur > Vöruflokkur > Vara" column (parent category)
    parent_path_col = None
    for key, original in cols.items():
        if "yfirflokkur" in key and "vara" in key:
            parent_path_col = original
            break
    if not parent_path_col:
        parent_path_col = next((c for c in df.columns if "yfirflokkur" in str(c).lower()), None)

    if not group_desc_col or not parent_path_col:
        print("Could not detect required category columns.")
        print("Columns:", list(df.columns))
        return

    session = SessionLocal()

    # Cleanup: delete the earlier incorrect Ronning-imported "category items"
    # These have names like "0110 -Aflstrengir" and shop_url_1 set.
    wrong_pat = re.compile(r"^\s*\d{3,4}\s*-\s*")
    wrong_items = (
        session.query(models.InventoryItem)
        .filter(models.InventoryItem.shop_url_1 != None)  # noqa: E711
        .all()
    )
    wrong_ids = [it.id for it in wrong_items if it.name and wrong_pat.match(it.name)]

    # Only delete if they are not referenced anywhere.
    if wrong_ids:
        offer_refs = session.query(models.OfferLineItem).filter(models.OfferLineItem.inventory_item_id.in_(wrong_ids)).count()
        boq_refs = session.query(models.BoQItem).filter(models.BoQItem.inventory_item_id.in_(wrong_ids)).count()
        project_inv_refs = session.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.inventory_item_id.in_(wrong_ids)).count()
        mat_req_refs = session.query(models.MaterialRequest).filter(models.MaterialRequest.inventory_item_id.in_(wrong_ids)).count()
        total_refs = offer_refs + boq_refs + project_inv_refs + mat_req_refs

        if total_refs > 0:
            print("Ref safety check failed; aborting deletion.")
            print(f"Refs: Offer={offer_refs} BoQ={boq_refs} ProjectInv={project_inv_refs} MaterialReq={mat_req_refs}")
            session.close()
            return

        deleted = 0
        for it_id in wrong_ids:
            session.query(models.InventoryItem).filter(models.InventoryItem.id == it_id).delete()
            deleted += 1
        session.commit()
        print(f"Deleted {deleted} incorrect Ronning category items (no FK references).")

    created = 0
    updated = 0

    try:
        for _, row in df.iterrows():
            vara_full = row.get(vara_col)
            if vara_full is None:
                continue
            vara_full_str = str(vara_full).strip()
            if not vara_full_str or vara_full_str.lower() == "nan":
                continue

            product_num = _parse_numeric_prefix(vara_full_str)
            if not product_num:
                continue

            product_name = _parse_desc_after_dash(vara_full_str)
            if not product_name:
                continue

            group_desc = row.get(group_desc_col)
            parent_path = row.get(parent_path_col)

            group_parsed = _parse_code_and_label(str(group_desc)) if group_desc is not None else None
            parent_parsed = _parse_code_and_label(str(parent_path)) if parent_path is not None else None

            if not group_parsed or not parent_parsed:
                # Still create product item; just keep categories empty
                category = None
                subcategory = None
            else:
                group_code, group_label = group_parsed
                parent_code, parent_label = parent_parsed
                category = f"{group_code} - {group_label}"
                subcategory = parent_label  # e.g. "Rafstrengir"

            ronning_url = f"https://ronning.is/vara/{product_num}/"

            existing = (
                session.query(models.InventoryItem)
                .filter(models.InventoryItem.name == product_name)
                .first()
            )

            if existing:
                changed = False
                if ronning_url and not existing.shop_url_1:
                    existing.shop_url_1 = ronning_url
                    changed = True
                if category and (not existing.category or existing.category == "Materials"):
                    existing.category = category
                    changed = True
                if subcategory and (not existing.subcategory or existing.subcategory == "All"):
                    existing.subcategory = subcategory
                    changed = True
                if changed:
                    session.add(existing)
                    updated += 1
                continue

            item = models.InventoryItem(
                name=product_name,
                category=category,
                subcategory=subcategory,
                description=None,
                unit=None,
                low_stock_threshold=None,
                shop_url_1=ronning_url,
                shop_url_2=None,
                shop_url_3=None,
                local_image_path=None,
            )
            session.add(item)
            created += 1

        session.commit()
        print(f"Ronning product import complete: created {created}, updated {updated}.")
    finally:
        session.close()


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        print("Usage: python -m scripts.import_ronning_products_with_categories <excel_path>")
        return
    excel_path = Path(argv[1]).resolve()
    import_ronning_products_with_categories(excel_path)


if __name__ == "__main__":
    main(sys.argv)

