import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import engine

SQL = '''
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole' AND e.enumlabel = 'project manager'
        ) THEN
            ALTER TYPE userrole ADD VALUE 'project manager';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole' AND e.enumlabel = 'team leader'
        ) THEN
            ALTER TYPE userrole ADD VALUE 'team leader';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole' AND e.enumlabel = 'regular user'
        ) THEN
            ALTER TYPE userrole ADD VALUE 'regular user';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole' AND e.enumlabel = 'electrician'
        ) THEN
            ALTER TYPE userrole ADD VALUE 'electrician';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole' AND e.enumlabel = 'subcontractor'
        ) THEN
            ALTER TYPE userrole ADD VALUE 'subcontractor';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole' AND e.enumlabel = 'accountant'
        ) THEN
            ALTER TYPE userrole ADD VALUE 'accountant';
        END IF;
    END IF;
END
$$;
'''

with engine.connect() as conn:
    conn.execution_options(isolation_level="AUTOCOMMIT").execute(text(SQL))

with engine.begin() as conn:
    conn.execute(text("UPDATE users SET role='project manager' WHERE role::text='project_manager'"))
    conn.execute(text("UPDATE users SET role='team leader' WHERE role::text IN ('team_lead','teamlead')"))
    conn.execute(text("UPDATE users SET role='regular user' WHERE role::text='regular_user'"))

print('Patched userrole enum values and normalized existing roles')
