import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

QUERY = """
query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {
  products(input: $input, first: $first, after: $after) {
    edges { node { id title categories } }
    pageInfo { hasNextPage endCursor count }
  }
}
"""

PARENT_ID = "5e7c7cc4591c2618f07afee0"
SUB_ID = "67238e890e40019fe52cf15c"

headers = {
    "Content-Type": "application/json",
    "Origin": "https://www.reykjafell.is",
    "Referer": "https://www.reykjafell.is/",
}

for label, cats in [
    ("sub only", [SUB_ID]),
    ("parent+sub", [PARENT_ID, SUB_ID]),
    ("parent only", [PARENT_ID]),
    ("names", ["Fjarskiptabúnaður", "Dyrasímar"]),
    ("q dyra", None),
    ("single cat name", ["Fjarskiptabúnaður"]),
]:
    if cats is None:
        inp = {"categories": [], "hideBackorderProducts": False, "q": "Dyrasímar"}
    else:
        inp = {"categories": cats, "hideBackorderProducts": False}
    payload = {
        "operationName": "allProducts",
        "variables": {
            "input": inp,
            "first": 200,
        },
        "query": QUERY,
    }
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=120)
    data = r.json()
    edges = (data.get("data") or {}).get("products", {}).get("edges") or []
    pi = (data.get("data") or {}).get("products", {}).get("pageInfo") or {}
    print(label, "edges", len(edges), "count", pi.get("count"), "errors", data.get("errors"))
