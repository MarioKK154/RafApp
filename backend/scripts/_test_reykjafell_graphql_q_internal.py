import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

q = "305330"

query = (
    "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
    "  products(input: $input, first: $first, after: $after) {"
    "    edges { node { id title } }"
    "  }"
    "}"
)

def try_internal(val):
    payload = {
        "operationName": "allProducts",
        "variables": {"input": {"categories": [], "hideBackorderProducts": False, "q": q, "internal": val}, "first": 1},
        "query": query,
    }
    headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    r.raise_for_status()
    edges = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    node = edges[0].get("node") if edges else None
    return node


def main() -> None:
    for val in ["true", "True", "1", "0", "internal", "public", "", None]:
        try:
            if val is None:
                continue
            node = try_internal(val)
            print("internal=", val, "node", "FOUND" if node else "NONE", "id", node.get("id") if node else None)
        except Exception as e:
            print("internal=", val, "error", e)

    # also try without internal for control
    payload = {
        "operationName": "allProducts",
        "variables": {"input": {"categories": [], "hideBackorderProducts": False, "q": q}, "first": 1},
        "query": query,
    }
    headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    r.raise_for_status()
    edges = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    node = edges[0].get("node") if edges else None
    print("no internal node", "FOUND" if node else "NONE", "id", node.get("id") if node else None)


if __name__ == "__main__":
    main()

