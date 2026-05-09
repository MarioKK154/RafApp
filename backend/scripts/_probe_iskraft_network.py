"""Log JSON/XHR URLs while loading Iskraft category page."""
from playwright.sync_api import sync_playwright

URL = "https://www.iskraft.is/strengir/"
urls = []


def handle_response(response):
    u = response.url
    ct = (response.headers.get("content-type") or "").lower()
    if "json" in ct or "graphql" in u.lower() or "/api/" in u.lower():
        urls.append((response.status, u))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("response", handle_response)
    page.goto(URL, wait_until="networkidle", timeout=90000)
    page.wait_for_timeout(5000)
    for _ in range(5):
        page.mouse.wheel(0, 2000)
        page.wait_for_timeout(1500)
    browser.close()

for st, u in urls:
    print(st, u)
