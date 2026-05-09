import re
import requests


def main() -> None:
    url = "https://www.reykjafell.is/vorur?q=7006757"
    html = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"}).text
    print("len(html):", len(html))

    needles = [
        "execute-api",
        "graphql",
        "Firebase",
        "Authorization",
        "vendorItemNo",
        "__NEXT_DATA__",
        "__NEXT_DATA__",
        "api/",
        "/graphql",
        "pageInfo",
        "endCursor",
    ]
    for n in needles:
        m = re.search(re.escape(n), html, flags=re.I)
        if m:
            print("FOUND:", n, "at", m.start())

    # collect hrefs
    links = re.findall(r'href=["\'](/vorur/[^"\']+)["\']', html)
    print("href /vorur/ count:", len(links))
    seen = []
    for l in links:
        if l not in seen:
            seen.append(l)
        if len(seen) >= 10:
            break
    print("first unique hrefs:", seen)

    # look for Next.js JSON blob
    m = re.search(r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', html, flags=re.DOTALL | re.I)
    print("__NEXT_DATA__ script found:", bool(m), "len:", len(m.group(1)) if m else 0)
    if m:
        blob = m.group(1)
        for n in ["vendorItemNo", "id", "vorur", "url", "product", "variants", "sku", "edges", "pageInfo"]:
            mm = re.search(re.escape(n), blob, flags=re.I)
            if mm:
                print("  blob contains:", n)
                break
        print("blob head:", blob[:300].replace("\n", " ")[:300])

    # hex id candidates in HTML
    hex_candidates = re.findall(r"/vorur/[0-9a-fA-F]{10,}[^\"'\s>]*", html)
    print("hex /vorur paths found:", len(hex_candidates))
    if hex_candidates:
        print("sample hex paths:", hex_candidates[:5])


if __name__ == "__main__":
    main()

