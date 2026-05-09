"""
BFS-crawl iskraft.husa.is from top-level category URLs, collect listing pages (subcategory hubs),
then fuzzy-match each Excel Iskraft bucket to the best listing URL and write iskraft_listing_overrides.json.

Usage (from backend/):
  python scripts/discover_iskraft_husa_listings.py
  python scripts/discover_iskraft_husa_listings.py --input "C:/Users/.../Rafapp materials categories.xlsx" --max-pages 400

Requires: playwright (same as export_materials_category_shop_urls.py).
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import re
import time
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

ISKRAFT_HUSA_HOST = "iskraft.husa.is"

# Top-level shop sections (user-provided main category URLs).
DEFAULT_MAIN_URLS = [
    "https://iskraft.husa.is/fjarskiptabunadur/",
    "https://iskraft.husa.is/hledslustodvar/",
    "https://iskraft.husa.is/hitunarbunadur/",
    "https://iskraft.husa.is/idnstyribunadur/",
    "https://iskraft.husa.is/innlagnaefni/",
    "https://iskraft.husa.is/lagnaefni/",
    "https://iskraft.husa.is/lysingarbunadur/",
    "https://iskraft.husa.is/skapar-og-tengikassar/",
    "https://iskraft.husa.is/strengir/",
    "https://iskraft.husa.is/tengibunadur/",
    "https://iskraft.husa.is/toflubunadur/",
    "https://iskraft.husa.is/verkfaeri/",
    "https://iskraft.husa.is/oryggis-og-snjalllausnir/",
    "https://iskraft.husa.is/afldreifibunadur/",
]

SKIP_PATH_PREFIXES = (
    "/checkout",
    "/oskalisti",
    "/outlet",
    "/um-okkur",
    "/afgreidslutimi",
    "/account",
    "/cart",
)


def _norm(s: str) -> str:
    if s is None:
        return ""
    t = unicodedata.normalize("NFKD", str(s).strip().lower())
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _slug_to_label(seg: str) -> str:
    s = (seg or "").replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", s).strip()


def _segment_likely_product_slug(seg: str) -> bool:
    """Exclude from BFS: product detail URLs (long slugs with digits / many parts)."""
    s = (seg or "").strip().lower().rstrip("/")
    if not s:
        return True
    if len(s) >= 55:
        return True
    if re.search(r"\d{4,}", s) and len(s) >= 22:
        return True
    if s.count("-") >= 5 and len(s) >= 38:
        return True
    if len(s) >= 32 and any(c.isdigit() for c in s) and s.count("-") >= 3:
        return True
    return False


def _should_skip_path(path: str) -> bool:
    p = path.lower().rstrip("/") or "/"
    for pref in SKIP_PATH_PREFIXES:
        if p.startswith(pref):
            return True
    return False


def _load_export_module():
    script = Path(__file__).resolve().parent / "export_materials_category_shop_urls.py"
    name = "export_materials_category_shop_urls"
    spec = importlib.util.spec_from_file_location(name, script)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {script}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _abs_url(base: str, href: str) -> str:
    from urllib.parse import urljoin

    if href.startswith("http"):
        return href.split("#")[0]
    return urljoin(base, href.split("#")[0])


@dataclass
class ListingNode:
    url: str
    path: str
    label: str
    depth: int


def _bfs_discover(
    page,
    seeds: list[str],
    scroll_ms: int,
    max_pages: int,
) -> list[ListingNode]:
    from collections import deque

    seen_paths: set[str] = set()
    out: list[ListingNode] = []
    q: deque[tuple[str, str, int]] = deque()

    for u in seeds:
        u = u.strip().split("#")[0]
        if not u.endswith("/"):
            u = u + "/"
        p = urlparse(u).path.rstrip("/") or "/"
        if p in seen_paths:
            continue
        seen_paths.add(p)
        q.append((u, _slug_to_label(p.split("/")[-1]), 0))

    while q and len(out) < max_pages:
        url, label_hint, depth = q.popleft()
        page.goto(url, wait_until="networkidle", timeout=120000)
        page.wait_for_timeout(1500)
        end = time.time() + scroll_ms / 1000.0
        while time.time() < end:
            page.mouse.wheel(0, 2400)
            page.wait_for_timeout(350)

        pr = urlparse(url)
        parent_path = pr.path.rstrip("/") or ""
        base = f"{pr.scheme}://{pr.netloc}"

        rows = page.eval_on_selector_all(
            "a[href]",
            """els => els.map(e => ({
              href: e.getAttribute('href') || '',
              t: (e.innerText || '').trim().replace(/\\s+/g, ' ')
            }))""",
        )

        title_guess = label_hint
        try:
            h1 = page.query_selector("h1")
            if h1:
                t = h1.inner_text()
                if t and len(t) < 200:
                    title_guess = t.strip().split("\n")[0].strip()
        except Exception:
            pass

        out.append(ListingNode(url=url, path=parent_path or "/", label=title_guess, depth=depth))

        for row in rows:
            h = (row or {}).get("href") or ""
            link_t = (row or {}).get("t") or ""
            if not h:
                continue
            full = _abs_url(base, h).split("?")[0].split("#")[0]
            fp = urlparse(full)
            if (fp.netloc or "").lower() != ISKRAFT_HUSA_HOST:
                continue
            if _should_skip_path(fp.path):
                continue
            child_path = fp.path.rstrip("/")
            if parent_path and not child_path.startswith(parent_path + "/"):
                continue
            rest = child_path[len(parent_path) :].strip("/") if parent_path else child_path.strip("/")
            if not rest:
                continue
            segments = [x for x in rest.split("/") if x]
            if not segments or len(segments) > 1:
                continue
            seg = segments[0]
            if _segment_likely_product_slug(seg):
                continue
            if child_path in seen_paths:
                continue
            seen_paths.add(child_path)
            child_url = f"{base}{child_path}/"
            lab = link_t if link_t and len(link_t) < 120 else _slug_to_label(seg)
            if len(out) < max_pages:
                q.append((child_url, lab, depth + 1))

    return out


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _best_listing_for_bucket(
    category: str,
    subcategory: Optional[str],
    sub_subcategory: Optional[str],
    nodes: list[ListingNode],
) -> tuple[Optional[str], float]:
    """
    Match each Excel bucket to the strongest listing node.
    Prefer matching the most specific label (sub-sub, then sub, then category only).
    Prefer deeper paths when scores tie.
    """
    targets: list[tuple[str, float]] = []
    if sub_subcategory:
        targets.append((_norm(sub_subcategory), 1.0))
        if subcategory:
            targets.append((_norm(f"{subcategory} {sub_subcategory}"), 0.98))
    elif subcategory:
        targets.append((_norm(subcategory), 1.0))
    else:
        targets.append((_norm(category), 1.0))

    min_score = 0.74 if sub_subcategory else (0.72 if subcategory else 0.7)

    best: Optional[tuple[float, int, str]] = None

    for node in nodes:
        segs = [s for s in node.path.split("/") if s]
        depth = len(segs)
        labels: list[str] = []
        if node.label:
            labels.append(_norm(node.label))
        if segs:
            labels.append(_norm(_slug_to_label(segs[-1])))
            labels.append(_norm(" ".join(_slug_to_label(s) for s in segs)))
        path_join = _norm(" ".join(_slug_to_label(s) for s in segs))

        for tgt, weight in targets:
            if len(tgt) < 2:
                continue
            for lab in labels:
                if not lab:
                    continue
                sc = _similarity(tgt, lab) * weight
                if len(tgt) >= 4 and len(lab) >= 4:
                    sc = max(sc, _similarity(tgt, path_join) * weight * 0.97)
                if tgt in lab or lab in tgt:
                    sc = max(sc, 0.88 * weight)
                if sc < min_score:
                    continue
                cand = (sc, depth, node.url)
                if best is None:
                    best = cand
                elif cand[0] > best[0] + 0.008:
                    best = cand
                elif abs(cand[0] - best[0]) <= 0.008 and cand[1] > best[1]:
                    best = cand

    if best is None:
        return None, 0.0
    return best[2], best[0]


def _bucket_key(category: str, subcategory: Optional[str], sub_subcategory: Optional[str]) -> tuple:
    def _clean(x: Optional[str]) -> Optional[str]:
        if x is None:
            return None
        t = str(x).strip()
        return t if t else None

    return (str(category or "").strip(), _clean(subcategory), _clean(sub_subcategory))


def _override_row_key(o: dict) -> tuple:
    return _bucket_key(
        (o.get("category") or "").strip(),
        o.get("subcategory"),
        o.get("sub_subcategory"),
    )


def _load_manual_overrides(path: Path) -> dict[tuple, dict]:
    """
    Hand-edited URLs only (e.g. scripts/data/iskraft_listing_manual.json).
    Do not point this at the generated iskraft_listing_overrides.json or stale rows block re-matching.
    """
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("overrides") or []
    out: dict[tuple, dict] = {}
    for o in rows:
        lu = (o.get("listing_url") or "").strip()
        if not lu:
            continue
        out[_override_row_key(o)] = o
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        type=str,
        default=str(Path.home() / "Desktop" / "Rafapp materials categories.xlsx"),
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path(__file__).resolve().parent / "data" / "iskraft_listing_overrides.json"),
    )
    parser.add_argument(
        "--discovered-dump",
        type=str,
        default=str(Path(__file__).resolve().parent / "data" / "iskraft_husa_discovered_listings.json"),
    )
    parser.add_argument("--max-pages", type=int, default=500)
    parser.add_argument("--scroll-ms", type=int, default=6000)
    parser.add_argument("--seeds-file", type=str, default="", help="JSON array of URLs (optional)")
    parser.add_argument(
        "--from-dump",
        action="store_true",
        help="Skip Playwright; load listing nodes from --discovered-dump JSON (after a full crawl).",
    )
    parser.add_argument(
        "--manual-overrides",
        type=str,
        default=str(Path(__file__).resolve().parent / "data" / "iskraft_listing_manual.json"),
        help="Small JSON of hand-locked listing_url rows (Afldreifibúnaður, etc.). Not the generated overrides file.",
    )
    args = parser.parse_args()

    exp = _load_export_module()
    inp = Path(args.input).expanduser()
    if not inp.exists():
        raise SystemExit(f"Input not found: {inp}")

    buckets = exp.load_buckets(inp).get("iskraft", [])
    if not buckets:
        raise SystemExit("No Iskraft buckets in workbook")

    dump_path = Path(args.discovered_dump).expanduser()

    if args.from_dump:
        if not dump_path.exists():
            raise SystemExit(f"--from-dump: file not found: {dump_path}")
        raw = json.loads(dump_path.read_text(encoding="utf-8"))
        nodes = [
            ListingNode(url=x["url"], path=x["path"], label=x["label"], depth=int(x.get("depth", 0)))
            for x in raw
        ]
    else:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            raise SystemExit("pip install playwright && playwright install chromium")

        seeds = list(DEFAULT_MAIN_URLS)
        if args.seeds_file:
            sf = Path(args.seeds_file).expanduser()
            if sf.exists():
                seeds = json.loads(sf.read_text(encoding="utf-8"))

        nodes = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                )
            )
            nodes = _bfs_discover(page, seeds, scroll_ms=args.scroll_ms, max_pages=args.max_pages)
            browser.close()

        dump_path.parent.mkdir(parents=True, exist_ok=True)
        dump_path.write_text(
            json.dumps(
                [{"url": n.url, "path": n.path, "label": n.label, "depth": n.depth} for n in nodes],
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    out_path = Path(args.output).expanduser()
    manual = _load_manual_overrides(Path(args.manual_overrides).expanduser())

    overrides: list[dict] = []
    unmatched: list[dict] = []
    for b in buckets:
        bk = _bucket_key(b.category, b.subcategory, b.sub_subcategory)
        if bk in manual:
            mo = manual[bk]
            overrides.append(
                {
                    "category": b.category,
                    "subcategory": b.subcategory,
                    "sub_subcategory": b.sub_subcategory,
                    "listing_url": (mo.get("listing_url") or "").strip(),
                }
            )
            continue

        url, score = _best_listing_for_bucket(b.category, b.subcategory, b.sub_subcategory, nodes)
        row = {
            "category": b.category,
            "subcategory": b.subcategory,
            "sub_subcategory": b.sub_subcategory,
            "listing_url": url,
            "match_score": round(score, 4),
            "sheet_row": b.sheet_row,
        }
        if url:
            overrides.append(
                {
                    "category": b.category,
                    "subcategory": b.subcategory,
                    "sub_subcategory": b.sub_subcategory,
                    "listing_url": url,
                }
            )
        else:
            unmatched.append(row)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({"overrides": overrides}, ensure_ascii=False, indent=2), encoding="utf-8")

    un_path = out_path.with_name(out_path.stem + "_unmatched.json")
    un_path.write_text(json.dumps({"unmatched": unmatched}, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Discovered {len(nodes)} listing pages -> {dump_path}")
    print(f"Wrote {len(overrides)} overrides -> {out_path}")
    print(f"Unmatched buckets: {len(unmatched)} -> {un_path}")


if __name__ == "__main__":
    main()
