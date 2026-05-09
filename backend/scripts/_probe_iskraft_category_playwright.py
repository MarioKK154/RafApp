import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "https://www.iskraft.is/strengir/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(URL, wait_until="networkidle", timeout=90000)
    page.wait_for_timeout(8000)
    links = page.eval_on_selector_all(
        "a[href]",
        "els => els.map(e => e.getAttribute('href')).filter(Boolean)",
    )
    browser.close()

seen = []
for x in links:
    if x in seen:
        continue
    if re.search(r"/\d{3,}", x) or "voru" in x.lower() or "vara" in x.lower():
        seen.append(x)

print("interesting", len(seen))
for x in seen[:60]:
    print(x)

Path("_iskraft_strengir_links.txt").write_text("\n".join(seen), encoding="utf-8")
