"""Inspect iskraft.husa.is HTML for embedded product JSON."""
import json
import re

import requests

URL = "https://iskraft.husa.is/strengir/"
r = requests.get(URL, timeout=40, headers={"User-Agent": "Mozilla/5.0"})
text = r.text
print("status", r.status_code, "len", len(text))

for needle in [
    "webapi",
    "product",
    "Product",
    "search",
    "__INITIAL",
    "window.",
    "umbraco",
    "graphql",
]:
    c = text.count(needle)
    if c:
        print("count", needle, c)

# React root + any JSON script tags
for m in re.finditer(r'<script[^>]*id="([^"]*)"[^>]*>([^<]{0,500})', text):
    print("script id", m.group(1), "preview", m.group(2)[:200])

# Large inline scripts
for m in re.finditer(r"<script[^>]*>(.{500,80000})</script>", text, re.DOTALL):
    chunk = m.group(1)
    if "product" in chunk.lower() or "webapi" in chunk.lower():
        print("--- large script snippet ---")
        for line in chunk.split("\n")[:30]:
            if any(x in line.lower() for x in ("webapi", "product", "search", "api")):
                print(line[:200])
