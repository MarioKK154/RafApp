"""
Read `Rafapp materials categories.xlsx` (3 sheets: Johan Ronning, Iskraft, Reykjafell),
resolve product URLs per category bucket, compare counts to the sheet, and write a new workbook.

Reykjafell: public GraphQL (products include `categories: [String!]` and id-based URLs).

Ronning / Iskraft: Playwright (plain HTTP is blocked or HTML is client-rendered).

Usage:
  cd backend
  python scripts/export_materials_category_shop_urls.py --input "C:/Users/mario/Desktop/Rafapp materials categories.xlsx"

Optional:
  --output path.xlsx
  --stores reykjafell   # comma-separated: johan_ronning, iskraft, reykjafell
  --reykjafell-overrides scripts/data/reykjafell_listing_overrides.json
  --reykjafell-delay 0.05
  --playwright-delay 0.35
  --johan-ronning-overrides scripts/data/johan_ronning_listing_overrides.json
  --ronning-scroll-ms 20000
  --iskraft-scroll-ms 12000
  --iskraft-overrides scripts/data/iskraft_listing_overrides.json
  --iskraft-headed       # optional: run Chromium headed if lazy listings fail headless
  --limit-buckets 3     # debug: only first N buckets per store

Reykjafell uses GraphQL `ProductsFilterInput.categories` with **display names** (same as /vorur?category=…&subcategory=…).
Add overrides when Excel labels and API labels differ; `listing_url` query params are parsed as the filter.

Johan Ronning: the old `/vorur?page=` index is often **404**. Use `johan_ronning_listing_overrides.json` with real
**listing page URLs** from the browser (category/search pages). Each bucket needs a matching `listing_url`; the script
scrolls the page, collects `/vara/…` links, and (with override) assigns them to that bucket.

Iskraft: **`www.iskraft.is/leit?q=…`** often returns no `/vara/` links (client-rendered / different storefront). Prefer
`iskraft_listing_overrides.json` with **`https://iskraft.husa.is/…`** category listing URLs (same hierarchy as in the
shop). The script scrolls each listing, collects product links under that path (long slug segments), and fills **Item**
from link text. Without an override, it falls back to the legacy search on `www.iskraft.is`.

To rebuild overrides from the live category tree, run **`scripts/discover_iskraft_husa_listings.py`** (BFS from the main
`iskraft.husa.is` sections, fuzzy-match Excel rows). Hand-edited URLs belong in **`scripts/data/iskraft_listing_manual.json`**
only — do not use the generated `iskraft_listing_overrides.json` as that manual file or stale rows block updates.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, quote, urljoin, urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup
from openpyxl import Workbook

try:
    from playwright.sync_api import sync_playwright
except ImportError:  # pragma: no cover
    sync_playwright = None  # type: ignore[misc, assignment]


SCRIPT_DIR = Path(__file__).resolve().parent
GRAPHQL_URL = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

ALL_PRODUCTS_QUERY = """
query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {
  products(input: $input, first: $first, after: $after) {
    edges {
      node {
        id
        title
        categories
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
"""


@dataclass
class Bucket:
    store: str
    category: str
    subcategory: Optional[str]
    sub_subcategory: Optional[str]
    expected_count: Optional[int]
    sheet_row: int


def _norm(s: str) -> str:
    if s is None:
        return ""
    t = unicodedata.normalize("NFKD", str(s).strip().lower())
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _similar(a: str, b: str) -> bool:
    if not a or not b:
        return False
    if a == b:
        return True
    return SequenceMatcher(None, a, b).ratio() >= 0.92


def _similar_override(a: str, b: str) -> bool:
    """Looser match for linking override JSON rows to Excel buckets (spacing / minor spelling)."""
    if not a or not b:
        return False
    if a == b:
        return True
    return SequenceMatcher(None, a, b).ratio() >= 0.86


def bucket_matches_categories(bucket: Bucket, categories: list[str]) -> bool:
    """Match API breadcrumb names to a bucket (category / optional sub / optional sub-sub)."""
    cats = [_norm(x) for x in categories if x]
    if not cats:
        return False
    if not _similar(cats[0], _norm(bucket.category)):
        return False
    if bucket.subcategory:
        if len(cats) < 2:
            return False
        if not _similar(cats[1], _norm(bucket.subcategory)):
            return False
    if bucket.sub_subcategory:
        if len(cats) < 3:
            return False
        return _similar(cats[2], _norm(bucket.sub_subcategory))
    return True


def parse_sheet(df: pd.DataFrame, store: str) -> list[Bucket]:
    """
    First row = header.
    When column A (category) changes, subcategory and sub-subcategory reset.
    When column B (subcategory) changes, sub-subcategory resets.
    Sub-subcategory is never forward-filled: empty cell means this row is a leaf at subcategory (or category) level.
    """
    buckets: list[Bucket] = []
    cat: Optional[str] = None
    sub: Optional[str] = None
    # Row 0 is the first data row (header is not in df when using header=0).
    for i in range(0, len(df)):
        row = df.iloc[i]
        c0, c1, c2, c3 = row.iloc[0], row.iloc[1], row.iloc[2], row.iloc[3]
        if pd.notna(c0) and str(c0).strip():
            cat = str(c0).strip()
            sub = None
        if pd.notna(c1) and str(c1).strip():
            sub = str(c1).strip()
        sub_sub = str(c2).strip() if pd.notna(c2) and str(c2).strip() else None
        exp: Optional[int] = None
        if pd.notna(c3):
            try:
                exp = int(float(c3))
            except (TypeError, ValueError):
                exp = None
        if not cat:
            continue
        buckets.append(
            Bucket(
                store=store,
                category=cat,
                subcategory=sub,
                sub_subcategory=sub_sub,
                expected_count=exp,
                sheet_row=i + 2,
            )
        )
    return buckets


def load_buckets(path: Path) -> dict[str, list[Bucket]]:
    xl = pd.ExcelFile(path)
    mapping = {
        "Johan Ronning": "johan_ronning",
        "Iskraft": "iskraft",
        "Reykjafell": "reykjafell",
    }
    out: dict[str, list[Bucket]] = {}
    for sheet in xl.sheet_names:
        key = mapping.get(sheet)
        if not key:
            continue
        df = pd.read_excel(path, sheet_name=sheet, header=0)
        out[key] = parse_sheet(df, key)
    return out


def _categories_from_reykjafell_vorur_url(url: str) -> list[str]:
    """Read category / subcategory / … query params from a Reykjafell /vorur listing URL (order preserved)."""
    q = urlparse(url.strip()).query
    if not q:
        return []
    pq = parse_qs(q)
    out: list[str] = []
    for key in ("category", "subcategory", "subsubcategory", "sub_subcategory", "subSubcategory"):
        vals = pq.get(key)
        if not vals:
            continue
        v = (vals[0] or "").strip()
        if v:
            out.append(v)
    return out


def _override_matches_bucket(o: dict, b: Bucket) -> bool:
    oc = (o.get("category") or "").strip()
    if oc and not _similar_override(_norm(oc), _norm(b.category)):
        return False
    if "subcategory" in o:
        raw_sub = o.get("subcategory")
        if raw_sub is None or (isinstance(raw_sub, str) and not str(raw_sub).strip()):
            if b.subcategory:
                return False
        else:
            os_ = str(raw_sub).strip()
            if not b.subcategory or not _similar_override(_norm(os_), _norm(b.subcategory)):
                return False
    if "sub_subcategory" in o:
        oss = o.get("sub_subcategory")
        if oss is None or (isinstance(oss, str) and not oss.strip()):
            if b.sub_subcategory:
                return False
        else:
            oss = str(oss).strip()
            if not b.sub_subcategory or not _similar_override(_norm(oss), _norm(b.sub_subcategory)):
                return False
    return True


def _graphql_categories_for_bucket(b: Bucket, overrides: list[dict]) -> tuple[list[str], bool]:
    """
    Build `ProductsFilterInput.categories` using **category names** (not Mongo ids).
    Prefer explicit `listing_url` on a matching override so spelling matches the site.
    Second return is True when an override listing URL was used (trust API result set).
    """
    for o in overrides:
        if not _override_matches_bucket(o, b):
            continue
        lu = (o.get("listing_url") or "").strip()
        if lu:
            parsed = _categories_from_reykjafell_vorur_url(lu)
            if parsed:
                return parsed, True
    parts: list[str] = [b.category]
    if b.subcategory:
        parts.append(b.subcategory)
    if b.sub_subcategory:
        parts.append(b.sub_subcategory)
    return parts, False


def _load_listing_overrides_json(path: Optional[Path]) -> list[dict]:
    if not path or not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("overrides") or data.get("entries") or []
    return list(rows) if isinstance(rows, list) else []


def load_reykjafell_overrides(path: Optional[Path]) -> list[dict]:
    return _load_listing_overrides_json(path)


def load_johan_ronning_overrides(path: Optional[Path]) -> list[dict]:
    return _load_listing_overrides_json(path)


def load_iskraft_overrides(path: Optional[Path]) -> list[dict]:
    return _load_listing_overrides_json(path)


def reykjafell_graphql_fetch_filtered(
    session: requests.Session,
    category_names: list[str],
    delay_s: float,
) -> list[dict]:
    """Paginate products for `input.categories = category_names` (Reykjafell expects display names)."""
    if not category_names:
        return []
    rows: list[dict] = []
    cursor: Optional[str] = None
    while True:
        variables: dict = {
            "input": {"categories": category_names, "hideBackorderProducts": False},
            "first": 200,
        }
        if cursor:
            variables["after"] = cursor
        payload = {"operationName": "allProducts", "variables": variables, "query": ALL_PRODUCTS_QUERY}
        headers = {
            "Content-Type": "application/json",
            "Origin": "https://www.reykjafell.is",
            "Referer": "https://www.reykjafell.is/",
        }
        resp = session.post(GRAPHQL_URL, json=payload, headers=headers, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        products = (data.get("data") or {}).get("products") or {}
        edges = products.get("edges") or []
        for edge in edges:
            node = edge.get("node") or {}
            pid = node.get("id")
            title = (node.get("title") or "").strip()
            cats = node.get("categories") or []
            if not pid or not title:
                continue
            rows.append({"id": pid, "title": title, "categories": cats})
        page_info = products.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            break
        cursor = page_info.get("endCursor")
        if not cursor:
            break
        time.sleep(delay_s)
    return rows


def run_reykjafell(
    buckets: list[Bucket],
    session: requests.Session,
    delay_s: float,
    limit_buckets: Optional[int],
    overrides: list[dict],
) -> tuple[list[dict], list[dict]]:
    out_rows: list[dict] = []
    summary: list[dict] = []
    bs = buckets[: limit_buckets or len(buckets)]
    for b in bs:
        gcat, trust_listing_override = _graphql_categories_for_bucket(b, overrides)
        products = reykjafell_graphql_fetch_filtered(session, gcat, delay_s=delay_s)
        found = 0
        for p in products:
            if not trust_listing_override and not bucket_matches_categories(b, p["categories"]):
                continue
            found += 1
            url = f"https://www.reykjafell.is/vorur/{p['id']}"
            out_rows.append(
                {
                    "Category": b.category,
                    "Subcategory": b.subcategory or "",
                    "Sub-subcategory": b.sub_subcategory or "",
                    "Item": p["title"],
                    "Item URL": url,
                }
            )
        exp = b.expected_count
        summary.append(
            {
                "Store": "reykjafell",
                "Category": b.category,
                "Subcategory": b.subcategory or "",
                "Sub-subcategory": b.sub_subcategory or "",
                "Expected": exp,
                "Found": found,
                "Match": (exp is None or exp == found),
                "GraphQL filter": ", ".join(gcat),
                "Used listing URL override": trust_listing_override,
            }
        )
    return out_rows, summary


def _abs_url(base: str, href: str) -> str:
    if href.startswith("http"):
        return href.split("#")[0]
    return urljoin(base, href.split("#")[0])


RONNING_BASE = "https://ronning.is"
ISKRAFT_BASE = "https://www.iskraft.is"
ISKRAFT_HUSA_HOST = "iskraft.husa.is"

# Single path segment after a listing URL that is a subcategory hub, not a product slug (husa.is).
_HUSA_CATEGORY_SLUGS: frozenset[str] = frozenset(
    {
        "dreifiskapar",
        "vinnutoflur",
        "ihlutir-og-varahlutir",
        "dreifiskapar-og-vinnutoflur",
        "spennar-og-spennistodvar",
        "oryggisbunadur",
        "haspennubunadur",
        "tenglastodvar",
        "varaaflgjafar",
        "oryggisbunadur-haspennu",
        "tengibunadur-haspennu",
        "garo-tenglastodvar",
    }
)


def _iskraft_husa_slug_looks_like_product(seg: str) -> bool:
    s = (seg or "").strip().lower().rstrip("/")
    if not s or s in _HUSA_CATEGORY_SLUGS:
        return False
    if len(s) >= 28:
        return True
    if len(s) >= 12 and s.count("-") >= 2:
        return True
    if len(s) >= 10 and any(ch.isdigit() for ch in s):
        return True
    if len(s) >= 36:
        return True
    return False


def _iskraft_husa_path_is_under_listing(listing_path: str, full_path: str) -> bool:
    lp = (listing_path or "").rstrip("/").lower()
    fp = (full_path or "").rstrip("/").lower()
    if not lp or not fp:
        return False
    return fp.startswith(lp + "/")


def _iskraft_husa_extra_is_product(listing_path: str, full_path: str) -> bool:
    lp = (listing_path or "").rstrip("/")
    fp = (full_path or "").rstrip("/")
    if not _iskraft_husa_path_is_under_listing(lp, fp):
        return False
    rest = fp[len(lp) :].strip("/")
    if not rest:
        return False
    segments = [x for x in rest.split("/") if x]
    if not segments:
        return False
    if len(segments) == 1:
        seg = segments[0]
        if seg.lower() in {x.lower() for x in _HUSA_CATEGORY_SLUGS}:
            return False
        return _iskraft_husa_slug_looks_like_product(seg)
    last = segments[-1]
    if last.lower() in {x.lower() for x in _HUSA_CATEGORY_SLUGS}:
        return False
    return _iskraft_husa_slug_looks_like_product(last)


def _iskraft_husa_scroll_collect(page, listing_url: str, scroll_ms: int) -> list[tuple[str, str]]:
    """Load iskraft.husa.is category listing; scroll to lazy-load; collect product URLs under listing path."""
    # networkidle often never fires (analytics / long-poll); domcontentloaded + scroll matches discovery script.
    page.goto(listing_url.split("#")[0], wait_until="domcontentloaded", timeout=120000)
    page.wait_for_timeout(3000)
    end = time.time() + scroll_ms / 1000.0
    while time.time() < end:
        page.mouse.wheel(0, 2800)
        page.wait_for_timeout(450)

    listing_path = urlparse(listing_url.strip()).path.rstrip("/")
    base = f"{urlparse(listing_url).scheme}://{urlparse(listing_url).netloc}"

    rows = page.eval_on_selector_all(
        "a[href]",
        """els => els.map(e => {
          const href = e.getAttribute('href') || '';
          const t = (e.innerText || '').trim().replace(/\\s+/g, ' ');
          return { href, t };
        })""",
    )
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for row in rows:
        h = (row or {}).get("href") or ""
        t = (row or {}).get("t") or ""
        if not h:
            continue
        full = _abs_url(base, h).split("?")[0].split("#")[0].rstrip("/")
        pr = urlparse(full)
        if (pr.netloc or "").lower() != ISKRAFT_HUSA_HOST:
            continue
        if not _iskraft_husa_extra_is_product(listing_path, pr.path):
            continue
        if full in seen:
            continue
        seen.add(full)
        out.append((full, t))
    return out


def _iskraft_scroll_collect_generic_listing(page, listing_url: str, scroll_ms: int) -> list[tuple[str, str]]:
    """Non-husa listing (e.g. legacy iskraft.is): collect /vara/ or /vorur/… product links."""
    lu = listing_url.strip().split("#")[0]
    pr = urlparse(lu)
    base = f"{pr.scheme}://{pr.netloc}"
    page.goto(lu, wait_until="domcontentloaded", timeout=120000)
    page.wait_for_timeout(2000)
    end = time.time() + scroll_ms / 1000.0
    while time.time() < end:
        page.mouse.wheel(0, 2000)
        page.wait_for_timeout(400)

    rows = page.eval_on_selector_all(
        "a[href]",
        """els => els.map(e => {
          const href = e.getAttribute('href') || '';
          const t = (e.innerText || '').trim().replace(/\\s+/g, ' ');
          return { href, t };
        })""",
    )
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for row in rows:
        h = (row or {}).get("href") or ""
        t = (row or {}).get("t") or ""
        if not h:
            continue
        low = h.lower()
        if "/vara/" not in low and not re.search(r"/vorur/[^/?#]+", low):
            continue
        full = _abs_url(base, h).split("?")[0].rstrip("/")
        path = urlparse(full).path.lower()
        if path in ("/vorur", "/vorur/") or path.rstrip("/").endswith("/vorur"):
            continue
        if full in seen:
            continue
        seen.add(full)
        out.append((full, t))
    return out


def _ronning_scroll_collect_listing(page, listing_url: str, scroll_ms: int) -> set[str]:
    """
    Load a Johan Ronning category / search page and collect product links (/vara/...).
    The public /vorur listing often returns 404; use the same URLs you see in the browser.
    """
    page.goto(listing_url, wait_until="domcontentloaded", timeout=120000)
    page.wait_for_timeout(2500)
    end = time.time() + scroll_ms / 1000.0
    seen: set[str] = set()
    while time.time() < end:
        page.mouse.wheel(0, 2800)
        page.wait_for_timeout(450)
        hrefs = page.eval_on_selector_all(
            "a[href]",
            "els => els.map(e => e.getAttribute('href')).filter(Boolean)",
        )
        for h in hrefs:
            if not h or "/vara/" not in h.lower():
                continue
            full = _abs_url(RONNING_BASE, h).split("?")[0].rstrip("/")
            if "/vara/" in full.lower():
                seen.add(full)
    return seen


def _crumbs_to_categories(crumbs: list[str], product_title: str) -> list[str]:
    f = [c.strip() for c in crumbs if c and str(c).strip()]
    drop = {"heim", "home", "johan rönning", "johan ronning"}
    f = [x for x in f if x.lower() not in drop]
    pt = (product_title or "").strip().lower()
    if pt and f and f[-1].strip().lower() == pt:
        f = f[:-1]
    return f


def _parse_breadcrumb(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    nav = soup.select_one("nav[aria-label='breadcrumb']") or soup.select_one("nav[aria-label=Breadcrumb]")
    crumbs: list[str] = []
    if nav:
        for li in nav.select("li"):
            t = li.get_text(" ", strip=True)
            if t:
                crumbs.append(t)
        if crumbs:
            return crumbs
    # JSON-LD BreadcrumbList
    for script in soup.find_all("script", type="application/ld+json"):
        raw = script.string or script.get_text() or ""
        if "BreadcrumbList" not in raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue

        def walk(o):
            if isinstance(o, dict):
                if o.get("@type") == "ListItem" and "name" in o:
                    crumbs.append(str(o["name"]))
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for x in o:
                    walk(x)

        walk(data)
        if crumbs:
            return crumbs
    return []


def run_ronning_playwright(
    buckets: list[Bucket],
    delay_s: float,
    limit_buckets: Optional[int],
    overrides: list[dict],
    scroll_ms: int,
) -> tuple[list[dict], list[dict]]:
    if sync_playwright is None:
        raise RuntimeError("playwright is required for Johan Ronning; pip install playwright && playwright install chromium")
    out_rows: list[dict] = []
    summary_map: dict[tuple[str, str, str], dict] = {}

    bs = buckets[: limit_buckets or len(buckets)]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
        )
        page = context.new_page()
        for b in bs:
            key = (b.category, b.subcategory or "", b.sub_subcategory or "")
            listing_url = ""
            trust = False
            for o in overrides:
                if _override_matches_bucket(o, b) and (o.get("listing_url") or "").strip():
                    listing_url = str(o["listing_url"]).strip()
                    trust = True
                    break
            summary_map[key] = {
                "Store": "johan_ronning",
                "Category": b.category,
                "Subcategory": b.subcategory or "",
                "Sub-subcategory": b.sub_subcategory or "",
                "Expected": b.expected_count,
                "Found": 0,
                "Match": False,
                "GraphQL filter": listing_url,
                "Used listing URL override": trust,
            }
            if not listing_url:
                summary_map[key]["Match"] = b.expected_count is None or b.expected_count == 0
                continue

            product_urls = _ronning_scroll_collect_listing(page, listing_url, scroll_ms=scroll_ms)
            found = 0
            for pu in sorted(product_urls):
                page.goto(pu, wait_until="domcontentloaded", timeout=120000)
                page.wait_for_timeout(400)
                html = page.content()
                soup = BeautifulSoup(html, "html.parser")
                title_el = soup.select_one("h1")
                title = title_el.get_text(strip=True) if title_el else ""
                crumbs = _parse_breadcrumb(html)
                cats = _crumbs_to_categories(crumbs, title)
                if trust:
                    ok = True
                else:
                    ok = len(cats) >= 1 and bucket_matches_categories(b, cats)
                if not ok:
                    time.sleep(delay_s)
                    continue
                found += 1
                out_rows.append(
                    {
                        "Category": b.category,
                        "Subcategory": b.subcategory or "",
                        "Sub-subcategory": b.sub_subcategory or "",
                        "Item": title,
                        "Item URL": pu,
                    }
                )
                time.sleep(delay_s)

            sm = summary_map[key]
            sm["Found"] = found
            sm["Match"] = b.expected_count is None or b.expected_count == found

        browser.close()

    summary = list(summary_map.values())
    return out_rows, summary


def _iskraft_scroll_collect_search(page, search_q: str, scroll_ms: int) -> list[tuple[str, str]]:
    """Legacy: www.iskraft.is site search; collects /vara/ and /vorur/… links."""
    url = f"{ISKRAFT_BASE}/leit?q={quote(search_q)}"
    page.goto(url, wait_until="domcontentloaded", timeout=120000)
    page.wait_for_timeout(2000)
    end = time.time() + scroll_ms / 1000.0
    while time.time() < end:
        page.mouse.wheel(0, 2000)
        page.wait_for_timeout(400)

    rows = page.eval_on_selector_all(
        "a[href]",
        """els => els.map(e => {
          const href = e.getAttribute('href') || '';
          const t = (e.innerText || '').trim().replace(/\\s+/g, ' ');
          return { href, t };
        })""",
    )
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for row in rows:
        h = (row or {}).get("href") or ""
        t = (row or {}).get("t") or ""
        if not h:
            continue
        low = h.lower()
        if "/vara/" not in low and not re.search(r"/vorur/[^/?#]+", low):
            continue
        full = _abs_url(ISKRAFT_BASE, h)
        path = urlparse(full).path.lower()
        if path in ("/vorur", "/vorur/") or path.rstrip("/").endswith("/vorur"):
            continue
        if full in seen:
            continue
        seen.add(full)
        out.append((full, t))
    return out


def _iskraft_resolve_listing_url(b: Bucket, overrides: list[dict]) -> tuple[str, bool]:
    for o in overrides:
        if not _override_matches_bucket(o, b):
            continue
        lu = (o.get("listing_url") or "").strip()
        if lu:
            return lu, True
    return "", False


def run_iskraft_playwright(
    buckets: list[Bucket],
    delay_s: float,
    scroll_ms: int,
    limit_buckets: Optional[int],
    overrides: list[dict],
    headed: bool = False,
) -> tuple[list[dict], list[dict]]:
    if sync_playwright is None:
        raise RuntimeError("playwright is required for Iskraft")
    out_rows: list[dict] = []
    summary: list[dict] = []
    bs = buckets[: limit_buckets or len(buckets)]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        page = browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
        )
        for b in bs:
            listing_url, trust = _iskraft_resolve_listing_url(b, overrides)
            if listing_url and ISKRAFT_HUSA_HOST in listing_url.lower():
                pairs = _iskraft_husa_scroll_collect(page, listing_url, scroll_ms=scroll_ms)
                filter_note = listing_url
            elif listing_url:
                pairs = _iskraft_scroll_collect_generic_listing(page, listing_url, scroll_ms=scroll_ms)
                filter_note = listing_url
            else:
                leaf = b.sub_subcategory or b.subcategory or b.category
                pairs = _iskraft_scroll_collect_search(page, leaf, scroll_ms=scroll_ms)
                filter_note = f"{ISKRAFT_BASE}/leit?q={quote(leaf)}"

            found = len(pairs)
            summary.append(
                {
                    "Store": "iskraft",
                    "Category": b.category,
                    "Subcategory": b.subcategory or "",
                    "Sub-subcategory": b.sub_subcategory or "",
                    "Expected": b.expected_count,
                    "Found": found,
                    "Match": (b.expected_count is None or b.expected_count == found),
                    "GraphQL filter": filter_note,
                    "Used listing URL override": trust,
                }
            )
            for url, t in pairs:
                out_rows.append(
                    {
                        "Category": b.category,
                        "Subcategory": b.subcategory or "",
                        "Sub-subcategory": b.sub_subcategory or "",
                        "Item": t,
                        "Item URL": url,
                    }
                )
            time.sleep(delay_s)
        browser.close()

    return out_rows, summary


def _write_workbook(
    path: Path,
    per_store_rows: dict[str, list[dict]],
    summaries: list[dict],
    stores_included: set[str],
) -> None:
    wb = Workbook()
    ws0 = wb.active
    ws0.title = "Summary"
    ws0.append(
        [
            "Store",
            "Category",
            "Subcategory",
            "Sub-subcategory",
            "Expected",
            "Found",
            "Match",
            "GraphQL filter",
            "Used listing URL override",
        ]
    )
    for s in summaries:
        ws0.append(
            [
                s.get("Store"),
                s.get("Category"),
                s.get("Subcategory"),
                s.get("Sub-subcategory"),
                s.get("Expected"),
                s.get("Found"),
                s.get("Match"),
                s.get("GraphQL filter"),
                s.get("Used listing URL override"),
            ]
        )

    titles = {"johan_ronning": "Johan Ronning", "iskraft": "Iskraft", "reykjafell": "Reykjafell"}
    for key, title in titles.items():
        if key not in stores_included:
            continue
        ws = wb.create_sheet(title=title)
        ws.append(["Category", "Subcategory", "Sub-subcategory", "Item", "Item URL"])
        for row in per_store_rows.get(key, []):
            ws.append(
                [
                    row.get("Category"),
                    row.get("Subcategory"),
                    row.get("Sub-subcategory"),
                    row.get("Item"),
                    row.get("Item URL"),
                ]
            )

    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


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
        default=str(Path.home() / "Desktop" / "shop_category_urls_export.xlsx"),
    )
    parser.add_argument("--stores", type=str, default="johan_ronning,iskraft,reykjafell")
    parser.add_argument("--reykjafell-delay", type=float, default=0.05)
    parser.add_argument("--playwright-delay", type=float, default=0.35)
    parser.add_argument(
        "--ronning-scroll-ms",
        type=int,
        default=20000,
        help="Playwright scroll duration (ms) on each Johan Ronning listing page to lazy-load products.",
    )
    parser.add_argument("--iskraft-scroll-ms", type=int, default=12000)
    parser.add_argument("--limit-buckets", type=int, default=None)
    parser.add_argument(
        "--reykjafell-overrides",
        type=str,
        default=str(SCRIPT_DIR / "data" / "reykjafell_listing_overrides.json"),
        help="JSON with per-bucket listing_url entries for Reykjafell (exact query strings for GraphQL).",
    )
    parser.add_argument(
        "--johan-ronning-overrides",
        type=str,
        default=str(SCRIPT_DIR / "data" / "johan_ronning_listing_overrides.json"),
        help="JSON with per-bucket listing_url entries for Johan Ronning (browser category/search pages).",
    )
    parser.add_argument(
        "--iskraft-overrides",
        type=str,
        default=str(SCRIPT_DIR / "data" / "iskraft_listing_overrides.json"),
        help="JSON with per-bucket listing_url entries for Iskraft (prefer iskraft.husa.is category pages).",
    )
    parser.add_argument(
        "--iskraft-headed",
        action="store_true",
        help="Run Chromium non-headless for Iskraft (if husa.is listings stay empty headless).",
    )
    args = parser.parse_args()

    inp = Path(args.input).expanduser()
    out = Path(args.output).expanduser()
    if not inp.exists():
        raise SystemExit(f"Input not found: {inp}")

    wanted = {x.strip() for x in args.stores.split(",") if x.strip()}
    all_buckets = load_buckets(inp)
    reykjafell_overrides = load_reykjafell_overrides(Path(args.reykjafell_overrides).expanduser())
    johan_ronning_overrides = load_johan_ronning_overrides(Path(args.johan_ronning_overrides).expanduser())
    iskraft_overrides = load_iskraft_overrides(Path(args.iskraft_overrides).expanduser())

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (RafApp materials export)"})

    per_store_rows: dict[str, list[dict]] = {k: [] for k in ("johan_ronning", "iskraft", "reykjafell")}
    summaries: list[dict] = []

    if "reykjafell" in wanted:
        rows, summ = run_reykjafell(
            all_buckets.get("reykjafell", []),
            session,
            delay_s=args.reykjafell_delay,
            limit_buckets=args.limit_buckets,
            overrides=reykjafell_overrides,
        )
        per_store_rows["reykjafell"] = rows
        summaries.extend(summ)

    if "johan_ronning" in wanted:
        rows, summ = run_ronning_playwright(
            all_buckets.get("johan_ronning", []),
            delay_s=args.playwright_delay,
            limit_buckets=args.limit_buckets,
            overrides=johan_ronning_overrides,
            scroll_ms=args.ronning_scroll_ms,
        )
        per_store_rows["johan_ronning"] = rows
        summaries.extend(summ)

    if "iskraft" in wanted:
        rows, summ = run_iskraft_playwright(
            all_buckets.get("iskraft", []),
            delay_s=args.playwright_delay,
            scroll_ms=args.iskraft_scroll_ms,
            limit_buckets=args.limit_buckets,
            overrides=iskraft_overrides,
            headed=args.iskraft_headed,
        )
        per_store_rows["iskraft"] = rows
        summaries.extend(summ)

    _write_workbook(out, per_store_rows, summaries, wanted)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
