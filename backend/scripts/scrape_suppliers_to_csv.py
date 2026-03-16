import argparse
import csv
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional

import requests
from bs4 import BeautifulSoup


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0 Safari/537.36"
)


@dataclass
class ProductRecord:
    main_category: str
    subcategory: Optional[str]
    sub_subcategory: Optional[str]
    name: str
    iskraft_url: Optional[str] = None
    ronning_url: Optional[str] = None
    reykjafell_url: Optional[str] = None


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


# -------- RONNING --------

def scrape_ronning_all(session: requests.Session, delay: float = 0.8) -> List[ProductRecord]:
    """
    Very generic spider for ronning.is.

    Strategy:
    - Start at /vorur (all products view if available).
    - Follow pagination via ?page=...
    - On each listing page, collect links with href containing '/vara/'.
    - For each product page, extract:
        * name
        * breadcrumb as main / sub / sub-sub
    """
    base = "https://www.ronning.is"
    seen_products: set[str] = set()
    records: List[ProductRecord] = []

    def iter_listing_pages() -> Iterable[str]:
        # Try simple paginated listing pattern
        page = 1
        while True:
            url = f"{base}/vorur?page={page}"
            resp = session.get(url, timeout=20)
            if resp.status_code != 200:
                break
            html = resp.text
            soup = BeautifulSoup(html, "html.parser")
            product_links = soup.select("a[href*='/vara/']")
            if not product_links:
                break
            yield html
            page += 1
            time.sleep(delay)

    for html in iter_listing_pages():
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select("a[href*='/vara/']"):
            href = a.get("href") or ""
            if not href:
                continue
            if not href.startswith("http"):
                href = base + href
            if href in seen_products:
                continue
            seen_products.add(href)

            try:
                r = session.get(href, timeout=20)
            except Exception:
                continue
            if r.status_code != 200:
                continue

            psoup = BeautifulSoup(r.text, "html.parser")

            # Name: try <h1> first
            name_tag = psoup.select_one("h1") or psoup.select_one("h2")
            name = (name_tag.get_text(strip=True) if name_tag else "").strip()
            if not name:
                continue

            # Breadcrumbs: look for common patterns
            crumbs = []
            crumb_nav = psoup.select_one("nav[aria-label='breadcrumb']") or psoup.select_one(".breadcrumb")
            if crumb_nav:
                for li in crumb_nav.select("li, a"):
                    text = li.get_text(strip=True)
                    if text:
                        crumbs.append(text)
            # Fallback: try small links near top
            if not crumbs:
                for a2 in psoup.select("a[href*='category'], a[href*='vorur']")[:5]:
                    text = a2.get_text(strip=True)
                    if text:
                        crumbs.append(text)

            main = crumbs[-3] if len(crumbs) >= 3 else (crumbs[-2] if len(crumbs) >= 2 else (crumbs[-1] if crumbs else "Uncategorized"))
            sub = crumbs[-2] if len(crumbs) >= 2 else None
            sub_sub = crumbs[-1] if len(crumbs) >= 1 else None

            records.append(
                ProductRecord(
                    main_category=main,
                    subcategory=sub,
                    sub_subcategory=sub_sub,
                    name=name,
                    ronning_url=href,
                )
            )
            time.sleep(delay)

    return records


# -------- REYKJAFELL --------

def scrape_reykjafell_all(
    session: requests.Session,
    delay: float = 0.8,
    customer_header: Optional[str] = None,
) -> List[ProductRecord]:
    """
    Spider for reykjafell.is using their public GraphQL endpoint.

    NOTE:
    - This uses the `allProducts` query body you captured from the browser.
    - The response currently does not include explicit category fields per product,
      so we import products with empty category fields. We can refine this later
      if the schema exposes categories/collections.
    """
    graphql_url = "https://j5wmlw60xg.execute-api.eu-central-1.amazonaws.com/prod/graphql"

    # Directly reuse the query string the frontend uses.
    all_products_query = (
        "query allProducts($input: ProductsFilterInput, $first: Int, $after: String) {\\n"
        "  products(input: $input, first: $first, after: $after) {\\n"
        "    edges {\\n"
        "      node {\\n"
        "        id\\n"
        "        title\\n"
        "        totalInventory\\n"
        "        allowBackorder\\n"
        "        flags\\n"
        "        variants {\\n"
        "          availableForSale\\n"
        "          sku\\n"
        "          unitPrice\\n"
        "          price\\n"
        "          images {\\n"
        "            alt\\n"
        "            url\\n"
        "            __typename\\n"
        "          }\\n"
        "          inventory {\\n"
        "            location\\n"
        "            quantity\\n"
        "            __typename\\n"
        "          }\\n"
        "          needsBackorder\\n"
        "          vendorItemNo\\n"
        "          __typename\\n"
        "        }\\n"
        "        unitPriceMeasurement {\\n"
        "          measuredType\\n"
        "          quantityUnit\\n"
        "          quantityValue\\n"
        "          minQuantityValue\\n"
        "          __typename\\n"
        "        }\\n"
        "        media {\\n"
        "          __typename\\n"
        "          ... on File {\\n"
        "            alt\\n"
        "            url\\n"
        "            title\\n"
        "            type\\n"
        "            __typename\\n"
        "          }\\n"
        "        }\\n"
        "        __typename\\n"
        "      }\\n"
        "      __typename\\n"
        "    }\\n"
        "    pageInfo {\\n"
        "      hasNextPage\\n"
        "      endCursor\\n"
        "      count\\n"
        "      __typename\\n"
        "    }\\n"
        "    facets {\\n"
        "      type\\n"
        "      key\\n"
        "      value\\n"
        "      __typename\\n"
        "    }\\n"
        "    __typename\\n"
        "  }\\n"
        "}\\n"
    )

    records: List[ProductRecord] = []
    cursor: Optional[str] = None

    while True:
        # Match the browser's payload: only include "after" once we have a real cursor.
        variables = {
            "input": {
                "categories": [],
                "hideBackorderProducts": False,
            },
            "first": 200,
        }
        if cursor:
            variables["after"] = cursor

        payload = {
            "operationName": "allProducts",
            "variables": variables,
            "query": all_products_query,
        }

        headers = {
            "Content-Type": "application/json",
            "Origin": "https://www.reykjafell.is",
            "Referer": "https://www.reykjafell.is/",
        }
        if customer_header:
            headers["Customer"] = customer_header

        try:
            resp = session.post(graphql_url, json=payload, headers = {
    "Content-Type": "application/json",
    "Origin": "https://www.reykjafell.is",
    "Referer": "https://www.reykjafell.is/",
    "Customer": "529",
    "Authorization": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjJjMjdhZmY1YzlkNGU1MzVkNWRjMmMwNWM1YTE2N2FlMmY1NjgxYzIiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiTWFyaW8gS2xhcmljIEt1a3V6IiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3JleWtqYWZlbGwtNGY4NjEiLCJhdWQiOiJyZXlramFmZWxsLTRmODYxIiwiYXV0aF90aW1lIjoxNzcyNDU3Njg3LCJ1c2VyX2lkIjoiZGN0OUZlQUJSaWhDNXV3QkphNjZPakl0WXlGMyIsInN1YiI6ImRjdDlGZUFCUmloQzV1d0JKYTY2T2pJdFl5RjMiLCJpYXQiOjE3NzI0NTc2ODcsImV4cCI6MTc3MjQ2MTI4NywiZW1haWwiOiJtYXJpb0B0ZW5naWxsZWhmLmlzIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsibWFyaW9AdGVuZ2lsbGVoZi5pcyJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.Hru48eqslxD1Yj0ol3_rF_eGNYuQzRvnSrncDdi11BbeQkgKn9zD6F2GqIQ-Y6xeJLu8ptrMOn79WpdYlIm9QUCBV-Jf_dFfiF-Ce33PKN2KwwILsYMTM-_UIxscG2KlkXHPXbCOB1xlZ4_ll7z5LBReHTJesolQVdZPxcPL8zgigPhmDI03FwV6-LAlfrzncf0shLh8KT1fyBt332il5aio13KKbmHjiXD73OKR4w-bABbrSBiixEIckMzWyCuWdj6rVw-P01CqVI3ciX0bdV24-FKPcrAD294sQMTR25tBmWeo_Wivq4xxQfIb60dtzMVnedVJHEQ4Du9lQ2UOUg",  # if present in DevTools
}, timeout=30)
        except Exception:
            break

        if resp.status_code != 200:
            break

        data = resp.json()
        products = data.get("data", {}).get("products", {})
        edges = products.get("edges", []) or []

        if not edges:
            break

        for edge in edges:
            node = edge.get("node") or {}
            title = (node.get("title") or "").strip()
            if not title:
                continue

            # We don't have a clean per-product URL from this query. We'll leave
            # the Reykjafell URL empty for now; it can be enriched later.
            records.append(
                ProductRecord(
                    main_category="",
                    subcategory=None,
                    sub_subcategory=None,
                    name=title,
                    reykjafell_url=None,
                )
            )

        page_info = products.get("pageInfo") or {}
        has_next = page_info.get("hasNextPage")
        cursor = page_info.get("endCursor")

        if not has_next or not cursor:
            break

        time.sleep(delay)

    return records


# -------- ISKRAFT --------

def scrape_iskraft_all(session: requests.Session, delay: float = 0.8) -> List[ProductRecord]:
    """
    Spider for iskraft.is.

    Strategy:
    - Start from a generic product search endpoint if available: /vorur or /product
      with simple ?page=n pagination.
    - Collect all /vara/ or /product/ links.
    - Extract name + breadcrumb per product.

    NOTE: This is intentionally conservative and may need small tweaks if HTML
    structure differs; it is much easier to adjust selectors than to build CSVs manually.
    """
    base = "https://www.iskraft.is"
    seen_products: set[str] = set()
    records: List[ProductRecord] = []

    def iter_listing_pages() -> Iterable[str]:
        page = 1
        while True:
            # Try a plausible all-products URL; adjust if needed.
            url = f"{base}/vorur?page={page}"
            resp = session.get(url, timeout=20)
            if resp.status_code != 200:
                break
            html = resp.text
            soup = BeautifulSoup(html, "html.parser")
            product_links = soup.select("a[href*='/vara/'], a[href*='/vorur/']")
            if not product_links:
                break
            yield html
            page += 1
            time.sleep(delay)

    for html in iter_listing_pages():
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select("a[href*='/vara/'], a[href*='/product/']"):
            href = a.get("href") or ""
            if not href:
                continue
            if not href.startswith("http"):
                href = base + href
            if href in seen_products:
                continue
            seen_products.add(href)

            try:
                r = session.get(href, timeout=20)
            except Exception:
                continue
            if r.status_code != 200:
                continue

            psoup = BeautifulSoup(r.text, "html.parser")
            name_tag = psoup.select_one("h1") or psoup.select_one("h2")
            name = (name_tag.get_text(strip=True) if name_tag else "").strip()
            if not name:
                continue

            crumbs = []
            crumb_nav = psoup.select_one("nav[aria-label='breadcrumb']") or psoup.select_one(".breadcrumb")
            if crumb_nav:
                for li in crumb_nav.select("li, a"):
                    text = li.get_text(strip=True)
                    if text:
                        crumbs.append(text)
            if not crumbs:
                for a2 in psoup.select("a[href*='voruflokkar'], a[href*='vorur']")[:5]:
                    text = a2.get_text(strip=True)
                    if text:
                        crumbs.append(text)

            main = crumbs[-3] if len(crumbs) >= 3 else (crumbs[-2] if len(crumbs) >= 2 else (crumbs[-1] if crumbs else "Uncategorized"))
            sub = crumbs[-2] if len(crumbs) >= 2 else None
            sub_sub = crumbs[-1] if len(crumbs) >= 1 else None

            records.append(
                ProductRecord(
                    main_category=main,
                    subcategory=sub,
                    sub_subcategory=sub_sub,
                    name=name,
                    iskraft_url=href,
                )
            )
            time.sleep(delay)

    return records


# -------- CSV EMIT --------

def write_csv(path: Path, records: List[ProductRecord]) -> None:
    with path.open("w", encoding="latin-1", newline="") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(
            [
                "Main category",
                "Subcategory",
                "Sub-subcategory",
                "Product",
                "Iskraft",
                "Ronning",
                "Reykjafell",
            ]
        )
        for r in records:
            writer.writerow(
                [
                    r.main_category or "",
                    r.subcategory or "",
                    r.sub_subcategory or "",
                    r.name,
                    r.iskraft_url or "",
                    r.ronning_url or "",
                    r.reykjafell_url or "",
                ]
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape supplier product catalogs into CSV for inventory import.")
    parser.add_argument(
        "--suppliers",
        choices=["iskraft", "ronning", "reykjafell", "all"],
        default="all",
        help="Which supplier catalog(s) to scrape.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="supplier_inventory.csv",
        help="Path to output CSV (semicolon-separated, compatible with import_inventory_from_csv.py).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.8,
        help="Seconds to sleep between HTTP requests.",
    )
    parser.add_argument(
        "--reykjafell-customer",
        type=str,
        default=None,
        help="Optional value for the 'Customer' header when calling Reykjafell GraphQL API.",
    )
    args = parser.parse_args()

    session = _session()
    all_records: List[ProductRecord] = []

    if args.suppliers in ("ronning", "all"):
        print("Scraping Ronning catalog...")
        ronning_records = scrape_ronning_all(session, delay=args.delay)
        print(f"  Collected {len(ronning_records)} Ronning products.")
        all_records.extend(ronning_records)

    if args.suppliers in ("reykjafell", "all"):
        print("Scraping Reykjafell catalog...")
        reykjafell_records = scrape_reykjafell_all(
            session,
            delay=args.delay,
            customer_header=args.reykjafell_customer,
        )
        print(f"  Collected {len(reykjafell_records)} Reykjafell products.")
        all_records.extend(reykjafell_records)

    if args.suppliers in ("iskraft", "all"):
        print("Scraping Iskraft catalog...")
        iskraft_records = scrape_iskraft_all(session, delay=args.delay)
        print(f"  Collected {len(iskraft_records)} Iskraft products.")
        all_records.extend(iskraft_records)

    if not all_records:
        print("No products scraped. You may need to adjust the listing URLs / selectors in scrape_suppliers_to_csv.py.")
        return

    out_path = Path(args.output).expanduser().resolve()
    write_csv(out_path, all_records)
    print(f"Wrote {len(all_records)} rows to {out_path}")
    print("Next step: run import_inventory_from_csv.py with this CSV to populate the RafApp inventory database.")


if __name__ == "__main__":
    main()

