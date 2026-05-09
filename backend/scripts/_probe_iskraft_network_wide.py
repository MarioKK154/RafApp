"""Log all response URLs touching iskraft / husa while browsing."""
from playwright.sync_api import sync_playwright

URL = "https://www.iskraft.is/strengir/"
seen = []


def handle_response(response):
    u = response.url
    low = u.lower()
    if "iskraft" in low or "husa.is" in low:
        ct = (response.headers.get("content-type") or "")[:80]
        seen.append((response.status, u, ct))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("response", handle_response)
    page.goto(URL, wait_until="networkidle", timeout=90000)
    page.wait_for_timeout(5000)
    for _ in range(8):
        page.mouse.wheel(0, 2500)
        page.wait_for_timeout(1200)
    browser.close()

for st, u, ct in seen:
    print(st, ct, u)
