import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

qs = ["305330", "909300", "1301322", "1301328"]

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
    headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    r.raise_for_status()
    edges = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    return len(edges)


def main() -> None:
    for q in qs:
        candidates = [q]
        if q.isdigit():
            candidates.append(q.zfill(7))
            candidates.append(q.zfill(8))
            candidates.append("0" + q)
        # dedupe
        seen = set()
        uniq = []
        for c in candidates:
            if c in seen:
                continue
            uniq.append(c)
            seen.add(c)
        print("\\nq=", q)
        for c in uniq:
            try:
                cnt = edges_for(c)
                print("  candidate", c, "edges", cnt)
            except Exception as e:
                print("  candidate", c, "error", e)


if __name__ == "__main__":
    main()

