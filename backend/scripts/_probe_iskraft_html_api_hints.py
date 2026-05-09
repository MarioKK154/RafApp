"""Fetch Iskraft HTML and print API-related hints."""
import re
import sys

import requests

URL = "https://www.iskraft.is/strengir/"
r = requests.get(URL, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
print("status", r.status_code, "len", len(r.text))
text = r.text
for pat in ["husa.is", "webapi", "graphql", "api."]:
    print(pat, text.lower().count(pat))
m = re.search(r"__NEXT_DATA__[^>]*>([^<]+)<", text)
if m:
    print("NEXT_DATA bytes", len(m.group(1)))
for s in re.findall(r'src="([^"]+)"', text)[:20]:
    print("src", s[:120])
