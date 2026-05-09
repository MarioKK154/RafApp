import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

TARGET_NUM = "205510"

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
    "variables": {"input": {"categories": [], "hideBackorderProducts": False}, "first": 50},
    "query": query,
}

headers = {
    "Content-Type": "application/json",
    "Origin": "https://www.reykjafell.is",
    "Referer": "https://www.reykjafell.is/",
}

resp = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
print("status", resp.status_code)
data = resp.json()
edges = data["data"]["products"]["edges"]

hit = 0
for edge in edges:
    node = edge["node"] or {}
    for v in node.get("variants") or []:
        if str(v.get("sku") or "").strip() == TARGET_NUM or str(v.get("vendorItemNo") or "").strip() == TARGET_NUM:
            hit += 1
            print("HIT node title:", node.get("title"))
            print("  id:", node.get("id"))
            print("  variant:", v)

print("hits:", hit)

