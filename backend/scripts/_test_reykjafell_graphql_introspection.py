import requests

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

query = """
query Introspect {
  __schema {
    queryType { name }
    types {
      name
    }
  }
}
"""

payload = {"operationName": "Introspect", "query": query, "variables": {}}
headers = {"Content-Type": "application/json", "Origin": "https://www.reykjafell.is", "Referer": "https://www.reykjafell.is/"}
resp = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=60)
print("status", resp.status_code)
print(resp.text[:300])

