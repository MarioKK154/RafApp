import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

def edges_for(payload_input: dict) -> int:
    query = (
        "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
        "  products(input: $input, first: $first, after: $after) {"
        "    edges { node { id } }"
        "    pageInfo { hasNextPage endCursor }"
        "  }"
        "}"
    )
    payload = {"operationName": "allProducts", "variables": {"input": payload_input, "first": 1}, "query": query}
    headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    r.raise_for_status()
    edges = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    return len(edges)

def first_id_for(payload_input: dict) -> str | None:
    query = (
        "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
        "  products(input: $input, first: $first, after: $after) {"
        "    edges { node { id } }"
        "  }"
        "}"
    )
    payload = {"operationName": "allProducts", "variables": {"input": payload_input, "first": 1}, "query": query}
    headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    r.raise_for_status()
    edges = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    if not edges:
        return None
    node = edges[0].get("node") or {}
    return node.get("id")


def main() -> None:
    tests = ["305330", "909300", "1301322"]
    for t in tests:
        print("\\nTEST t=", t)
        print("q field edges:", edges_for({"categories": [], "hideBackorderProducts": False, "q": t}))
        print("keywords edges:", edges_for({"categories": [], "hideBackorderProducts": False, "keywords": [t]}))
        ids_input={"categories": [], "hideBackorderProducts": False, "ids": [t]}
        print("ids edges:", edges_for(ids_input))
        print("ids first node.id:", first_id_for(ids_input))


if __name__ == "__main__":
    main()

