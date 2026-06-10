import json
from app.database import get_db
from app.models import LaborCatalogItem, LaborCatalogItemCondition
from sqlalchemy.types import String

def restore_string(s):
    if not isinstance(s, str):
        return s
    
    # Try reversing the double-encoding
    try:
        # If it was double-encoded as utf-8 but interpreted as cp1252/latin-1
        # encoding as cp1252 gets back the original utf-8 bytes.
        raw_bytes = s.encode('cp1252')
        # decoding as utf-8 gets back the intended unicode string.
        restored = raw_bytes.decode('utf-8')
        return restored
    except (UnicodeEncodeError, UnicodeDecodeError):
        # If it can't be encoded as cp1252 (e.g. has true unicode characters)
        # or if the resulting bytes aren't valid utf-8, it doesn't have the bug!
        return s

def fix_model(db, model_class):
    items = db.query(model_class).all()
    fixed_count = 0
    string_cols = [c.name for c in model_class.__table__.columns if isinstance(c.type, String)]
    
    for i in items:
        changed = False
        for col in string_cols:
            val = getattr(i, col)
            if val is not None:
                new_val = restore_string(val)
                if new_val != val:
                    setattr(i, col, new_val)
                    changed = True
        if changed:
            fixed_count += 1
    return fixed_count

def main():
    db = next(get_db())
    
    c1 = fix_model(db, LaborCatalogItem)
    c2 = fix_model(db, LaborCatalogItemCondition)
            
    db.commit()
    print(f"Restored {c1} LaborCatalogItems and {c2} LaborCatalogItemConditions.")

if __name__ == '__main__':
    main()
