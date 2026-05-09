import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

q_base = "305330"

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
    data = r.json().get("data", {}).get("products", {}) or {}
    edges = data.get("edges", []) or []
    # count only non-null nodes
    return sum(1 for e in edges if e.get("node"))


def main() -> None:
    uniq = set()
    candidates = [q_base]
    # left padding to various lengths
    for L in range(4, 15):
        if len(q_base) <= L:
            candidates.append(q_base.zfill(L))
    # also try trailing zero variations
    for k in range(0, 4):
        candidates.append(q_base + ("0" * k))
        for L in range(4, 15):
            if len(q_base) + k <= L:
                candidates.append((q_base + ("0" * k)).zfill(L))

    for q in sorted(set(candidates), key=lambda s: (len(s), s)):
        if q in uniq:
            continue
        uniq.add(q)
        try:
            cnt = edges_for(q)
        except Exception as e:
            print("q", q, "error", e)
            continue
        if cnt:
            print("FOUND q=", q, "edges(with node)=", cnt)


if __name__ == "__main__":
    main()

