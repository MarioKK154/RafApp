"""Probe Iskraft search page with Playwright (JS-rendered)."""
import re
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from playwright.sync_api import sync_playwright


def main() -> None:
    q = sys.argv[1] if len(sys.argv) > 1 else "305330"
    url = f"https://www.iskraft.is/leit?q={q}"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(5000)
        # collect links visible in DOM
        links = page.eval_on_selector_all(
            "a[href]",
            "els => els.map(e => e.getAttribute('href')).filter(Boolean)",
        )
        prod = [x for x in links if "/vorur/" in x or "/vara/" in x or "vorur" in x.lower()]
        print("product-ish links", len(prod))
        for x in prod[:30]:
            print(" ", x)
        html = page.content()
        browser.close()
    Path(BACKEND_DIR / "_iskraft_leit_probe.html").write_text(html, encoding="utf-8")
    hrefs = re.findall(r'href="([^"]+)"', html)
    interesting = [h for h in hrefs if h.startswith("/") and len(h) < 120]
    print("saved", BACKEND_DIR / "_iskraft_leit_probe.html", "len", len(html))
    for h in interesting[:50]:
        print(h)


if __name__ == "__main__":
    main()
