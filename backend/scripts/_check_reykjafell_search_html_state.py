import requests


def main() -> None:
    for q in ["305330", "909300", "205510", "7006757"]:
        url = f"https://www.reykjafell.is/vorur?q={q}"
        html = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"}).text
        low = html.lower()
        indicators = [
            "no products",
            "no results",
            "enger",
            "enginn",
            "ni\u00f0urst",
            "enginn",
            "ekki",
        ]
        hits = [s for s in indicators if s.lower() in low]
        print("q", q, "hits", hits, "len", len(html))


if __name__ == "__main__":
    main()

