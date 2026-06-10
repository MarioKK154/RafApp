import json
from app.database import get_db
from app.models import LaborCatalogItem, LaborCatalogItemCondition
from sqlalchemy.types import String

def fix_string(s):
    if not isinstance(s, str):
        return s
    if not any(0x80 <= ord(c) <= 0x9f for c in s):
        return s
    try:
        return s.encode('latin-1').decode('cp1252', errors='ignore')
    except UnicodeEncodeError:
        res = []
        for c in s:
            if 0x80 <= ord(c) <= 0x9f:
                try:
                    res.append(c.encode('latin-1').decode('cp1252'))
                except:
                    pass
            else:
                res.append(c)
        return "".join(res)

def fix_model(db, model_class):
    items = db.query(model_class).all()
    fixed_count = 0
    string_cols = [c.name for c in model_class.__table__.columns if isinstance(c.type, String)]
    
    for i in items:
        changed = False
        for col in string_cols:
            val = getattr(i, col)
            if val is not None:
                new_val = fix_string(val)
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
    print(f"Fixed {c1} LaborCatalogItems and {c2} LaborCatalogItemConditions.")

if __name__ == '__main__':
    main()
