"""
Direct bulk import of ar.is labor catalog to Supabase.
Uses psycopg2 directly with executemany for speed. No ORM.
Safe: does not touch tenant_labor_prices.

Requires: pip install psycopg2-binary pandas openpyxl
"""
import sys
import os
import re
import unicodedata
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

AR_DIR = r"C:\Users\mario\Desktop\AR"

# Supabase connection string (decoded from percent-encoding)
SUPABASE_DSN = (
    "host=aws-0-eu-central-1.pooler.supabase.com "
    "port=6543 "
    "dbname=postgres "
    "user=postgres.tntvbultwjeyizswvqax "
    "password=Tf22&&%WbaJkdxb "
    "connect_timeout=60 "
    "sslmode=require"
)

GLOBAL_TENANT_ID = 1  # labor_catalog_items.tenant_id = 1 for global catalog


def norm_str(s):
    """Strip, normalize unicode, return None for empties/NaN."""
    if s is None:
        return None
    s = str(s).strip()
    if s.lower() in ("nan", "none", ""):
        return None
    return s


def norm_cat(s):
    if not s:
        return None
    s = str(s).strip()
    if s.lower() in ("nan", "none", ""):
        return None
    # Remove leading zero-padded numbers like "01 " or "01."
    s = re.sub(r"^\d+[\.\s]+", "", s).strip()
    return s or None


def main():
    print("Connecting to Supabase...")
    conn = psycopg2.connect(SUPABASE_DSN)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("\n--- STEP 1: TRUNCATE catalog tables (RESTART IDENTITY CASCADE) ---")
        cur.execute("SET statement_timeout = '60s'")
        cur.execute(
            "TRUNCATE TABLE "
            "labor_catalog_item_conditions, "
            "labor_catalog_items, "
            "labor_main_category_refs, "
            "work_load_ratios "
            "RESTART IDENTITY CASCADE"
        )
        conn.commit()
        print("Tables cleared OK.")

        # ── Ensure global tenant exists ───────────────────────────────────
        cur.execute("SELECT id FROM tenants WHERE id = %s", (GLOBAL_TENANT_ID,))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO tenants (id, name, is_active) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (GLOBAL_TENANT_ID, "Innri kerfi (sameiginlegur verdlisti)", True)
            )
            conn.commit()
            print(f"Created global tenant id={GLOBAL_TENANT_ID}")

        # ── STEP 2: Main Categories ───────────────────────────────────────
        print("\n--- STEP 2: Main Categories ---")
        df_cats = pd.read_excel(os.path.join(AR_DIR, "Ákvæðisgrundvöllur Aðalflokkar.xlsx"))
        cat_rows = []
        for _, row in df_cats.iterrows():
            code = norm_str(str(row["Númer"]).zfill(2))
            name = norm_str(row["Lýsing"])
            if code and name:
                cat_rows.append((code, name, name))  # (code, name, name_en)
        execute_values(cur,
            "INSERT INTO labor_main_category_refs (code, name, name_en) VALUES %s "
            "ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, name_en=EXCLUDED.name_en",
            cat_rows
        )
        conn.commit()
        print(f"  {len(cat_rows)} categories inserted/updated.")

        # ── STEP 3: Workload Ratios ───────────────────────────────────────
        print("\n--- STEP 3: Workload Ratios ---")
        df_ratios = pd.read_excel(os.path.join(AR_DIR, "Ákvæðisgrundvöllur Álagshlutföll.xlsx"))
        ratio_rows = []
        for _, row in df_ratios.iterrows():
            code = norm_str(row["Númer"])
            desc = norm_str(row["Lýsing"])
            if not code or not desc:
                continue
            ratio = float(row["Hlutfall"]) if not pd.isna(row["Hlutfall"]) else 0.0
            rt = int(row["Tegund"]) if not pd.isna(row["Tegund"]) else None
            active = bool(row["Virkt"]) if not pd.isna(row["Virkt"]) else True
            ratio_rows.append((code, desc, ratio, rt, active))
        execute_values(cur,
            "INSERT INTO work_load_ratios (code, description, ratio, ratio_type, is_active) VALUES %s "
            "ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description, ratio=EXCLUDED.ratio",
            ratio_rows
        )
        conn.commit()
        print(f"  {len(ratio_rows)} ratios inserted/updated.")

        # ── STEP 4: Labor Items + Conditions ─────────────────────────────
        print("\n--- STEP 4: Labor Items + Conditions ---")
        df_units = pd.read_excel(os.path.join(AR_DIR, "Ákvæðisgrundvöllur Allar einingar.xlsx"))
        df_units.columns = ["Main_category", "Sub_category", "Item", "Conditions", "Effective_date", "Unit_cost"]
        print(f"  Loaded {len(df_units)} rows from Excel.")

        # Group rows: one item per (Item desc, main_cat, sub_cat)
        # Each row becomes a condition variant
        items_map = {}  # key -> {desc, main_cat, sub_cat, conditions_list}
        for _, row in df_units.iterrows():
            main_cat = norm_cat(row["Main_category"])
            sub_cat = norm_cat(row["Sub_category"])
            desc = norm_str(row["Item"])
            cond = norm_str(row["Conditions"])
            eff_date = norm_str(row["Effective_date"])
            try:
                unit_cost = float(row["Unit_cost"]) if not pd.isna(row["Unit_cost"]) else 0.0
            except (ValueError, TypeError):
                unit_cost = 0.0

            if not desc:
                continue

            key = (desc, main_cat, sub_cat)
            if key not in items_map:
                items_map[key] = {
                    "desc": desc,
                    "main_cat": main_cat,
                    "sub_cat": sub_cat,
                    "reference_price": unit_cost,
                    "variants": [],
                }
            items_map[key]["variants"].append({
                "condition": cond or "Standard",
                "unit_cost": unit_cost,
                "eff_date": eff_date,
            })

        print(f"  Unique items: {len(items_map)}")

        # Batch insert items
        item_records = []
        for (desc, main_cat, sub_cat), item in items_map.items():
            cat_str = " | ".join(filter(None, [main_cat, sub_cat])) or None
            ref_price = item["reference_price"]
            item_records.append((
                GLOBAL_TENANT_ID,
                desc,           # description (IS)
                desc,           # description_en (mirror IS for now)
                "unit",
                cat_str,
                main_cat,
                main_cat,       # main_category_en = IS for now
                sub_cat,
                sub_cat,        # sub_category_en = IS for now
                ref_price,
                ref_price,      # default_unit_price
            ))

        # Insert in batches of 200
        BATCH = 200
        total_created = 0
        for i in range(0, len(item_records), BATCH):
            batch = item_records[i:i+BATCH]
            execute_values(cur,
                """INSERT INTO labor_catalog_items
                   (tenant_id, description, description_en, unit, category,
                    main_category, main_category_en, sub_category, sub_category_en,
                    reference_price, default_unit_price)
                   VALUES %s""",
                batch
            )
            total_created += len(batch)
            conn.commit()
            print(f"  Items inserted: {total_created}/{len(item_records)}", end="\r", flush=True)

        print(f"\n  Done. {total_created} items committed.")

        # Fetch all item IDs back for condition linking
        print("  Fetching item IDs...")
        cur.execute("SELECT id, description, main_category, sub_category FROM labor_catalog_items WHERE tenant_id = %s", (GLOBAL_TENANT_ID,))
        rows = cur.fetchall()
        id_map = {(r[1], r[2] or "", r[3] or ""): r[0] for r in rows}
        print(f"  Mapped {len(id_map)} items.")

        # Insert condition variants
        cond_records = []
        skipped_conds = 0
        for (desc, main_cat, sub_cat), item in items_map.items():
            item_id = id_map.get((desc, main_cat or "", sub_cat or ""))
            if not item_id:
                skipped_conds += 1
                continue
            for idx, variant in enumerate(item["variants"], start=1):
                cond_records.append((
                    item_id,
                    str(idx).zfill(2),
                    variant["condition"],
                    variant["condition"],   # condition_description_en = IS mirror
                    variant["unit_cost"],
                    variant["eff_date"],
                ))

        print(f"  Inserting {len(cond_records)} condition variants (skipped_key_misses={skipped_conds})...")
        for i in range(0, len(cond_records), BATCH):
            batch = cond_records[i:i+BATCH]
            execute_values(cur,
                """INSERT INTO labor_catalog_item_conditions
                   (labor_catalog_item_id, code, condition_description, condition_description_en,
                    units_per_hour, effective_date)
                   VALUES %s""",
                batch
            )
            conn.commit()
            done = min(i + BATCH, len(cond_records))
            print(f"  Conditions inserted: {done}/{len(cond_records)}", end="\r", flush=True)

        print(f"\n  Done. {len(cond_records)} condition variants committed.")

        print("\n[OK] Supabase import complete!")
        print(f"  Categories: {len(cat_rows)}")
        print(f"  Ratios:     {len(ratio_rows)}")
        print(f"  Items:      {total_created}")
        print(f"  Conditions: {len(cond_records)}")

    except Exception as e:
        conn.rollback()
        print(f"\n[FAIL] Error: {e}")
        import traceback; traceback.print_exc()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
