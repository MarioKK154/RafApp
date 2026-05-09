"""
Fill inventory_items.name_en and description_en using the OpenAI API (batch JSON).

Requires OPENAI_API_KEY in the environment (e.g. backend/.env via python-dotenv).

Run from backend/:
  cd backend
  python scripts/translate_inventory_to_english.py --dry-run
  python scripts/translate_inventory_to_english.py --batch-size 12 --sleep 1.2
  python scripts/translate_inventory_to_english.py --force --limit 50

Optional: OPENAI_BASE_URL (e.g. Azure OpenAI), OPENAI_MODEL (default gpt-4o-mini).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

load_dotenv(BACKEND_DIR / ".env")


def _extract_json_object(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)
    return json.loads(raw)


def needs_translation(item, force: bool) -> bool:
    name = (item.name or "").strip()
    if not name:
        return False
    if force:
        return True
    if not (item.name_en or "").strip():
        return True
    desc = (item.description or "").strip()
    if desc and not (item.description_en or "").strip():
        return True
    return False


def call_openai_batch(
    items: list,
    *,
    api_key: str,
    base_url: str,
    model: str,
    timeout: int = 120,
) -> list[dict]:
    payload_items = [
        {"id": it.id, "name": (it.name or "").strip(), "description": (it.description or "").strip()}
        for it in items
    ]
    system = (
        "You translate electrical wholesale / construction product catalog entries from Icelandic "
        "or Nordic supplier text into clear, concise English. Preserve exactly: numeric SKUs, "
        "model codes, dimensions (mm, mm², kV, A), units (m, pcs, kg), voltage markers, and brand names. "
        "Do not add marketing language. Return ONLY valid JSON with shape "
        '{"results":[{"id":<int>,"name_en":<string>,"description_en":<string|null>}]} '
        "with the same ids as input, in any order. Use null for description_en when description was empty."
    )
    user = json.dumps({"items": payload_items}, ensure_ascii=False)
    url = base_url.rstrip("/") + "/chat/completions"
    r = requests.post(
        url,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=timeout,
    )
    r.raise_for_status()
    data = r.json()
    content = (data["choices"][0]["message"]["content"] or "").strip()
    parsed = _extract_json_object(content)
    results = parsed.get("results")
    if not isinstance(results, list):
        raise ValueError("API response missing results array")
    return results


def apply_results(session, items_by_id: dict[int, object], results: list[dict], *, no_commit: bool) -> int:
    updated = 0
    seen_ids = set(items_by_id.keys())
    for row in results:
        if not isinstance(row, dict):
            continue
        rid = row.get("id")
        if rid not in seen_ids:
            continue
        name_en = row.get("name_en")
        desc_en = row.get("description_en")
        if name_en is not None and not isinstance(name_en, str):
            continue
        if desc_en is not None and not isinstance(desc_en, str):
            continue
        obj = items_by_id[rid]
        if "name_en" in row:
            obj.name_en = (name_en.strip() or None) if isinstance(name_en, str) else None
        if "description_en" in row:
            obj.description_en = (desc_en.strip() or None) if isinstance(desc_en, str) else None
        updated += 1
    if dry_run:
        session.rollback()
    else:
        session.commit()
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Translate inventory names/descriptions to English via OpenAI.")
    parser.add_argument("--batch-size", type=int, default=10, help="Items per API call")
    parser.add_argument("--sleep", type=float, default=1.0, help="Seconds between API calls")
    parser.add_argument("--limit", type=int, default=0, help="Max items to translate (0 = no limit)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only count rows needing translation; do not call the API or change the DB",
    )
    parser.add_argument(
        "--no-commit",
        action="store_true",
        help="Call the API and apply to the session but rollback (smoke test)",
    )
    parser.add_argument("--force", action="store_true", help="Re-translate even if English fields exist")
    parser.add_argument("--model", default=os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    args = parser.parse_args()

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key and not args.dry_run:
        print("Set OPENAI_API_KEY in .env (or environment).", file=sys.stderr)
        return 1
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()

    from app.database import SessionLocal
    from app import models

    session = SessionLocal()
    pending: list = []
    try:
        last_id = 0
        while True:
            chunk = (
                session.query(models.InventoryItem)
                .filter(models.InventoryItem.id > last_id)
                .order_by(models.InventoryItem.id)
                .limit(400)
                .all()
            )
            if not chunk:
                break
            last_id = chunk[-1].id
            for it in chunk:
                if needs_translation(it, args.force):
                    pending.append(it)
                    if args.limit and len(pending) >= args.limit:
                        break
            if args.limit and len(pending) >= args.limit:
                break
    finally:
        session.close()

    if not pending:
        print("Nothing to translate (or DB empty).")
        return 0

    print(f"Pending translations: {len(pending)} (force={args.force})")

    if args.dry_run:
        print("Dry-run complete (--dry-run: no API calls).")
        return 0

    total_updated = 0
    batch_size = max(1, args.batch_size)
    for i in range(0, len(pending), batch_size):
        batch = pending[i : i + batch_size]
        items_by_id = {it.id: it for it in batch}
        try:
            results = call_openai_batch(
                batch,
                api_key=api_key,
                base_url=base_url,
                model=args.model,
            )
        except (requests.RequestException, ValueError, KeyError, json.JSONDecodeError) as e:
            print(f"Batch failed at offset {i}: {e}", file=sys.stderr)
            # Retry singles
            for it in batch:
                try:
                    results = call_openai_batch(
                        [it],
                        api_key=api_key,
                        base_url=base_url,
                        model=args.model,
                    )
                    s2 = SessionLocal()
                    try:
                        fresh = s2.get(models.InventoryItem, it.id)
                        if fresh:
                            u = apply_results(
                                s2,
                                {fresh.id: fresh},
                                results,
                                no_commit=args.no_commit,
                            )
                            total_updated += u
                            print(f"  id={it.id} ok (single retry) updated_fields={u}")
                    finally:
                        s2.close()
                except Exception as e2:
                    print(f"  id={it.id} FAILED: {e2}", file=sys.stderr)
            time.sleep(args.sleep)
            continue

        s = SessionLocal()
        try:
            fresh_batch = [s.get(models.InventoryItem, x.id) for x in batch]
            fresh_by_id = {x.id: x for x in fresh_batch if x is not None}
            u = apply_results(s, fresh_by_id, results, no_commit=args.no_commit)
            total_updated += u
        finally:
            s.close()

        done = min(i + batch_size, len(pending))
        print(f"Progress {done}/{len(pending)} (last batch updated {u} rows) no_commit={args.no_commit}")
        time.sleep(args.sleep)

    print(f"Done. Rows touched (name_en and/or description_en): {total_updated} no_commit={args.no_commit}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
