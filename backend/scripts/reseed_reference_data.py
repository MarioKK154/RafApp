"""
Repopulate reference data after a fresh database:

1. Tenant id=1 (required for global labor catalog rows)
2. Risk library templates (English + Icelandic) and optional tutorials
3. Labor catalog from bundled ar.is-style CSV (same format as POST /labor-catalog/import-ar-is)

Usage (from backend/):

    python -m scripts.reseed_reference_data
    python -m scripts.reseed_reference_data --no-labor
    python -m scripts.reseed_reference_data --labor-csv C:\\path\\to\\export.csv
    python -m scripts.reseed_reference_data --with-tutorials

CSV default: <repo>/scripts/labor_cost_export.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

from sqlalchemy import text

from app import crud, models
from app.database import SessionLocal, engine

from scripts.seed_risk_templates_and_tutorials import ensure_risk_templates, ensure_tutorials


def _repo_root() -> Path:
    # backend/scripts/this.py -> parents[2] = RafApp
    return Path(__file__).resolve().parent.parent.parent


def _default_labor_csv() -> Path:
    p = _repo_root() / "scripts" / "labor_cost_export.csv"
    return p


def ensure_tenant_id_one_for_global_labor(db) -> None:
    """Global catalog items use tenant_id=1; create placeholder tenant if missing."""
    existing = db.query(models.Tenant).filter(models.Tenant.id == 1).first()
    if existing:
        return
    db.add(
        models.Tenant(
            id=1,
            name="Innri kerfi (sameiginlegur verðlisti)",
            is_active=True,
        )
    )
    db.commit()
    if engine.dialect.name == "postgresql":
        try:
            db.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('tenants', 'id'), "
                    "(SELECT COALESCE(MAX(id), 1) FROM tenants))"
                )
            )
            db.commit()
        except Exception:
            db.rollback()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reseed risk library + labor catalog.")
    parser.add_argument("--no-labor", action="store_true", help="Skip labor CSV import.")
    parser.add_argument(
        "--labor-csv",
        type=Path,
        default=None,
        help="Path to ar.is export CSV (default: repo scripts/labor_cost_export.csv).",
    )
    parser.add_argument(
        "--with-tutorials",
        action="store_true",
        help="Also run tutorial seed + PDF generation (can be slow).",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        ensure_tenant_id_one_for_global_labor(db)
        ensure_risk_templates(db)
        print("Risk templates: OK (EN + IS fields applied).")

        if args.with_tutorials:
            ensure_tutorials(db)
            print("Tutorials: OK.")

        if not args.no_labor:
            csv_path = args.labor_csv or _default_labor_csv()
            if not csv_path.is_file():
                print(f"Labor CSV not found: {csv_path} — skip labor import.")
            else:
                text_csv = csv_path.read_text(encoding="utf-8")
                result = crud.import_labor_catalog_from_ar_is_csv(
                    db,
                    csv_content=text_csv,
                    tenant_id=None,
                    skip_duplicates=True,
                    global_only=True,
                )
                print(
                    f"Labor import: created={result.get('created')} "
                    f"variants_added={result.get('variants_added')} "
                    f"errors={result.get('error_count')}"
                )
                if result.get("errors"):
                    for line in result["errors"][:10]:
                        print(f"  {line}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
