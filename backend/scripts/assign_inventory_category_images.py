from __future__ import annotations

import hashlib
import re
from pathlib import Path

from PIL import Image, ImageDraw

from app.database import SessionLocal
from app import models


STATIC_DIR = Path(__file__).resolve().parents[1] / "app" / "static"
INV_IMG_DIR = STATIC_DIR / "inventory_images"


def _slugify(s: str) -> str:
    s = s.strip()
    s = re.sub(r"[^0-9a-zA-Z]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s[:60] if s else "uncategorized"


def _color_for_category(cat: str) -> tuple[int, int, int]:
    h = hashlib.md5(cat.encode("utf-8", errors="ignore")).hexdigest()
    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    # brighten a bit
    return (min(255, r + 30), min(255, g + 30), min(255, b + 30))


def _ensure_image_for_category(cat: str, path: Path, size: int = 256) -> None:
    if path.exists():
        return
    color = _color_for_category(cat)
    img = Image.new("RGB", (size, size), color=color)
    # Optional tiny mark to avoid purely flat look.
    draw = ImageDraw.Draw(img)
    draw.rectangle([size - 72, size - 72, size - 16, size - 16], fill=(255, 255, 255))
    img.save(path, format="PNG")


def main() -> None:
    session = SessionLocal()
    try:
        cats = (
            session.query(models.InventoryItem.category)
            .distinct()
            .all()
        )
        categories = [c for (c,) in cats if c and str(c).strip()]
        if not categories:
            categories = ["Uncategorized"]

        INV_IMG_DIR.mkdir(parents=True, exist_ok=True)

        cat_to_path = {}
        for cat in categories:
            slug = _slugify(str(cat))
            png_path = INV_IMG_DIR / f"{slug}.png"
            _ensure_image_for_category(str(cat), png_path)
            cat_to_path[cat] = f"/static/inventory_images/{slug}.png"

        updated = 0
        missing = 0

        # Only set if empty/NULL.
        items = session.query(models.InventoryItem).all()
        for it in items:
            if it.local_image_path and str(it.local_image_path).strip():
                continue
            missing += 1
            cat = it.category or "Uncategorized"
            img_src = cat_to_path.get(cat) or cat_to_path.get(categories[0]) or "/static/inventory_images/uncategorized.png"
            it.local_image_path = img_src
            session.add(it)
            updated += 1

        session.commit()
        print(f"Inventory images assigned. updated={updated} missing_before={missing}")
    finally:
        session.close()


if __name__ == "__main__":
    main()

