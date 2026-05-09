import re
import requests


def main() -> None:
    url = "https://www.reykjafell.is/vorur?q=7006757"
    html = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"}).text

    # Match href="/vorur/<something>" where <something> is not empty and doesn't include quotes.
    links = re.findall(r'href=["\'](/vorur/[^"\']+)["\']', html)
    print("found", len(links), "links")
    # show first 30 unique
    seen = set()
    uniq = []
    for l in links:
        if l not in seen:
            uniq.append(l)
            seen.add(l)
        if len(uniq) >= 30:
            break
    print("first uniq:", uniq[:30])

    # Try to find any realistic product URL path with hex-ish ids
    hex_links = re.findall(r'href=["\'](/vorur/[0-9a-fA-F]{6,}[^"\']*)["\']', html)
    print("hex links found:", len(hex_links))
    if hex_links:
        seen2 = set()
        uniq2 = []
        for l in hex_links:
            if l not in seen2:
                uniq2.append(l)
                seen2.add(l)
            if len(uniq2) >= 10:
                break
        print("first hex uniq:", uniq2)

    # Inspect if Next.js payload exists
    m = re.search(r'id=["\']__NEXT_DATA__["\']\\s+type=["\']application/json["\']\\s*>(.*?)</script>', html, flags=re.DOTALL)
    print("has __NEXT_DATA__:", bool(m))
    print("__NEXT_DATA__ len:", len(m.group(1)) if m else 0)


if __name__ == "__main__":
    main()

