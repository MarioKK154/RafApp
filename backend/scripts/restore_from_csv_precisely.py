import json
import pandas as pd
from app.database import get_db
from app.models import LaborCatalogItem, LaborCatalogItemCondition
from sqlalchemy.types import String

def simulate_db_corruption(s_utf8):
    if not isinstance(s_utf8, str) or not s_utf8:
        return s_utf8
        
    try:
        s_latin = s_utf8.encode('utf-8').decode('latin-1')
    except:
        return s_utf8
        
    res1 = []
    for c in s_latin:
        if 0x80 <= ord(c) <= 0x9f:
            try:
                res1.append(c.encode('latin-1').decode('cp1252'))
            except:
                pass
        else:
            res1.append(c)
    s_fixed = "".join(res1)
    
    try:
        raw_bytes = s_fixed.encode('cp1252')
        s_restored = raw_bytes.decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        s_restored = s_fixed
        
    return s_restored

def main():
    db = next(get_db())
    
    # Read perfect CSV
    df = pd.read_csv('../scripts/labor_cost_export.csv', sep=',', encoding='utf-8')
    
    # Build mapping
    mapping = {}
    for col in ['Item', 'Main_category', 'Sub_category', 'Conditions']:
        if col not in df.columns:
            continue
        for val in df[col].dropna().unique():
            val = str(val).strip()
            corrupted = simulate_db_corruption(val)
            if corrupted != val:
                mapping[corrupted] = val
                
    # Extra check for double-corrupted edge cases
    # Some strings might have slightly different whitespace trimming, 
    # but the unique token mapping should handle most isolated phrases perfectly.
    
    print(f"Generated {len(mapping)} reverse mapping rules.")
    # Show a few
    for k in list(mapping.keys())[:5]:
        print(f"'{k}' -> '{mapping[k]}'")
        
    # Apply mapping
    def apply_map(s):
        if not s: return s
        if s in mapping: return mapping[s]
        # Also try to replace substrings if it's a longer text that contains the words
        # but exact match is much safer. We'll do exact match first.
        return s

    fixed_items = 0
    items = db.query(LaborCatalogItem).all()
    string_cols = [c.name for c in LaborCatalogItem.__table__.columns if isinstance(c.type, String) and not c.name.endswith('_en')]
    for i in items:
        changed = False
        for col in string_cols:
            val = getattr(i, col)
            if val is not None:
                new_val = apply_map(val)
                if new_val != val:
                    setattr(i, col, new_val)
                    changed = True
        if changed:
            fixed_items += 1
            
    fixed_conds = 0
    conds = db.query(LaborCatalogItemCondition).all()
    string_cols_cond = [c.name for c in LaborCatalogItemCondition.__table__.columns if isinstance(c.type, String) and not c.name.endswith('_en')]
    for i in conds:
        changed = False
        for col in string_cols_cond:
            val = getattr(i, col)
            if val is not None:
                new_val = apply_map(val)
                if new_val != val:
                    setattr(i, col, new_val)
                    changed = True
        if changed:
            fixed_conds += 1
            
    db.commit()
    print(f"Fixed {fixed_items} LaborCatalogItems and {fixed_conds} LaborCatalogItemConditions.")

if __name__ == '__main__':
    main()
