import requests


graphql_url = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

# Same token already present in scrape_suppliers_to_csv.py
AUTH = (
    "eyJhbGciOiJSUzI1NiIsImtpZCI6IjJjMjdhZmY1YzlkNGU1MzVkNWRjMmMwNWM1YTE2N2FlMmY1NjgxYzIiLCJ0eXAiOiJKV1QifQ."
    "eyJuYW1lIjoiTWFyaW8gS2xhcmljIEt1a3V6IiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3JleWtqYWZlbGwtNGY4NjEiLCJhdWQiOiJyZXlramFmZWxsLTRmODYxIiwiYXV0aF90aW1lIjoxNzcyNDU3Njg3LCJ1c2VyX2lkIjoiZGN0OUZlQUJSaWhDNXV3QkphNjZPakl0WXlGMyIsInN1YiI6ImRjdDlGZUFCUmloQzV1d0JKYTY2T2pJdFl5RjMiLCJpYXQiOjE3NzI0NTc2ODcsImV4cCI6MTc3MjQ2MTI4NywiZW1haWwiOiJtYXJpb0B0ZW5naWxsZWhmLmlzIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsibWFyaW9AdGVuZ2lsbGVoZi5pcyJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19."
    "Hru48eqslxD1Yj0ol3_rF_eGNYuQzRvnSrncDdi11BbeQkgKn9zD6F2GqIQ-Y6xeJLu8ptrMOn79WpdYlIm9QUCBV-Jf_dFfiF-Ce33PKN2KwwILsYMTM-_UIxscG2KlkXHPXbCOB1xlZ4_ll7z5LBReHTJesolQVdZPxcPL8zgigPhmDI03FwV6-LAlfrzncf0shLh8KT1fyBt332il5aio13KKbmHjiXD73OKR4w-bABbrSBiixEIckMzWyCuWdj6rVw-P01CqVI3ciX0bdV24-FKPcrAD294sQMTR25tBmWeo_Wivq4xxQfIb60dtzMVnedVJHEQ4Du9lQ2UOUg"
)

TARGET = "7006757"

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
    "variables": {"input": {"categories": [], "hideBackorderProducts": False}, "first": 200},
    "query": query,
}

headers = {
    "Content-Type": "application/json",
    "Origin": "https://www.reykjafell.is",
    "Referer": "https://www.reykjafell.is/",
    "Customer": "529",
    "Authorization": AUTH,
}

resp = requests.post(graphql_url, json=payload, headers=headers, timeout=40)
print("status", resp.status_code)
print(resp.text[:500])
data = resp.json()
edges = data.get("data", {}).get("products", {}).get("edges", []) or []
print("edges", len(edges))

found = []
for e in edges:
    node = e.get("node") or {}
    pid = node.get("id")
    for v in (node.get("variants") or []):
        if str(v.get("vendorItemNo")) == TARGET:
            found.append(pid)

print("found product ids for", TARGET, ":", found[:20])

