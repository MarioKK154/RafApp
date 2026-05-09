from __future__ import annotations

import argparse
import math
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

import pandas as pd


STORE_INPUTS = {
    "ronning": Path.home() / "Desktop" / "ronning_data.xlsx",
    "iskraft": Path.home() / "Desktop" / "iskraft_data.xlsx",
    "reykjafell": Path.home() / "Desktop" / "reykjafell_data.xlsx",
}

STOP_WORDS = {
    "og",
    "med",
    "fyrir",
    "the",
    "and",
    "for",
    "til",
    "with",
    "af",
    "i",
    "a",
    "an",
    "mm",
}


@dataclass
class Product:
    store: str
    url: str
    description: str
    category: str
    subcategory: str
    sub_subcategory: str
    norm_desc: str
    tokens: set[str]
    code_tokens: set[str]
    cable_sigs: set[str]


@dataclass
class Anchor:
    product: Product
    row_idx: int


def clean_text(v: object) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    return str(v).strip()


def fold_text(s: str) -> str:
    t = unicodedata.normalize("NFKD", s.lower())
    return "".join(ch for ch in t if not unicodedata.combining(ch))


def norm_text(s: str) -> str:
    t = fold_text(s)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def token_set(s: str) -> set[str]:
    out = set()
    for t in norm_text(s).split():
        if len(t) < 2 or t in STOP_WORDS:
            continue
        out.add(t)
    return out


def extract_code_tokens(s: str) -> set[str]:
    out = set()
    raw = fold_text(s)
    for m in re.findall(r"[a-z0-9][a-z0-9\-./]{2,}[a-z0-9]", raw):
        t = m.strip("-./")
        if len(t) < 4:
            continue
        if any(ch.isdigit() for ch in t) and any(ch.isalpha() for ch in t):
            out.add(t.replace("/", "").replace(".", ""))
    return out


def extract_cable_sigs(s: str) -> set[str]:
    """Extract cable signatures like 5G1.5, 3x2.5, 0.6/1kV."""
    raw = fold_text(s).replace(",", ".")
    out: set[str] = set()

    # e.g. 5g1.5, 4x16
    for m in re.finditer(r"\b(\d{1,2})\s*([gx])\s*(\d{1,3}(?:\.\d{1,2})?)\b", raw):
        cores = int(m.group(1))
        sep = m.group(2)
        size = m.group(3)
        out.add(f"{cores}{sep}{size}")

    # e.g. 0.6/1kv, 6/10kv
    for m in re.finditer(r"\b(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*kv\b", raw):
        out.add(f"{m.group(1)}/{m.group(2)}kv")

    # e.g. mm2 indicators with preceding number pattern can be implicit token already
    return out


def make_product(store: str, row: pd.Series) -> Product | None:
    url = clean_text(row.get("Product URL"))
    desc = clean_text(row.get("Product description"))
    if not url or not desc:
        return None
    return Product(
        store=store,
        url=url,
        description=desc,
        category=clean_text(row.get("Category")),
        subcategory=clean_text(row.get("Subcategory")),
        sub_subcategory=clean_text(row.get("Sub-subcategory")),
        norm_desc=norm_text(desc),
        tokens=token_set(desc),
        code_tokens=extract_code_tokens(desc),
        cable_sigs=extract_cable_sigs(desc),
    )


def load_products(store: str, path: Path) -> list[Product]:
    df = pd.read_excel(path, sheet_name="Products")
    out: list[Product] = []
    for _, row in df.iterrows():
        p = make_product(store, row)
        if p:
            out.append(p)
    return out


def key_triplet(p: Product) -> tuple[str, str, str]:
    return (p.category, p.subcategory, p.sub_subcategory)


def build_anchor_index(
    anchors: list[Anchor],
) -> tuple[dict[str, set[int]], dict[str, float], dict[str, float], dict[str, float]]:
    token_freq: Counter[str] = Counter()
    code_freq: Counter[str] = Counter()
    sig_freq: Counter[str] = Counter()

    for a in anchors:
        token_freq.update(a.product.tokens)
        code_freq.update(a.product.code_tokens)
        sig_freq.update(a.product.cable_sigs)

    n = max(1, len(anchors))
    token_idf = {t: math.log(1 + n / (1 + f)) for t, f in token_freq.items()}
    code_idf = {t: math.log(1 + n / (1 + f)) for t, f in code_freq.items()}
    sig_idf = {t: math.log(1 + n / (1 + f)) for t, f in sig_freq.items()}

    inv: dict[str, set[int]] = defaultdict(set)
    for i, a in enumerate(anchors):
        for s in a.product.cable_sigs:
            inv[f"s:{s}"].add(i)
        for ct in a.product.code_tokens:
            if code_freq[ct] <= 220:
                inv[f"c:{ct}"].add(i)
        for t in a.product.tokens:
            if len(t) >= 5 and token_freq[t] <= 140:
                inv[f"t:{t}"].add(i)

    return inv, token_idf, code_idf, sig_idf


def weighted_jaccard(a: set[str], b: set[str], idf: dict[str, float], default_w: float) -> float:
    if not a and not b:
        return 0.0
    inter = a & b
    union = a | b
    num = sum(idf.get(t, default_w) for t in inter)
    den = sum(idf.get(t, default_w) for t in union)
    return num / den if den else 0.0


def product_similarity(
    p: Product,
    q: Product,
    token_idf: dict[str, float],
    code_idf: dict[str, float],
    sig_idf: dict[str, float],
) -> float:
    seq = SequenceMatcher(None, p.norm_desc, q.norm_desc).ratio()
    tok = weighted_jaccard(p.tokens, q.tokens, token_idf, default_w=0.7)
    code = weighted_jaccard(p.code_tokens, q.code_tokens, code_idf, default_w=1.0)
    sig = weighted_jaccard(p.cable_sigs, q.cable_sigs, sig_idf, default_w=1.2)

    # Cable signatures dominate when present; otherwise rely on codes+tokens.
    return 0.15 * seq + 0.25 * tok + 0.35 * code + 0.25 * sig


def assign_to_anchors(
    products: list[Product],
    anchors: list[Anchor],
    inv: dict[str, set[int]],
    token_idf: dict[str, float],
    code_idf: dict[str, float],
    sig_idf: dict[str, float],
    threshold: float,
) -> tuple[dict[int, Product], list[Product]]:
    assigned_best: dict[int, tuple[float, Product]] = {}
    unmatched: list[Product] = []

    for p in products:
        candidates: set[int] = set()
        for s in p.cable_sigs:
            candidates |= inv.get(f"s:{s}", set())
        for ct in p.code_tokens:
            candidates |= inv.get(f"c:{ct}", set())
        if not candidates:
            for t in p.tokens:
                if len(t) >= 5:
                    candidates |= inv.get(f"t:{t}", set())

        if not candidates:
            unmatched.append(p)
            continue

        best_idx = None
        best_score = 0.0
        for i in candidates:
            s = product_similarity(p, anchors[i].product, token_idf, code_idf, sig_idf)
            if s > best_score:
                best_score = s
                best_idx = i

        if best_idx is not None and best_score >= threshold:
            prev = assigned_best.get(best_idx)
            if prev is None or best_score > prev[0]:
                if prev is not None:
                    unmatched.append(prev[1])
                assigned_best[best_idx] = (best_score, p)
            else:
                unmatched.append(p)
        else:
            unmatched.append(p)

    return {k: v[1] for k, v in assigned_best.items()}, unmatched


def build_category_profiles(anchors: list[Anchor]) -> dict[tuple[str, str, str], dict[str, set[str]]]:
    prof: dict[tuple[str, str, str], dict[str, set[str]]] = {}
    for a in anchors:
        k = key_triplet(a.product)
        if k not in prof:
            prof[k] = {"tokens": set(), "codes": set(), "sigs": set()}
        prof[k]["tokens"].update(a.product.tokens)
        prof[k]["codes"].update(a.product.code_tokens)
        prof[k]["sigs"].update(a.product.cable_sigs)
    return prof


def classify_to_category(
    p: Product,
    profiles: dict[tuple[str, str, str], dict[str, set[str]]],
    token_idf: dict[str, float],
    code_idf: dict[str, float],
    sig_idf: dict[str, float],
) -> tuple[str, str, str]:
    best_k: tuple[str, str, str] | None = None
    best_s = -1.0

    for k, pr in profiles.items():
        tok = weighted_jaccard(p.tokens, pr["tokens"], token_idf, default_w=0.7)
        code = weighted_jaccard(p.code_tokens, pr["codes"], code_idf, default_w=1.0)
        sig = weighted_jaccard(p.cable_sigs, pr["sigs"], sig_idf, default_w=1.2)
        score = 0.25 * tok + 0.4 * code + 0.35 * sig
        if score > best_s:
            best_s = score
            best_k = k

    if best_k is None:
        return "", "", ""
    return best_k


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ronning", type=str, default=str(STORE_INPUTS["ronning"]))
    parser.add_argument("--iskraft", type=str, default=str(STORE_INPUTS["iskraft"]))
    parser.add_argument("--reykjafell", type=str, default=str(STORE_INPUTS["reykjafell"]))
    parser.add_argument("--category-store", type=str, default="iskraft", choices=["ronning", "iskraft", "reykjafell"])
    parser.add_argument("--threshold", type=float, default=0.56)
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path.home() / "Desktop" / "merged_products_3stores_categorized_all.xlsx"),
    )
    args = parser.parse_args()

    files = {
        "ronning": Path(args.ronning).expanduser(),
        "iskraft": Path(args.iskraft).expanduser(),
        "reykjafell": Path(args.reykjafell).expanduser(),
    }
    for store, fp in files.items():
        if not fp.exists():
            raise SystemExit(f"Missing input for {store}: {fp}")

    all_products: dict[str, list[Product]] = {k: load_products(k, v) for k, v in files.items()}

    anchors = [Anchor(product=p, row_idx=i) for i, p in enumerate(all_products[args.category_store])]
    inv, token_idf, code_idf, sig_idf = build_anchor_index(anchors)
    profiles = build_category_profiles(anchors)

    out_rows: list[dict] = []
    for a in anchors:
        out_rows.append(
            {
                "Category": a.product.category,
                "Subcategory": a.product.subcategory,
                "Sub-subcategory": a.product.sub_subcategory,
                "Product name/description": a.product.description,
                "Ronning URL": "",
                "Iskraft URL": a.product.url if a.product.store == "iskraft" else "",
                "Reykjafell URL": "",
            }
        )

    unmatched_all: list[Product] = []
    for store in ("ronning", "reykjafell"):
        assigned, unmatched = assign_to_anchors(
            all_products[store],
            anchors,
            inv,
            token_idf,
            code_idf,
            sig_idf,
            threshold=args.threshold,
        )
        for ai, p in assigned.items():
            col = "Ronning URL" if p.store == "ronning" else "Reykjafell URL"
            out_rows[ai][col] = p.url
        unmatched_all.extend(unmatched)

    # Every remaining product gets mapped into closest Iskraft category profile.
    for p in unmatched_all:
        cat, sub, subsub = classify_to_category(p, profiles, token_idf, code_idf, sig_idf)
        out_rows.append(
            {
                "Category": cat,
                "Subcategory": sub,
                "Sub-subcategory": subsub,
                "Product name/description": p.description,
                "Ronning URL": p.url if p.store == "ronning" else "",
                "Iskraft URL": "",
                "Reykjafell URL": p.url if p.store == "reykjafell" else "",
            }
        )

    out_rows.sort(
        key=lambda r: (
            norm_text(r["Category"]),
            norm_text(r["Subcategory"]),
            norm_text(r["Sub-subcategory"]),
            norm_text(r["Product name/description"]),
        )
    )

    df = pd.DataFrame(out_rows)
    out_path = Path(args.output).expanduser()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(out_path, index=False)

    hits = (
        (df["Ronning URL"].fillna("") != "").astype(int)
        + (df["Iskraft URL"].fillna("") != "").astype(int)
        + (df["Reykjafell URL"].fillna("") != "").astype(int)
    )
    empty_cat = int((df["Category"].fillna("") == "").sum())
    print(f"Wrote: {out_path}")
    print(f"Rows: {len(df)}")
    print(f"Rows with >=2 stores: {int((hits >= 2).sum())}")
    print(f"Rows with all 3 stores: {int((hits == 3).sum())}")
    print(f"Rows with empty Category: {empty_cat}")


if __name__ == "__main__":
    main()
