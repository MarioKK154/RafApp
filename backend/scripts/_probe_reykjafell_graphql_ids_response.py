import requests
import json

GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

t="305330"

query = (
    "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {"
    "  products(input: $input, first: $first, after: $after) {"
    "    edges {"
    "      node {"
    "        id"
    "        title"
    "        variants { sku vendorItemNo }"
    "      }"
    "    }"
    "    pageInfo { hasNextPage endCursor }"
    "  }"
    "}"
)

payload = {
    "operationName":"allProducts",
    "variables":{"input":{"categories":[],"hideBackorderProducts":False,"ids":[t]},"first":1},
    "query":query,
}
headers={"Content-Type":"application/json","Origin":"https://www.reykjafell.is","Referer":"https://www.reykjafell.is/"}
r=requests.post(GRAPHQL_URL,json=payload,headers=headers,timeout=40)
print("status",r.status_code)
data=r.json()
edges=data.get("data",{}).get("products",{}).get("edges",[]) or []
print('edges len',len(edges))
if edges:
    node=edges[0].get('node') or {}
    print('node keys',node.keys())
    print('node id',node.get('id'))
    print('node title',node.get('title'))
    print('variants sample', (node.get('variants') or [])[:3])
print(json.dumps(data,indent=2)[:2000])

