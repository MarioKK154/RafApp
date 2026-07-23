import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text, inspect
from app.config import get_settings

def run_backup_and_rls():
    settings = get_settings()
    db_url = settings.database_url
    print(f"Connecting to database to create backup and set up RLS policies...")

    engine = create_engine(db_url)
    inspector = inspect(engine)
    
    # 1. Create Backup Directory & Snapshot
    backups_dir = backend_dir / "backups"
    backups_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backups_dir / f"supabase_db_snapshot_{timestamp}.json"

    tables = inspector.get_table_names()
    print(f"Found {len(tables)} tables in database: {tables}")

    db_backup = {}
    with engine.connect() as conn:
        for table in tables:
            try:
                result = conn.execute(text(f'SELECT * FROM "{table}"'))
                columns = result.keys()
                rows = [dict(zip(columns, row)) for row in result.fetchall()]
                
                # Convert non-serializable objects (datetime, date, bytes, etc.) to string
                serializable_rows = []
                for row in rows:
                    clean_row = {}
                    for k, v in row.items():
                        if isinstance(v, (datetime)):
                            clean_row[k] = v.isoformat()
                        elif hasattr(v, 'isoformat'):
                            clean_row[k] = v.isoformat()
                        elif isinstance(v, bytes):
                            clean_row[k] = v.hex()
                        else:
                            clean_row[k] = v
                    serializable_rows.append(clean_row)

                db_backup[table] = serializable_rows
                print(f"  [OK] Backed up table '{table}': {len(serializable_rows)} rows")
            except Exception as e:
                print(f"  [WARN] Could not dump table '{table}': {e}")

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(db_backup, f, indent=2, ensure_ascii=False, default=str)

    print(f"\nFULL DATABASE SNAPSHOT BACKUP CREATED AT:\n  -> {backup_file.resolve()}\n")

    # 2. Implement RLS (Row Level Security) Policies on Tenant-Scoped Tables
    # Find all tables with 'tenant_id' column
    tenant_tables = []
    for table in tables:
        cols = [c['name'] for c in inspector.get_columns(table)]
        if 'tenant_id' in cols:
            tenant_tables.append(table)

    print(f"Tables identified with 'tenant_id' column for RLS ({len(tenant_tables)}):")
    for t in tenant_tables:
        print(f"  - {t}")

    print("\nApplying Row Level Security (RLS) policies...")

    with engine.begin() as conn:
        # Create helper function to get current tenant setting safely
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS integer AS $$
            BEGIN
                RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::integer;
            EXCEPTION WHEN OTHERS THEN
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql STABLE;
        """))

        for table in tenant_tables:
            print(f"Enabling RLS on '{table}'...")
            
            # Enable RLS on table
            conn.execute(text(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;'))

            # Drop existing policy if any to make script idempotent
            conn.execute(text(f'DROP POLICY IF EXISTS "{table}_tenant_isolation_policy" ON "{table}";'))
            conn.execute(text(f'DROP POLICY IF EXISTS "{table}_tenant_select_policy" ON "{table}";'))
            conn.execute(text(f'DROP POLICY IF EXISTS "{table}_tenant_all_policy" ON "{table}";'))

            # Create policy allowing full access if no tenant setting is set (admin/migration fallback)
            # or if table's tenant_id matches current tenant setting
            policy_sql = f"""
                CREATE POLICY "{table}_tenant_isolation_policy" ON "{table}"
                FOR ALL
                USING (
                    get_current_tenant_id() IS NULL 
                    OR tenant_id IS NULL 
                    OR tenant_id = get_current_tenant_id()
                )
                WITH CHECK (
                    get_current_tenant_id() IS NULL 
                    OR tenant_id IS NULL 
                    OR tenant_id = get_current_tenant_id()
                );
            """
            conn.execute(text(policy_sql))
            print(f"  [OK] RLS enabled & policy applied to '{table}'")

    print("\nSUCCESS: Database full snapshot backup created & RLS policies enabled for all multi-tenant tables!")

if __name__ == "__main__":
    run_backup_and_rls()
