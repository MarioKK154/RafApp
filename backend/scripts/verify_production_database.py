#!/usr/bin/env python3
"""
Check PostgreSQL connectivity and that Alembic has been applied.

Run from the backend directory:
  python scripts/verify_production_database.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(ROOT / ".env", override=True)


def main() -> int:
    url = (os.getenv("DATABASE_URL") or "").strip()
    if not url:
        print("DATABASE_URL is missing in backend/.env", file=sys.stderr)
        return 2
    if url.startswith("sqlite"):
        print("SQLite is fine for local dev; use PostgreSQL before production hosting.")
        return 0

    try:
        engine = create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("connection: OK")
    except Exception as e:
        print(f"connection: FAILED — {e}", file=sys.stderr)
        return 1

    try:
        with engine.connect() as conn:
            row = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
        if row and row[0]:
            print(f"alembic_version: {row[0]}")
        else:
            print("alembic_version: no revision — run: alembic upgrade head", file=sys.stderr)
            return 1
    except Exception as e:
        print(
            "alembic_version: table missing — run from backend/: alembic upgrade head\n"
            f"  ({e})",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
