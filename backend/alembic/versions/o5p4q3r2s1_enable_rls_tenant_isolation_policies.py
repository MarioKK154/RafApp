"""enable_rls_tenant_isolation_policies

Revision ID: o5p4q3r2s1
Revises: n2o3p4q5r6s7
Create Date: 2026-07-23 22:51:30.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'o5p4q3r2s1'
down_revision = 'n2o3p4q5r6s7'
branch_labels = None
depends_on = None

TENANT_TABLES = [
    'tenant_labor_prices', 'tools', 'cars', 'events', 'drawing_folders',
    'tutorials', 'shops', 'customers', 'payslips', 'leave_requests',
    'expenses', 'billing_invoices', 'audit_logs', 'chat_threads',
    'tenant_integrations', 'offers', 'suggestions', 'labor_catalog_items',
    'drawings', 'projects', 'users'
]

def upgrade():
    # Helper function for tenant ID extraction
    op.execute("""
        CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS integer AS $$
        BEGIN
            RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::integer;
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql STABLE;
    """)

    for table in TENANT_TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;')
        op.execute(f'DROP POLICY IF EXISTS "{table}_tenant_isolation_policy" ON "{table}";')
        op.execute(f"""
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
        """)

def downgrade():
    for table in TENANT_TABLES:
        op.execute(f'DROP POLICY IF EXISTS "{table}_tenant_isolation_policy" ON "{table}";')
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY;')
    op.execute('DROP FUNCTION IF EXISTS get_current_tenant_id();')
