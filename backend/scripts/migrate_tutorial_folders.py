"""
Migration: Tutorial Folder System (PostgreSQL version)
=======================================================
- Creates tutorial_folders table
- Alters tutorials table:
    - Adds folder_id FK, external_url, original_filename,
      file_size_bytes, content_type, is_global
    - Converts old enum category values to plain strings
- Creates one folder per distinct old category
- Links existing tutorials to their new folder

Run:
    python backend/scripts/migrate_tutorial_folders.py
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.database import engine, Base
from app import models  # registers all models with Base


def column_exists(conn, table: str, col: str) -> bool:
    """PostgreSQL: check via information_schema."""
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": col},
    )
    return result.scalar() > 0


def table_exists(conn, table: str) -> bool:
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :t"
        ),
        {"t": table},
    )
    return result.scalar() > 0


def migrate():
    print("Creating new tables via metadata.create_all ...")
    Base.metadata.create_all(bind=engine)
    print("  Done.")

    with engine.begin() as conn:

        # ----------------------------------------------------------------
        # Drop the old PostgreSQL ENUM type constraint on tutorials.category
        # and change the column to plain TEXT if it's still an enum type
        # ----------------------------------------------------------------
        # Check the column data type
        col_type_row = conn.execute(
            text(
                "SELECT data_type, udt_name FROM information_schema.columns "
                "WHERE table_name = 'tutorials' AND column_name = 'category'"
            )
        ).fetchone()

        if col_type_row:
            data_type, udt_name = col_type_row
            if data_type == 'USER-DEFINED':
                print(f"  Column tutorials.category is enum type '{udt_name}', converting to TEXT ...")
                # Convert enum column to text
                conn.execute(text(
                    "ALTER TABLE tutorials ALTER COLUMN category TYPE TEXT USING category::TEXT"
                ))
                print("  Converted tutorials.category to TEXT.")

        # ----------------------------------------------------------------
        # Add new columns to tutorials if missing
        # ----------------------------------------------------------------
        new_cols = [
            ("folder_id",         "INTEGER REFERENCES tutorial_folders(id) ON DELETE SET NULL"),
            ("external_url",      "TEXT"),
            ("original_filename", "TEXT"),
            ("file_size_bytes",   "INTEGER"),
            ("content_type",      "TEXT"),
            ("is_global",         "BOOLEAN DEFAULT FALSE"),
        ]
        for col_name, col_def in new_cols:
            if not column_exists(conn, "tutorials", col_name):
                print(f"  Adding column tutorials.{col_name} ...")
                conn.execute(text(f"ALTER TABLE tutorials ADD COLUMN {col_name} {col_def}"))
            else:
                print(f"  Column tutorials.{col_name} already exists — skipping.")

        # ----------------------------------------------------------------
        # Migrate old enum keys → friendly display names
        # PostgreSQL stores the enum value as the member name (e.g. "industrial")
        # ----------------------------------------------------------------
        ENUM_MAP = {
            "fire_system":    "Fire Systems",
            "lights_system":  "Lighting Systems",
            "dali_system":    "DALI & Controls",
            "smart_home":     "Smart Homes / IoT",
            "access_system":  "Access & Security",
            "industrial":     "Industrial & Motor Control",
            "distribution":   "Panels & Distribution",
            "ev_charging":    "EV Charging Infrastructure",
            "renewables":     "Solar & Renewables",
            "data_comms":     "Data & Networking",
            "safety_code":    "Safety & Regulatory Code",
            "tools_equip":    "Tool & Equipment Manuals",
        }
        for key, label in ENUM_MAP.items():
            conn.execute(
                text("UPDATE tutorials SET category = :label WHERE category = :key"),
                {"label": label, "key": key},
            )
        print("  Migrated old enum keys to display strings.")

        # ----------------------------------------------------------------
        # Drop the old PostgreSQL ENUM TYPE (if it still exists)
        # We do this AFTER the column is converted to TEXT
        # ----------------------------------------------------------------
        enum_exists = conn.execute(
            text("SELECT COUNT(*) FROM pg_type WHERE typname = 'tutorialcategory'")
        ).scalar()
        if enum_exists:
            print("  Dropping old PostgreSQL ENUM type 'tutorialcategory' ...")
            conn.execute(text("DROP TYPE IF EXISTS tutorialcategory"))
            print("  Done.")

        # ----------------------------------------------------------------
        # Create tutorial_folders entries for each distinct category
        # ----------------------------------------------------------------
        rows = conn.execute(
            text(
                "SELECT DISTINCT category FROM tutorials "
                "WHERE category IS NOT NULL AND folder_id IS NULL"
            )
        ).fetchall()

        for (cat_name,) in rows:
            existing = conn.execute(
                text(
                    "SELECT id FROM tutorial_folders "
                    "WHERE name = :n AND (is_global = TRUE OR tenant_id IS NULL)"
                ),
                {"n": cat_name},
            ).fetchone()
            if existing:
                folder_id = existing[0]
                print(f"  Folder '{cat_name}' already exists (id={folder_id}).")
            else:
                result = conn.execute(
                    text(
                        "INSERT INTO tutorial_folders (name, is_global, sort_order, created_at) "
                        "VALUES (:n, TRUE, 0, NOW()) RETURNING id"
                    ),
                    {"n": cat_name},
                )
                folder_id = result.scalar()
                print(f"  Created folder: '{cat_name}' (id={folder_id})")

            conn.execute(
                text(
                    "UPDATE tutorials SET folder_id = :fid "
                    "WHERE category = :cat AND folder_id IS NULL"
                ),
                {"fid": folder_id, "cat": cat_name},
            )

        # ----------------------------------------------------------------
        # Any remaining orphaned tutorials → 'Uncategorized'
        # ----------------------------------------------------------------
        orphans = conn.execute(
            text("SELECT COUNT(*) FROM tutorials WHERE folder_id IS NULL")
        ).scalar()
        if orphans > 0:
            unc = conn.execute(
                text("SELECT id FROM tutorial_folders WHERE name = 'Uncategorized'")
            ).fetchone()
            if unc:
                unc_id = unc[0]
            else:
                result = conn.execute(
                    text(
                        "INSERT INTO tutorial_folders (name, is_global, sort_order, created_at) "
                        "VALUES ('Uncategorized', TRUE, 99, NOW()) RETURNING id"
                    )
                )
                unc_id = result.scalar()
                print(f"  Created 'Uncategorized' folder (id={unc_id})")
            conn.execute(
                text(
                    "UPDATE tutorials SET folder_id = :fid, category = 'Uncategorized' "
                    "WHERE folder_id IS NULL"
                ),
                {"fid": unc_id},
            )
            print(f"  Moved {orphans} orphaned tutorials to 'Uncategorized'.")

    print("\n[OK] Migration complete.")


if __name__ == "__main__":
    migrate()
