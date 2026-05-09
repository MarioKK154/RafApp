import re
import requests
from app.database import SessionLocal
from app import models


GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

def extract_q(url: str | None) -> str | None:
    if not url:
        return None
    m = re.search(r"[?&]q=([0-9]+)", url)
    return m.group(1) if m else None


def main() -> None:
    session_db = SessionLocal()
    try:
        # Find a known entry from your DB (HERPI�DRAG ... 1,6/0,8)
        it = (
            session_db.query(models.InventoryItem)
            .filter(models.InventoryItem.shop_url_3 != None)  # noqa: E711
            .filter(models.InventoryItem.shop_url_3.like("%/vorur?q=%"))  # noqa: E711
            .filter(models.InventoryItem.name.ilike("HERPI%DRAG 1,6/0,8%"))
            .first()
        )
        if not it:
            print("Could not find matching DB item for HERPI 1,6/0,8")
            return
        q = extract_q(it.shop_url_3)
        print("DB item name:", it.name)
        print("DB shop_url_3:", it.shop_url_3)
        print("DB q param:", q)
    finally:
        session_db.close()

    query = (
        "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
        "  products(input: $input, first: $first, after: $after) {"
        "    edges {"
        "      node {"
        "        id"
        "        title"
        "        variants { vendorItemNo sku }"
        "      }"
        "    }"
        "    pageInfo { hasNextPage endCursor }"
        "  }"
        "}"
    )

    payload = {
        "operationName": "allProducts",
        "variables": {"input": {"categories": [], "hideBackorderProducts": False}, "first": 200},
        "query": query,
    }
    headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
    resp = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    edges = data["data"]["products"]["edges"]

    # Title encoding can vary (mojibake), so match more loosely.
    rx = re.compile(r"HERPI.*DRAG.*1,6/0,8", flags=re.IGNORECASE)
    for edge in edges:
        node = edge.get("node") or {}
        title = node.get("title") or ""
        if rx.search(title):
            print("GraphQL matching node title:", title)
            print("GraphQL id:", node.get("id"))
            print("GraphQL variants (vendorItemNo, sku):")
            for v in node.get("variants") or []:
                print("  ", v)
            break
    else:
        print("Did not find matching GraphQL node title in first 200 results.")


if __name__ == "__main__":
    main()

