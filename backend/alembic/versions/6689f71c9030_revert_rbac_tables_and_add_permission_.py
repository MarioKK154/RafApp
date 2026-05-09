"""Revert RBAC tables and add permission_overrides column

Revision ID: 6689f71c9030
Revises: 44f00c347751
Create Date: 2025-11-05 11:15:00.000000 

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6689f71c9030'
down_revision: Union[str, None] = '44f00c347751'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# A custom name for our constraint to make it droppable
CONSTRAINT_NAME = 'fk_users_role_id'

# Define the ENUM type
userrole_enum = postgresql.ENUM('admin', 'project_manager', 'team_lead', 'regular_user', 'superuser', name='userrole')

def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    user_cols = {c["name"] for c in insp.get_columns("users")}

    op.execute(sa.text("DROP TABLE IF EXISTS user_permission_link CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS role_permission_link CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS roles CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS permissions CASCADE"))

    if "role_id" in user_cols:
        op.drop_column("users", "role_id")

    userrole_enum.create(bind, checkfirst=True)

    if "role" in user_cols:
        op.drop_column("users", "role")

    op.add_column(
        "users",
        sa.Column(
            "role",
            userrole_enum,
            server_default=sa.text("'regular_user'::userrole"),
            nullable=False,
        ),
    )

    if "permission_overrides" not in user_cols:
        op.add_column(
            "users",
            sa.Column(
                "permission_overrides",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=True,
            ),
        )


def downgrade() -> None:
    # ### Manually Re-ordered Downgrade Path ###
    
    # 1. Add the 'role_id' column back
    op.add_column('users', sa.Column('role_id', sa.INTEGER(), autoincrement=False, nullable=True))
    
    # 2. Create the 'permissions' and 'roles' tables
    op.create_table('permissions',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('key', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('description', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('id', name='permissions_pkey')
    )
    op.create_index(op.f('ix_permissions_key'), 'permissions', ['key'], unique=True)
    
    op.create_table('roles',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('name', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('tenant_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='roles_tenant_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='roles_pkey')
    )
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=False)

    # 3. Re-create the foreign key constraint
    op.create_foreign_key('users_role_id_fkey', 'users', 'roles', ['role_id'], ['id'])

    # 4. Re-create the linking tables
    op.create_table('user_permission_link',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('permission_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('has_permission', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], name='user_permission_link_permission_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='user_permission_link_user_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id', 'permission_id', name='user_permission_link_pkey')
    )
    op.create_table('role_permission_link',
    sa.Column('role_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('permission_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], name='role_permission_link_permission_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], name='role_permission_link_role_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('role_id', 'permission_id', name='role_permission_link_pkey')
    )
    
    # 5. Drop the columns we added in the upgrade
    op.drop_column('users', 'permission_overrides')
    op.drop_column('users', 'role')
    
    # --- THIS IS THE FIX ---
    # 6. Drop the ENUM type
    userrole_enum.drop(op.get_bind())
    # ### end Alembic commands ###