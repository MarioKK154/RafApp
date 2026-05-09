"""
Probe https://ronning.is/voruflokkar/{id}/ for status, /vara/ product links, and sample URLs.

Product tiles link to /vara/{id}/ (or similar); this script counts anchors and prints a few examples.

Usage:
  cd backend
  python scripts/explore_ronning_voruflokkar.py --start 59 --end 108
  python scripts/explore_ronning_voruflokkar.py --ids 62,63,100
"""

from __future__ import annotations

import argparse
import random
import time

from playwright.sync_api import sync_playwright


def _sample_vara_hrefs(page, limit: int = 3) -> list[str]:
    return page.evaluate(
        f"""() => {{
          const out = [];
          const seen = new Set();
          for (const a of document.querySelectorAll('a[href*="/vara/"]')) {{
            const h = a.getAttribute('href') || '';
            if (!h || seen.has(h)) continue;
            seen.add(h);
            out.push(h);
            if (out.length >= {limit}) break;
          }}
          return out;
        }}"""
    )


def probe_one(page, vid: int, scroll_ms: int) -> tuple[int, str, int, list[str]]:
    url = f"https://ronning.is/voruflokkar/{vid}/"
    try:
        r = page.goto(url, wait_until="domcontentloaded", timeout=60000)
        st = r.status if r else 0
    except Exception:
        return -1, "", 0, []
    page.wait_for_timeout(2000)
    end = time.time() + scroll_ms / 1000.0
    while time.time() < end:
        page.mouse.wheel(0, 2400)
        page.wait_for_timeout(350)
    title = ""
    try:
        title = page.title() or ""
    except Exception:
        pass
    n = page.evaluate("""() => document.querySelectorAll('a[href*="/vara/"]').length""")
    samples = _sample_vara_hrefs(page, 3)
    return st, title, int(n) if n is not None else 0, samples


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=59)
    ap.add_argument("--end", type=int, default=108)
    ap.add_argument("--ids", type=str, default="", help="Comma-separated IDs (if set, ignores start/end)")
    ap.add_argument("--sample", type=int, default=0, help="Extra random IDs in [start,end]")
    ap.add_argument("--delay", type=float, default=0.3)
    ap.add_argument("--scroll-ms", type=int, default=6000, help="Scroll duration per page (lazy-loaded tiles)")
    ap.add_argument("--warm-home", action="store_true", help="Open ronning.is first (same session)")
    ap.add_argument(
        "--headed",
        action="store_true",
        help="Non-headless browser (helps pass Cloudflare); run locally if you see 403 / 'Just a moment'.",
    )
    args = ap.parse_args()

    if args.ids.strip():
        ids = sorted({int(x.strip()) for x in args.ids.split(",") if x.strip().isdigit()})
    else:
        ids = list(range(args.start, args.end + 1))
        if args.sample > 0:
            lo, hi = args.start, args.end
            for _ in range(args.sample):
                ids.append(random.randint(lo, hi))
            ids = sorted(set(ids))

    print("id\tstatus\tvara_links\ttitle\tsample_hrefs")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        page = browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
        )
        if args.warm_home:
            page.goto("https://ronning.is/", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(3000)
        for vid in ids:
            st, title, n, samples = probe_one(page, vid, scroll_ms=args.scroll_ms)
            t = (title or "").replace("\t", " ")[:55]
            samp = " | ".join(samples)[:120]
            print(f"{vid}\t{st}\t{n}\t{t}\t{samp}")
            time.sleep(args.delay)
        browser.close()


if __name__ == "__main__":
    main()
