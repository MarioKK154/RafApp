import sys
import os
import json
import time
from pathlib import Path
from typing import Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app import models
from deep_translator import GoogleTranslator

CACHE_FILE = Path(__file__).parent / 'translations_cache.json'

ELECTRICAL_GLOSSARY = {
    "tengill": "socket",
    "einfaldur tengill": "single socket",
    "tvöfaldur tengill": "double socket",
    "rofi": "switch",
    "samrofi": "changeover switch",
    "krossrofi": "intermediate switch",
    "kapall": "cable",
    "strengur": "power cable",
    "loftnetskapall": "antenna cable",
    "loftnet": "antenna",
    "stigi": "ladder",
    "strengstigi": "cable ladder",
    "renna": "tray",
    "strengrenna": "cable tray",
    "tenglarenna": "socket tray",
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
    "dós": "box",
    "tengidós": "junction box",
    "vegagdós": "wall box",
    "loftadós": "ceiling box",
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

def load_cache() -> Dict[str, str]:
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache: Dict[str, str]):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def fix_translation(original: str, translated: str) -> str:
    orig_lower = original.lower()
    trans_lower = translated.lower()
    if "link" in trans_lower and "tengill" in orig_lower:
        translated = translated.replace("Link", "Socket").replace("link", "socket")
    return translated

def translate_single(orig: str) -> tuple:
    translator = GoogleTranslator(source='is', target='en')
    retries = 3
    for attempt in range(retries):
        try:
            trans = translator.translate(orig)
            return orig, fix_translation(orig, trans)
        except Exception as e:
            time.sleep(1)
    return orig, orig

def main():
    print("Connecting to DB...")
    db = SessionLocal()
    
    unique_strings = set()
    items = db.query(models.LaborCatalogItem).all()
    conditions = db.query(models.LaborCatalogItemCondition).all()

    for item in items:
        if item.main_category: unique_strings.add(item.main_category)
        if item.sub_category: unique_strings.add(item.sub_category)
        if item.description: unique_strings.add(item.description)

    for cond in conditions:
        if cond.condition_description: unique_strings.add(cond.condition_description)

    unique_list = list(unique_strings)
    print(f"Found {len(unique_list)} unique strings to translate.")

    cache = load_cache()
    
    for text in unique_list:
        if text not in cache:
            lower_text = text.lower().strip()
            if lower_text in ELECTRICAL_GLOSSARY:
                cache[text] = ELECTRICAL_GLOSSARY[lower_text].capitalize()

    to_translate = [text for text in unique_list if text not in cache]
    print(f"{len(to_translate)} strings require API translation.")

    if to_translate:
        completed = 0
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(translate_single, t): t for t in to_translate}
            for future in as_completed(futures):
                orig, trans = future.result()
                cache[orig] = trans
                completed += 1
                if completed % 50 == 0:
                    print(f"Translated {completed}/{len(to_translate)} items...")
                    save_cache(cache)
        save_cache(cache)

    print("Applying translations to DB...")
    count = 0
    for item in items:
        changed = False
        if item.main_category and cache.get(item.main_category):
            item.main_category_en = cache[item.main_category]
            changed = True
        if item.sub_category and cache.get(item.sub_category):
            item.sub_category_en = cache[item.sub_category]
            changed = True
        if item.description and cache.get(item.description):
            item.description_en = cache[item.description]
            changed = True
        if changed:
            db.add(item)
            count += 1
    
    for cond in conditions:
        if cond.condition_description and cache.get(cond.condition_description):
            cond.condition_description_en = cache[cond.condition_description]
            db.add(cond)
            count += 1

    db.commit()
    print(f"Finished applying {count} translations.")

if __name__ == '__main__':
    main()
