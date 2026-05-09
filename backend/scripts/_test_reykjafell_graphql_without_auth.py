import requests

graphql_url = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

query = (
    "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
    "  products(input: $input, first: $first, after: $after) {"
    "    edges { node {"
    "      id"
    "      title"
    "      variants { vendorItemNo }"
    "    } }"
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
    # Customer header may be required; try minimal first.
}

resp = requests.post(graphql_url, json=payload, headers=headers, timeout=40)
print("status", resp.status_code)
try:
    print(resp.text[:500])
except Exception as e:
    print("read error", e)

