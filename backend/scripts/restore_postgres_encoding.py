# backend/scripts/restore_postgres_encoding.py
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db
from app.models import InventoryItem
import sqlalchemy

def restore_string(s):
    if not isinstance(s, str):
        return s
    
    # Check if U+00C3 or U+00C2 is present. If not, it doesn't have the double-encoding bug.
    if not any(ord(c) in (0xc2, 0xc3) for c in s):
        return s
        
    try:
        # Latin-1 will preserve the raw bytes exactly (1-to-1 mapping for chars 0-255).
        raw_bytes = s.encode('latin-1')
        # Decode as utf-8 to restore the actual double-encoded character.
        restored = raw_bytes.decode('utf-8')
        return restored
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s

def main():
    db = next(get_db())
    
    items = db.query(InventoryItem).all()
    fixed_count = 0
    
    string_cols = [c.name for c in InventoryItem.__table__.columns if isinstance(c.type, sqlalchemy.types.String)]
    
    print(f"Checking {len(items)} InventoryItems...")
    for item in items:
        changed = False
        for col in string_cols:
            val = getattr(item, col)
            if val is not None:
                new_val = restore_string(val)
                if new_val != val:
                    setattr(item, col, new_val)
                    changed = True
        if changed:
            fixed_count += 1
            
    db.commit()
    print(f"Successfully fixed encoding for {fixed_count} InventoryItems in PostgreSQL!")

if __name__ == '__main__':
    main()
