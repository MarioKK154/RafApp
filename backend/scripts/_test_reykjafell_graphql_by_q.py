import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

qs = ["205510", "0205510", "7006757", "07006757"]

query = (
    "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
    "  products(input: $input, first: $first, after: $after) {"
    "    edges {"
    "      node {"
    "        id"
    "        title"
    "        variants { sku vendorItemNo }"
    "      }"
    "    }"
    "    pageInfo { hasNextPage endCursor }"
    "  }"
    "}"
)

headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
for q in qs:
    payload = {
        "operationName": "allProducts",
        "variables": {"input": {"categories": [], "hideBackorderProducts": False, "q": q}, "first": 1},
        "query": query,
    }
    resp = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    print("q", q, "status", resp.status_code)
    data = resp.json()
    edges = data.get("data", {}).get("products", {}).get("edges", []) or []
    print("  edges", len(edges))
    if edges:
        node = edges[0]["node"]
        print("  id", node.get("id"))
        print("  title", node.get("title"))

