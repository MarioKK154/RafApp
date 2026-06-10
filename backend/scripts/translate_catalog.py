import sys
import os
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app import models

ELECTRICAL_GLOSSARY = {
    "tengill": "socket",
    "rofi": "switch",
    "kapall": "cable",
    "strengur": "power cable",
    "loftnetskapall": "antenna cable",
    "loftnet": "antenna",
    "strengstigi": "cable ladder",
    "stigi": "ladder",
    "strengrenna": "cable tray",
    "tenglarenna": "socket tray",
    "renna": "tray",
    "tafla": "distribution board",
    "lampi": "light fixture",
    "ljós": "light",
    "innfelldur": "recessed",
    "utanáliggjandi": "surface-mounted",
    "vatnsheldur": "waterproof",
    "rakavarið": "moisture-proof",
    "þráðlaus": "wireless",
    "lýsing": "lighting",
    "lágspenna": "low voltage",
    "smáspenna": "extra-low voltage",
    "ljósleiðari": "fiber optic",
    "tengibox": "junction box",
    "skápur": "cabinet",
    "dimmir": "dimmer",
    "ídráttarrör": "conduit",
    "barki": "flexible conduit",
    "pípa": "pipe",
    "rör": "pipe",
    "beygja": "bend",
    "smella": "clip",
    "festing": "fastener",
    "viðhald": "maintenance",
    "tenglaefni": "wiring accessories",
    "skynjari": "sensor",
    "hreyfiskynjari": "motion sensor",
    "nærveruskynjari": "presence sensor",
    "reykskynjari": "smoke detector",
    "öryggi": "fuse/breaker",
    "lekastraumrofi": "RCD",
    "sjálfvar": "circuit breaker",
    "tengidós": "junction box",
    "vegagdós": "wall box",
    "loftadós": "ceiling box",
    "dós": "box",
    "bruni": "fire",
    "tenging": "connection",
    "vinnutafla": "temporary power board",
    "greining": "branching",
    "kross": "cross",
    "horn": "corner",
    "lok": "cover",
    "endapunktur": "endpoint",
    "mótor": "motor",
    "afl": "power",
    "aðstaða": "facilities",
    "tímagjald": "hourly rate",
    "yfirvinna": "overtime",
    "verkstjórn": "supervision",
    "almennt": "general",
    "lagnaleiðir": "cable routes",
    "lágspennukerfi": "low voltage systems",
    "lýsingarkerfi": "lighting systems",
    "sér- og stjórnkerfi": "special and control systems"
}

def translate_by_glossary(text: str) -> str:
    if not text: return text
    lower_text = text.lower()
    
    # Sort glossary by length so "strengstigi" matches before "stigi"
    sorted_keys = sorted(ELECTRICAL_GLOSSARY.keys(), key=len, reverse=True)
    
    translated = lower_text
    for is_word, en_word in ELECTRICAL_GLOSSARY.items():
        translated = translated.replace(is_word, en_word)
    
    return translated.capitalize()

def main():
    print("Connecting to DB...")
    db = SessionLocal()
    
    items = db.query(models.LaborCatalogItem).all()
    conditions = db.query(models.LaborCatalogItemCondition).all()

    print("Translating items using glossary...")
    count = 0
    for item in items:
        changed = False
        if item.main_category:
            item.main_category_en = translate_by_glossary(item.main_category)
            changed = True
        if item.sub_category:
            item.sub_category_en = translate_by_glossary(item.sub_category)
            changed = True
        if item.description:
            item.description_en = translate_by_glossary(item.description)
            changed = True
        if changed:
            db.add(item)
            count += 1
    
    for cond in conditions:
        if cond.condition_description:
            cond.condition_description_en = translate_by_glossary(cond.condition_description)
            db.add(cond)
            count += 1

    db.commit()
    print(f"Finished applying {count} translations instantly.")

if __name__ == '__main__':
    main()
