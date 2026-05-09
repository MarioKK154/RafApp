import requests
import json

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

query = """
query IntrospectProductsFilter {
  __type(name: "ProductsFilterInput") {
    name
    inputFields {
      name
      type { kind name ofType { kind name ofType { kind name } } }
    }
  }
}
"""

payload = {"operationName": "IntrospectProductsFilter", "query": query, "variables": {}}
headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
resp = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=60)
print("status", resp.status_code)
data = resp.json().get("data", {}) or {}
print(json.dumps(data, indent=2)[:4000])

