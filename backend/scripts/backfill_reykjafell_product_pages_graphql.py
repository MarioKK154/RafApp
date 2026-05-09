from __future__ import annotations

import re
import time
from typing import Dict, Optional, Set

import requests
from requests import Session

from app.database import SessionLocal
from app import models


GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"
VORUR_SEARCH_RE = re.compile(r"[?&]q=([0-9]+)", re.IGNORECASE)


def _get_requested_vendor_numbers(db) -> Set[str]:
    """
    Extract vendor numbers from current `shop_url_3` search URLs:
      https://www.reykjafell.is/vorur?q={Nr}
    """
    items = (
        db.query(models.InventoryItem.shop_url_3)
        .filter(models.InventoryItem.shop_url_3 != None)  # noqa: E711
        .all()
    )
    requested: Set[str] = set()
    for (url,) in items:
        if not url:
            continue
        m = VORUR_SEARCH_RE.search(url)
        if m:
            requested.add(m.group(1))
    return requested


def _graphql_fetch_page(session: Session, after: Optional[str], first: int = 200) -> dict:
    query = (
        "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
        "  products(input: $input, first: $first, after: $after) {"
        "    edges {"
        "      node {"
        "        id"
        "        variants { sku vendorItemNo }"
        "      }"
        "    }"
        "    pageInfo { hasNextPage endCursor }"
        "  }"
        "}"
    )

    variables = {
        "input": {"categories": [], "hideBackorderProducts": False},
        "first": first,
    }
    if after:
        variables["after"] = after

    payload = {"operationName": "allProducts", "variables": variables, "query": query}
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://www.reykjafell.is",
        "Referer": "https://www.reykjafell.is/",
        # NOTE: No Authorization required (confirmed by smoke test).
    }

    resp = session.post(GRAPHQL_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()


def backfill_shop_url_3_to_product_pages(
    http: Session,
    db,
    delay_s: float = 0.05,
    first: int = 200,
    batch_commit: int = 200,
) -> None:
    requested = _get_requested_vendor_numbers(db)
    if not requested:
        print("No vendor numbers found in existing shop_url_3 search URLs. Nothing to do.")
        return

    print(f"Vendor numbers requested (from DB): {len(requested)}")

    remaining = set(requested)
    vendor_to_product_id: Dict[str, str] = {}

    after: Optional[str] = None
    page = 0
    while remaining:
        page += 1
        data = _graphql_fetch_page(http, after=after, first=first)

        products = (
            data.get("data", {}).get("products", {}) if isinstance(data, dict) else {}
        )
        edges = products.get("edges") or []
        page_info = products.get("pageInfo") or {}

        found_this_page = 0
        for edge in edges:
            node = edge.get("node") or {}
            prod_id = node.get("id")
            if not prod_id:
                continue

            for v in node.get("variants") or []:
                sku = str(v.get("sku") or "").strip()
                if not sku:
                    continue
                # GraphQL `sku` often has a leading zero (e.g. 0205510) while
                # your Excel / `q=` uses the stripped form (205510).
                vendor = sku.lstrip("0") or "0"
                if vendor in remaining:
                    vendor_to_product_id[vendor] = prod_id
                    remaining.remove(vendor)
                    found_this_page += 1
                    if not remaining:
                        break
            if not remaining:
                break

        has_next = bool(page_info.get("hasNextPage"))
        after = page_info.get("endCursor")

        print(
            f"GraphQL page {page}: edges={len(edges)} found={found_this_page} remaining={len(remaining)} has_next={has_next}"
        )
        if not has_next:
            break
        time.sleep(delay_s)

    if remaining:
        print(f"WARNING: Missing product IDs for {len(remaining)} vendor numbers.")

    # Update DB entries: replace `shop_url_3` search URLs with product-page URLs.
    items = db.query(models.InventoryItem).filter(
        models.InventoryItem.shop_url_3 != None  # noqa: E711
    ).all()

    updated = 0
    skipped_no_vendor = 0
    skipped_no_mapping = 0

    commit_counter = 0
    for item in items:
        if not item.shop_url_3:
            continue
        m = VORUR_SEARCH_RE.search(item.shop_url_3)
        if not m:
            skipped_no_vendor += 1
            continue

        vendor = m.group(1)
        prod_id = vendor_to_product_id.get(vendor)
        if not prod_id:
            skipped_no_mapping += 1
            continue

        new_url = f"https://www.reykjafell.is/vorur/{prod_id}"
        if item.shop_url_3 == new_url:
            continue

        item.shop_url_3 = new_url
        db.add(item)
        updated += 1
        commit_counter += 1

        if commit_counter >= batch_commit:
            db.commit()
            commit_counter = 0

    db.commit()

    print(
        "Update done.",
        f"updated={updated}",
        f"skipped_no_vendor={skipped_no_vendor}",
        f"skipped_no_mapping={skipped_no_mapping}",
    )


def main() -> None:
    db = SessionLocal()
    http = requests.Session()
    http.headers.update({"User-Agent": "Mozilla/5.0"})
    try:
        backfill_shop_url_3_to_product_pages(http=http, db=db)
    finally:
        http.close()
        db.close()


if __name__ == "__main__":
    main()

