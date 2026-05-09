"""One-off probe: find product URL patterns on iskraft.is (run manually)."""
import re
import sys

import requests

URL = "https://www.iskraft.is/strengir/"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RafApp-probe"}


def main() -> None:
    r = requests.get(URL, timeout=30, headers=UA)
    print("status", r.status_code, "len", len(r.text))
    hrefs = re.findall(r'href="([^"]+)"', r.text)
    prod = [h for h in hrefs if any(x in h.lower() for x in ("vara", "vorur", "product", "vöru"))]
    seen = []
    for h in prod:
        if h not in seen:
            seen.append(h)
    for h in seen[:40]:
        print(h)


if __name__ == "__main__":
    main()
