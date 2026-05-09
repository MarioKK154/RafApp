"""One-off probe: print link paths from an Iskraft husa.is listing page."""
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

import sys

URL = sys.argv[1] if len(sys.argv) > 1 else (
    "https://iskraft.husa.is/afldreifibunadur/dreifiskapar-og-vinnutoflur/dreifiskapar/"
)

with sync_playwright() as p:
    br = p.chromium.launch(headless=True)
    pg = br.new_page()
    pg.goto(URL, wait_until="networkidle", timeout=120000)
    pg.wait_for_timeout(4000)
    for _ in range(8):
        pg.mouse.wheel(0, 3000)
        pg.wait_for_timeout(500)
    hrefs = pg.eval_on_selector_all(
        "a[href]",
        """els => els.map(e => e.getAttribute('href')).filter(Boolean)""",
    )
    br.close()

seen: set[str] = set()
for h in hrefs:
    u = h if h.startswith("http") else f"https://iskraft.husa.is{h}"
    pr = urlparse(u)
    if "iskraft.husa.is" in pr.netloc.lower() and len(pr.path) > 3:
        seen.add(pr.path)

for x in sorted(seen)[:40]:
    print(x)
print("total unique paths", len(seen))
