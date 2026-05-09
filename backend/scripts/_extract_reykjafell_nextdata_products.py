import json
import re
import requests


def walk(obj, out_list):
    if isinstance(obj, dict):
        for v in obj.values():
            walk(v, out_list)
    elif isinstance(obj, list):
        for v in obj:
            walk(v, out_list)
    elif isinstance(obj, str):
        out_list.append(obj)


def main() -> None:
    url = "https://www.reykjafell.is/vorur?q=7006757"
    html = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"}).text

    m = re.search(r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', html, flags=re.DOTALL)
    if not m:
        print("No __NEXT_DATA__")
        return
    blob = m.group(1)
    data = json.loads(blob)

    strings: list[str] = []
    walk(data, strings)
    # collect possible product URLs
    vorur_strings = [s for s in strings if "/vorur/" in s]
    print("strings containing /vorur/:", len(vorur_strings))
    if vorur_strings:
        print("sample:", vorur_strings[:20])

    # find /vorur/<something>-style paths
    href_candidates = [s for s in strings if s.startswith("/vorur/")]
    print("strings starting /vorur/:", len(href_candidates))
    if href_candidates:
        # unique
        uniq = []
        seen = set()
        for s in href_candidates:
            if s not in seen:
                uniq.append(s)
                seen.add(s)
            if len(uniq) >= 15:
                break
        print("uniq first 15:", uniq)

    # hex-ish IDs embedded
    hex_ids = set(re.findall(r"[0-9a-fA-F]{20,}", " ".join(strings)))
    print("hex id candidates:", len(hex_ids))
    if hex_ids:
        # show any that look like 24 hex
        exact24 = [h for h in hex_ids if len(h) >= 24]
        print(">=24 length examples:", list(exact24)[:10])

    # search for vendorItemNo in JSON
    vendor_no = "7006757"
    if any(vendor_no in s for s in strings):
        idx = [i for i,s in enumerate(strings) if vendor_no in s][:5]
        print("found vendor number string occurrences in JSON:", idx)
    else:
        print("vendorItemNo not found as raw string in JSON strings")


if __name__ == "__main__":
    main()

