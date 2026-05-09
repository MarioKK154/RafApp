from app.database import SessionLocal
from app import models


def main() -> None:
    session = SessionLocal()
    updated_urls = 0
    backfilled_categories = 0
    try:
        # Fix field mapping:
        # - UI expects:
        #   shop_url_1 = Ronning (johann ronning)
        #   shop_url_2 = Iskraft
        #   shop_url_3 = Reyk/ Reykjavell
        # We currently have Ronning URLs in shop_url_2 from the earlier import.
        q = session.query(models.InventoryItem).all()

        for item in q:
            if item.shop_url_2 and "ronning.is/vara/" in item.shop_url_2:
                if not item.shop_url_1:
                    item.shop_url_1 = item.shop_url_2
                item.shop_url_2 = None
                updated_urls += 1

            # Backfill missing categories so items show up in Shop/inventory browsers.
            # If an imported item has any supplier link, but category/subcategory is missing,
            # assign it to a generic "Materials / All" bucket.
            missing_cat = not item.category
            missing_sub = not item.subcategory
            has_any_supplier_link = bool(item.shop_url_1 or item.shop_url_2 or item.shop_url_3)
            if has_any_supplier_link and (missing_cat or missing_sub):
                item.category = item.category or "Materials"
                item.subcategory = item.subcategory or "All"
                backfilled_categories += 1

        session.commit()
        print(f"Backfill complete: moved/normalized {updated_urls} Ronning URLs, backfilled {backfilled_categories} category/subcategory pairs.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

