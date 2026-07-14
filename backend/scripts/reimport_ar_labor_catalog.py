"""
Reimport labor catalog from ar.is Excel files.

SAFE MODE:
- Does NOT delete tenant_labor_prices (preserves production pricing)
- Clears only: labor_catalog_item_conditions, labor_catalog_items, labor_main_category_refs, work_load_ratios
- On Supabase production, uses TRUNCATE ... CASCADE to avoid FK locks
"""
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import crud, models, schemas
from app.database import get_database_url

AR_DIR = r"C:\Users\mario\Desktop\AR"


def get_excel_df(filename, rename_map):
    """Load an Excel file from AR_DIR and rename columns."""
    fpath = os.path.join(AR_DIR, filename)
    df = pd.read_excel(fpath)
    return df.rename(columns=rename_map)

def clear_catalog_tables(db, use_truncate=False):
    """
    Clear only catalog-specific tables.
    Does NOT touch tenant_labor_prices to preserve production pricing.
    use_truncate=True uses TRUNCATE CASCADE (safe for Supabase).
    """
    if use_truncate:
        print("  TRUNCATE CASCADE on catalog tables...")
        db.execute(text("SET statement_timeout = '30s'"))
        db.execute(text(
            "TRUNCATE TABLE labor_catalog_item_conditions, "
            "labor_catalog_items, labor_main_category_refs, "
            "work_load_ratios RESTART IDENTITY CASCADE"
        ))
    else:
        print("  Clearing labor_catalog_item_conditions...")
        db.execute(text("DELETE FROM labor_catalog_item_conditions"))
        print("  Clearing labor_catalog_items...")
        db.execute(text("DELETE FROM labor_catalog_items"))
        print("  Clearing labor_main_category_refs...")
        db.execute(text("DELETE FROM labor_main_category_refs"))
        print("  Clearing work_load_ratios...")
        db.execute(text("DELETE FROM work_load_ratios"))
    db.commit()
    print("  Tables cleared OK.")


def import_to_db(db_url, label):
    host = db_url.split('@')[1] if '@' in db_url else db_url
    print(f"\n{'='*60}")
    print(f"Importing to [{label}]: {host}")
    print(f"{'='*60}")

    is_supabase = "supabase" in db_url
    engine = create_engine(
        db_url,
        connect_args={"connect_timeout": 60} if is_supabase else {},
        pool_pre_ping=True,
    )
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # ── 1. Clear old catalog data ────────────────────────────────────
        clear_catalog_tables(db, use_truncate=is_supabase)

        # ── 2. Main Categories ───────────────────────────────────────────
        print("\nImporting Main Categories...")
        df_cats = get_excel_df(
            "Ákvæðisgrundvöllur Aðalflokkar.xlsx",
            {"Númer": "Númer", "Lýsing": "Lýsing"}
        )
        cat_rows = []
        for _, row in df_cats.iterrows():
            code = str(row["Númer"]).strip().zfill(2)
            name = str(row["Lýsing"]).strip()
            if code and name and name.lower() != "nan":
                cat_rows.append({"code": code, "name": name})
        res_cats = crud.import_labor_main_category_refs(db, cat_rows)
        print(f"  Categories: {res_cats}")

        # ── 3. Workload Ratios ───────────────────────────────────────────
        print("\nImporting Workload Ratios...")
        df_ratios = get_excel_df(
            "Ákvæðisgrundvöllur Álagshlutföll.xlsx",
            {}  # columns already correct
        )
        ratio_rows = []
        for _, row in df_ratios.iterrows():
            try:
                code = str(row["Númer"]).strip()
                desc = str(row["Lýsing"]).strip()
                ratio = float(row["Hlutfall"])
                rt = int(row["Tegund"]) if not pd.isna(row["Tegund"]) else None
                active = bool(row["Virkt"])
                if code and desc and desc.lower() != "nan":
                    ratio_rows.append({"code": code, "description": desc, "ratio": ratio,
                                       "ratio_type": rt, "is_active": active})
            except Exception as e:
                print(f"  Skipping ratio row: {e}")
        res_ratios = crud.import_work_load_ratios(db, ratio_rows)
        print(f"  Workload Ratios: {res_ratios}")

        # ── 4. Labor Catalog Items ───────────────────────────────────────
        print("\nImporting Labor Catalog Items (this may take a moment)...")
        df_units = get_excel_df(
            "Ákvæðisgrundvöllur Allar einingar.xlsx",
            {
                "Aðalflokkur": "Main_category",
                "Flokkur": "Sub_category",
                "Liður": "Item",
                "Aðstæður": "Conditions",
                "Tók gildi": "Effective_date",
                "Eining": "Unit_cost",
            }
        )
        print(f"  Loaded {len(df_units)} rows from Excel.")

        # Convert to CSV string for the existing crud function
        csv_content = df_units.to_csv(index=False)
        res_units = crud.import_labor_catalog_from_ar_is_csv(
            db,
            csv_content=csv_content,
            tenant_id=None,
            skip_duplicates=True,
            global_only=True,
        )
        print(f"  Items: created={res_units.get('created')} "
              f"variants_added={res_units.get('variants_added')} "
              f"skipped={res_units.get('skipped')} "
              f"errors={res_units.get('error_count')}")
        if res_units.get("errors"):
            print("  First 5 errors:")
            for err in res_units["errors"][:5]:
                print(f"    {err}")

        # ── 5. Mirror IS → EN ────────────────────────────────────────────
        print("\nMirroring Icelandic names to English...")
        res_mirror = crud.mirror_labor_catalog_is_to_en(db)
        print(f"  Mirror result: {res_mirror}")

        db.commit()
        print(f"\n[OK] [{label}] Import complete!")

    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] [{label}] FAILED: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=["local", "supabase", "all"], default="all")
    args = parser.parse_args()

    local_url = get_database_url()
    supabase_url = (
        "postgresql://postgres.tntvbultwjeyizswvqax:Tf22%26%26%25WbaJkdxb"
        "@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
    )

    if args.target in ("local", "all"):
        import_to_db(local_url, "LOCAL")

    if args.target in ("supabase", "all"):
        import_to_db(supabase_url, "SUPABASE PRODUCTION")


if __name__ == "__main__":
    main()
