import json
import urllib.parse

import requests

BASE = "https://iskraft.husa.is/webapi/search/query"


def search(q: str) -> None:
    path = urllib.parse.quote(q, safe="")
    url = f"{BASE}/{path}?from=0&count=20&storeAlias=Iskraft"
    r = requests.get(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "is-IS",
            "Accept": "application/json",
        },
        timeout=30,
    )
    print("q=", repr(q), "status", r.status_code)
    try:
        data = r.json()
    except Exception:
        print(r.text[:500])
        return
    print(json.dumps(data, indent=2, ensure_ascii=False)[:4000])


if __name__ == "__main__":
    for q in ("6082100", "12345", "RV-K", "3G1.5"):
        search(q)
        print("---")
