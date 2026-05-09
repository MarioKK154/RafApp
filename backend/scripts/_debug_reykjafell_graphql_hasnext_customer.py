from __future__ import annotations

import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

def fetch(after=None, first=200, customer: str | None = None):
    query = (
        "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
        "  products(input: $input, first: $first, after: $after) {"
        "    edges { node { id variants { sku } } }"
        "    pageInfo { hasNextPage endCursor }"
        "  }"
        "}"
    )
    variables = {"input": {"categories": [], "hideBackorderProducts": False}, "first": first}
    if after:
        variables["after"] = after
    payload = {"operationName": "allProducts", "variables": variables, "query": query}
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://www.reykjafell.is",
        "Referer": "https://www.reykjafell.is/",
    }
    if customer:
        headers["Customer"] = customer
    resp = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    target = "305330"  # one missing q we saw
    # also check known present:
    target_present = "205510"

    for customer in [None, "529"]:
        after = None
        found = {target: False, target_present: False}
        page = 0
        while True:
            page += 1
            data = fetch(after=after, first=200, customer=customer)
            products = data.get("data", {}).get("products", {}) or {}
            edges = products.get("edges") or []
            page_info = products.get("pageInfo") or {}
            for edge in edges:
                node = edge.get("node") or {}
                for v in node.get("variants") or []:
                    sku = str(v.get("sku") or "").strip()
                    if not sku:
                        continue
                    norm = sku.lstrip("0") or "0"
                    if norm == target:
                        found[target] = True
                    if norm == target_present:
                        found[target_present] = True
            has_next = bool(page_info.get("hasNextPage"))
            after = page_info.get("endCursor")
            print(f"customer={customer} page={page} edges={len(edges)} has_next={has_next} found={found}")
            if not has_next or not after:
                break
        print("FINAL customer", customer, "found", found)


if __name__ == "__main__":
    main()

