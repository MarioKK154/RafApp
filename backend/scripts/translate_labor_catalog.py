"""
Translate ar.is labor catalog IS -> EN using deep-translator (Google Translate).

Strategy:
- Collect ALL unique Icelandic strings from both DBs
- Batch-translate by joining with a separator (||) to minimize API calls
- Update _en columns in both local and Supabase DBs
- Cache translations in-memory to avoid re-translating repeats

Fields translated:
  labor_catalog_items:         description -> description_en
                               main_category -> main_category_en
                               sub_category  -> sub_category_en
  labor_catalog_item_conditions: condition_description -> condition_description_en
  labor_main_category_refs:    name -> name_en

Usage:
  python scripts/translate_labor_catalog.py [--target local|supabase|all]
"""

import argparse
import re
import sys
import time
import psycopg2
from psycopg2.extras import execute_values

# ── Connection configs ────────────────────────────────────────────────────────

LOCAL_DSN_PARTS = {
    "host": "localhost",
    "port": 5432,
    "dbname": "rafapp_db",
    "user": "postgres",
    "password": "Mariokk16081911223",
}

SUPABASE_DSN_PARTS = {
    "host": "aws-0-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "dbname": "postgres",
    "user": "postgres.tntvbultwjeyizswvqax",
    "password": "Tf22&&%WbaJkdxb",
    "sslmode": "require",
    "connect_timeout": 60,
}

# Separator that is extremely unlikely to appear in Icelandic electrical text
SEP = " ||| "
BATCH_CHARS = 3000   # stay under Google Translate's safe limit per request
RATE_LIMIT_S = 0.3   # seconds between API calls


def get_translator():
    from deep_translator import GoogleTranslator
    return GoogleTranslator(source="is", target="en")


def translate_batch(strings: list, translator) -> dict:
    """
    Translate a list of unique Icelandic strings.
    Returns {is_string: en_string} mapping.
    """
    if not strings:
        return {}

    cache = {}

    # Split into batches by character count
    batches = []
    current_batch = []
    current_len = 0
    safe_strings = []  # sanitized versions for API
    for s in strings:
        safe = s.replace(SEP.strip(), " - ")
        safe_strings.append(safe)
        token_len = len(safe) + len(SEP)
        if current_len + token_len > BATCH_CHARS and current_batch:
            batches.append(current_batch[:])
            current_batch = [(s, safe)]
            current_len = token_len
        else:
            current_batch.append((s, safe))
            current_len += token_len
    if current_batch:
        batches.append(current_batch)

    total = len(strings)
    done = 0
    print(f"    {total} strings in {len(batches)} batches...")

    for bi, batch in enumerate(batches):
        orig_keys = [item[0] for item in batch]
        safe_texts = [item[1] for item in batch]
        joined = SEP.join(safe_texts)

        try:
            translated = translator.translate(joined)
            parts = translated.split(SEP)

            if len(parts) == len(batch):
                for key, trans in zip(orig_keys, parts):
                    cache[key] = trans.strip()
            else:
                # Fallback: translate one by one
                print(f"\n    Batch {bi+1}: split mismatch ({len(parts)} vs {len(batch)}), falling back...")
                for key, safe in batch:
                    try:
                        cache[key] = translator.translate(safe).strip()
                        time.sleep(RATE_LIMIT_S)
                    except Exception as e:
                        print(f"      WARN: '{safe[:40]}': {e}")
                        cache[key] = key  # keep IS as fallback

        except Exception as e:
            print(f"\n    Batch {bi+1} ERROR: {e}")
            for key, _ in batch:
                cache[key] = key  # keep IS as fallback

        done += len(batch)
        print(f"    Translated: {done}/{total}", end="\r", flush=True)
        if bi < len(batches) - 1:
            time.sleep(RATE_LIMIT_S)

    print()
    return cache



def translate_db(conn_params: dict, label: str, global_cache: dict):
    print(f"\n{'='*60}")
    print(f"Translating [{label}]")
    print(f"{'='*60}")

    conn = psycopg2.connect(**conn_params)
    conn.autocommit = False
    cur = conn.cursor()
    translator = get_translator()

    try:
        # ── 1. Main category refs ─────────────────────────────────────────
        print("\n[1/4] labor_main_category_refs (name -> name_en)...")
        cur.execute("SELECT id, name FROM labor_main_category_refs WHERE name IS NOT NULL")
        rows = cur.fetchall()
        unique_strings = list({r[1] for r in rows if r[1]})
        new_trans = translate_batch([s for s in unique_strings if s not in global_cache], translator)
        global_cache.update(new_trans)

        updates = [(global_cache.get(r[1], r[1]), r[0]) for r in rows]
        cur.executemany("UPDATE labor_main_category_refs SET name_en = %s WHERE id = %s", updates)
        conn.commit()
        print(f"  Updated {len(updates)} rows.")

        # ── 2. Item main_category and sub_category ────────────────────────
        print("\n[2/4] labor_catalog_items (category fields)...")
        cur.execute("""
            SELECT DISTINCT main_category FROM labor_catalog_items WHERE main_category IS NOT NULL
            UNION
            SELECT DISTINCT sub_category FROM labor_catalog_items WHERE sub_category IS NOT NULL
        """)
        cat_strings = [r[0] for r in cur.fetchall() if r[0]]
        new_trans = translate_batch([s for s in cat_strings if s not in global_cache], translator)
        global_cache.update(new_trans)

        cur.execute("SELECT id, main_category, sub_category FROM labor_catalog_items")
        item_cat_rows = cur.fetchall()
        cat_updates = [
            (
                global_cache.get(r[1], r[1]) if r[1] else None,
                global_cache.get(r[2], r[2]) if r[2] else None,
                r[0],
            )
            for r in item_cat_rows
        ]
        cur.executemany(
            "UPDATE labor_catalog_items SET main_category_en = %s, sub_category_en = %s WHERE id = %s",
            cat_updates,
        )
        conn.commit()
        print(f"  Updated {len(cat_updates)} rows (main/sub category).")

        # ── 3. Item descriptions ──────────────────────────────────────────
        print("\n[3/4] labor_catalog_items (description -> description_en)...")
        cur.execute("SELECT id, description FROM labor_catalog_items WHERE description IS NOT NULL")
        desc_rows = cur.fetchall()
        unique_descs = list({r[1] for r in desc_rows if r[1]})
        untranslated = [s for s in unique_descs if s not in global_cache]
        new_trans = translate_batch(untranslated, translator)
        global_cache.update(new_trans)

        desc_updates = [(global_cache.get(r[1], r[1]), r[0]) for r in desc_rows]
        # Batch update in chunks of 500
        for i in range(0, len(desc_updates), 500):
            cur.executemany(
                "UPDATE labor_catalog_items SET description_en = %s WHERE id = %s",
                desc_updates[i:i+500],
            )
            conn.commit()
        print(f"  Updated {len(desc_updates)} rows (descriptions).")

        # ── 4. Condition descriptions ─────────────────────────────────────
        print("\n[4/4] labor_catalog_item_conditions (condition_description -> condition_description_en)...")
        cur.execute("SELECT id, condition_description FROM labor_catalog_item_conditions WHERE condition_description IS NOT NULL")
        cond_rows = cur.fetchall()
        unique_conds = list({r[1] for r in cond_rows if r[1]})
        untranslated_conds = [s for s in unique_conds if s not in global_cache]
        new_trans = translate_batch(untranslated_conds, translator)
        global_cache.update(new_trans)

        cond_updates = [(global_cache.get(r[1], r[1]), r[0]) for r in cond_rows]
        for i in range(0, len(cond_updates), 500):
            cur.executemany(
                "UPDATE labor_catalog_item_conditions SET condition_description_en = %s WHERE id = %s",
                cond_updates[i:i+500],
            )
            conn.commit()
        print(f"  Updated {len(cond_updates)} rows (conditions).")

        print(f"\n[OK] [{label}] Translation complete!")
        print(f"  Total cache size: {len(global_cache)} unique strings")

    except Exception as e:
        conn.rollback()
        print(f"\n[FAIL] [{label}] Error: {e}")
        import traceback; traceback.print_exc()
    finally:
        cur.close()
        conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=["local", "supabase", "all"], default="all")
    args = parser.parse_args()

    # Shared translation cache across DBs — translate once, apply everywhere
    global_cache: dict[str, str] = {}

    if args.target in ("local", "all"):
        translate_db(LOCAL_DSN_PARTS, "LOCAL", global_cache)

    if args.target in ("supabase", "all"):
        translate_db(SUPABASE_DSN_PARTS, "SUPABASE PRODUCTION", global_cache)

    print(f"\nDone. Total unique strings translated: {len(global_cache)}")


if __name__ == "__main__":
    main()
