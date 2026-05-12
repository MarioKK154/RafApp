"""
Helpers for catalog search: cable-style token variants (e.g. 3g2,5 vs 3x2.5).
"""
from __future__ import annotations

import re
from typing import List, Optional

_MAX_PATTERNS = 32

# g vs x between digits (multi-core cable notation)
_GX_BETWEEN_DIGITS = re.compile(r"(?<=\d)([gGxX])(?=\d)")


def escape_like_fragment(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def flip_gx_between_digits(s: str) -> str:
    def repl(m: re.Match[str]) -> str:
        return "x" if m.group(1).lower() == "g" else "g"

    return _GX_BETWEEN_DIGITS.sub(repl, s)


def inventory_search_like_patterns(raw: Optional[str]) -> List[str]:
    """
    Build a small set of OR-d ILIKE substrings from one user query.

    Examples:
      "3g2,5" → includes 3g2,5, 3g2.5, 3x2,5, 3x2.5 (and compact forms).
    """
    if not raw or not str(raw).strip():
        return []
    trimmed = str(raw).strip().lower()

    variants: set[str] = set()

    spaced = re.sub(r"\s+", " ", trimmed)
    variants.add(spaced)
    compact = re.sub(r"\s+", "", spaced)
    if compact:
        variants.add(compact)

    # Comma vs dot (decimal separator in EU vs US style product codes)
    comma_dot: set[str] = set()
    for v in list(variants):
        if not v:
            continue
        comma_dot.add(v)
        comma_dot.add(v.replace(",", "."))
        comma_dot.add(v.replace(".", ","))
    variants.update(comma_dot)

    # Digit-bounded g ↔ x
    gx_set: set[str] = set()
    for v in list(variants):
        if not v:
            continue
        gx_set.add(v)
        flipped = flip_gx_between_digits(v)
        if flipped != v:
            gx_set.add(flipped)
    variants.update(gx_set)

    # Repeat comma/dot after gx flips
    final: set[str] = set()
    for v in variants:
        if not v:
            continue
        final.add(v)
        final.add(v.replace(",", "."))
        final.add(v.replace(".", ","))

    out = sorted({p for p in final if p}, key=len, reverse=True)
    return out[:_MAX_PATTERNS]
