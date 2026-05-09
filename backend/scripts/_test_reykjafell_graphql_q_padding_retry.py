import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

def fetch(q: str) -> int:
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
    edges = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    return len(edges)


def main() -> None:
    base = "305330"
    candidates = [base, base.zfill(7), base.zfill(8), "0" + base]
    for q in candidates:
        try:
            cnt = fetch(q)
        except Exception as e:
            print("q", q, "error", e)
            continue
        print("q", q, "edges", cnt)


if __name__ == "__main__":
    main()

