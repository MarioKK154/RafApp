from __future__ import annotations

import glob
import shutil
from datetime import datetime
from pathlib import Path

from app import security
from app.database import SessionLocal
from app.database import engine
from app import models
from app.database import Base

from scripts.import_ronning_products_with_categories import import_ronning_products_with_categories
from scripts.import_ronning_from_excel import import_ronning_articles
from scripts.import_reykjafell_links_from_excel import backfill_reykjafell_links
from scripts.recategorize_reykjafell_from_name_keywords import main as recategorize_reykjafell
from scripts.strip_numeric_prefixes_from_inventory_categories import main as strip_numeric_prefixes
from scripts.merge_duplicate_inventory_items import merge_inventory_items_by_exact_name
from scripts.normalize_inventory_category_labels import main as normalize_labels


def _find_file(pattern: str, default_path: str | None = None) -> Path:
    if default_path:
        p = Path(default_path)
        if p.exists():
            return p
    matches = glob.glob(pattern)
    if not matches:
        raise FileNotFoundError(f"No file found matching pattern: {pattern}")
    return Path(matches[0])


def _backup_db(backend_dir: Path) -> Path | None:
    db_path = backend_dir / "sql_app.db"
    if not db_path.exists():
        return None
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backend_dir / f"sql_app.backup_{ts}.db"
    shutil.copy2(db_path, backup_path)
    return backup_path


def _reset_database_in_place() -> None:
    """
    Recreate schema inside the same sqlite file.
    Avoids os.remove() locking issues on Windows.
    """
    engine.dispose()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Minimal bootstrap data
    session = SessionLocal()
    try:
        system_tenant = models.Tenant(name="System Root", is_active=True)
        session.add(system_tenant)
        session.commit()
        session.refresh(system_tenant)

        superuser = models.User(
            email="admin@rafapp.com",
            full_name="System Superadmin",
            hashed_password=security.get_password_hash("admin123"),
            role="superuser",
            is_active=True,
            is_superuser=True,
            tenant_id=system_tenant.id,
        )
        session.add(superuser)
        session.commit()
    finally:
        session.close()


def _print_inventory_summary() -> None:
    session = SessionLocal()
    try:
        total = session.query(models.InventoryItem).count()
        ronning = session.query(models.InventoryItem).filter(models.InventoryItem.shop_url_1 != None).count()  # noqa: E711
        reyk = session.query(models.InventoryItem).filter(models.InventoryItem.shop_url_3 != None).count()  # noqa: E711
        print(f"Inventory summary: total={total}, ronning(shop_url_1)={ronning}, reykjafell(shop_url_3)={reyk}")

        # top categories
        from collections import Counter

        cats = [c for (c,) in session.query(models.InventoryItem.category).all()]
        counter = Counter([c or "Uncategorized" for c in cats])
        print("Top categories:")
        for cat, count in counter.most_common(20):
            print(f"  - {cat}: {count}")
    finally:
        session.close()


def main() -> None:
    backend_dir = Path(__file__).resolve().parents[1]

    ronning_file = _find_file(r"c:\Users\mario\Downloads\*afsl*")
    reykjafell_file = _find_file(r"c:\Users\mario\Downloads\tengill listi.xlsx")

    print(f"Using Ronning file: {ronning_file}")
    print(f"Using Reykjafell file: {reykjafell_file}")

    backup = _backup_db(backend_dir)
    if backup:
        print(f"DB backup created: {backup}")

    # Fresh DB (in-place recreate)
    _reset_database_in_place()

    # Import Ronning with structured categories from sheet columns
    import_ronning_products_with_categories(ronning_file)

    # Import Reykjafell items (name/unit), then set supplier links
    import_ronning_articles(reykjafell_file)
    backfill_reykjafell_links(reykjafell_file)

    # Post-processing for consistent, usable catalog
    recategorize_reykjafell()
    strip_numeric_prefixes()
    merge_inventory_items_by_exact_name()
    normalize_labels()

    _print_inventory_summary()


if __name__ == "__main__":
    main()

