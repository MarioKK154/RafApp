import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

def edges(q: str, customer: str | None) -> int:
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
    if customer:
        headers["Customer"] = customer
    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=40)
    r.raise_for_status()
    edges = r.json().get("data", {}).get("products", {}).get("edges", []) or []
    return sum(1 for e in edges if e.get("node"))


def main() -> None:
    q_values = ["305330", "909300", "205510", "0205510", "7006757"]
    for customer in [None, "529"]:
        print("\ncustomer:", customer)
        for q in q_values:
            try:
                c = edges(q, customer)
                print("q", q, "edges(with node)", c)
            except Exception as e:
                print("q", q, "error", e)


if __name__ == "__main__":
    main()

