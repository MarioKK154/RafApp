import json
import re

import requests

PRODUCT_PATH_RE = re.compile(r"/vorur/[0-9a-f]{20,}-[^\"\\s<]+", re.I)

url = "https://www.reykjafell.is/vorur?category=Fjarskiptab%C3%BAna%C3%B0ur&subcategory=Dyras%C3%ADmar"
r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=60)
text = r.text
paths = set(PRODUCT_PATH_RE.findall(text))
print("product paths in raw html", len(paths))
m = re.search(
    r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
    text,
    re.DOTALL | re.I,
)
print("status", r.status_code, "next", bool(m))
if not m:
    raise SystemExit(1)
data = json.loads(m.group(1))
print("query", data.get("query"))
# Print shallow keys
print("top keys", list(data.keys())[:20])
props = data.get("props", {}).get("pageProps", {})
cats = props.get("categories")


def walk_cat(node, depth=0):
    if isinstance(node, dict) and node.get("__typename") == "Category":
        nm = node.get("name") or ""
        cid = node.get("id")
        if "Fjarskipta" in nm or "dyras" in nm.lower():
            print(" " * depth, cid, nm)
        for ch in node.get("categories") or []:
            walk_cat(ch, depth + 1)
    elif isinstance(node, list):
        for x in node:
            walk_cat(x, depth)


if isinstance(cats, list):
    for c in cats:
        walk_cat(c)
prods = props.get("products") or {}
print("products keys", list(prods.keys()) if isinstance(prods, dict) else "")
slices = prods.get("slices") or []
print("slices count", len(slices))
total_items = 0
for i, sl in enumerate(slices):
    if not isinstance(sl, dict):
        continue
    items = sl.get("items") or []
    total_items += len(items)
    if i < 2 and items:
        it0 = items[0]
        print("slice", i, "type", sl.get("type"), "items", len(items), "first keys", list(it0.keys())[:15])
print("total items in slices", total_items)
