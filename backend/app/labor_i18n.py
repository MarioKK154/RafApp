"""English display labels for ar.is labor main categories (codes as stored in imports)."""

from __future__ import annotations

from typing import Optional

# Keys include common spelling variants (with/without Icelandic characters).
LABOR_MAIN_CATEGORY_EN: dict[str, str] = {
    "ALMENNT": "General & site",
    "LAGNALEIÐIR": "Cable routes & containment",
    "LAGNALEIDIR": "Cable routes & containment",
    "LAGSPENNUKERFI": "Low-voltage distribution",
    "LÝSINGARKERFI": "Lighting systems",
    "LYSINGARKERFI": "Lighting systems",
    "SÍR- OG STÝRNKERFI": "Control & automation systems",
    "SIR- OG STJORNKERFI": "Control & automation systems",
}


def main_category_label_en(main_category: Optional[str]) -> Optional[str]:
    if not main_category:
        return None
    key = main_category.strip()
    if key in LABOR_MAIN_CATEGORY_EN:
        return LABOR_MAIN_CATEGORY_EN[key]
    upper = key.upper()
    return LABOR_MAIN_CATEGORY_EN.get(upper)
