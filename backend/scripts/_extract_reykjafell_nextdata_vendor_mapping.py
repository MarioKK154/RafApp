import json
import re
import requests


TARGET = "7006757"


def main() -> None:
    url = f"https://www.reykjafell.is/vorur?q={TARGET}"
    html = requests.get(url, timeout=25, headers={"User-Agent": "Mozilla/5.0"}).text

    m = re.search(r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', html, flags=re.DOTALL | re.I)
    if not m:
        print("no __NEXT_DATA__")
        return
    data = json.loads(m.group(1))

    matches = []

    def walk(node, path=""):
        if isinstance(node, dict):
            for k, v in node.items():
                new_path = f"{path}.{k}" if path else k
                # capture vendorItemNo-like fields
                if isinstance(k, str) and "vendor" in k.lower() and "item" in k.lower():
                    if isinstance(v, (str, int)) and str(v) == TARGET:
                        matches.append((new_path, v))
                walk(v, new_path)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]")
        else:
            # if leaf is string/number equal to target
            if isinstance(node, (str, int, float)) and str(node) == TARGET:
                matches.append((path, node))

    walk(data)

    print("matches count:", len(matches))
    print("first 30 matches:")
    for p, v in matches[:30]:
        print(" -", p, "=", v)

    # Search for /vorur/ strings too (if any)
    # (kept separate: earlier script returned 0)
    href_matches = []

    def walk_for_vorur(node):
        if isinstance(node, dict):
            for v in node.values():
                walk_for_vorur(v)
        elif isinstance(node, list):
            for v in node:
                walk_for_vorur(v)
        elif isinstance(node, str):
            if "/vorur/" in node:
                href_matches.append(node)

    walk_for_vorur(data)
    print("href_matches containing /vorur/:", len(href_matches))
    if href_matches:
        print("sample href_matches:", href_matches[:10])


if __name__ == "__main__":
    main()

