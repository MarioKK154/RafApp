import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

q_base = "305330"  # try prefixes

def edges_for(q: str) -> int:
    query = (
        "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
        "  products(input: $input, first: $first, after: $after) {"
        "    edges { node { id } }"
        "    pageInfo { hasNextPage endCursor }"
        "  }"
        "}"
    )
    payload = {
        "operationName": "allProducts",
        "variables": {"input": {"categories": [], "hideBackorderProducts": False, "q": q}, "first": 1},
        "query": query,
    }
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://www.reykjafell.is",
        "Referer": "https://www.reykjafell.is/",
    }
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    r.raise_for_status()
    data = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    return sum(1 for e in data if e.get("node"))


def main() -> None:
    for p in "0123456789":
        q = p + q_base
        cnt = edges_for(q)
        if cnt:
            print("FOUND:", q, "edges:", cnt)
        else:
            print("no:", q)


if __name__ == "__main__":
    main()

