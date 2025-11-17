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
    # ### Manually Re-ordered Upgrade Path ###

    # 1. Drop the linking tables first
    op.drop_table('user_permission_link')
    op.drop_table('role_permission_link')

    # 2. Drop the foreign key constraint from 'users' to 'roles'
    try:
        op.drop_constraint('users_role_id_fkey', 'users', type_='foreignkey')
    except Exception:
        try:
            op.drop_constraint(CONSTRAINT_NAME, 'users', type_='foreignkey')
        except Exception as e:
            print(f"Could not drop foreign key constraint. This might be okay. Error: {e}")
    
    # 3. Now drop 'roles' and 'permissions'
    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_table('roles')
    op.drop_index(op.f('ix_permissions_key'), table_name='permissions')
    op.drop_table('permissions')
    
    # 4. Drop the old 'role_id' column
    op.drop_column('users', 'role_id')

    # --- THIS IS THE FIX ---
    # 5. Create the new ENUM type 'userrole' in the database
    userrole_enum.create(op.get_bind())
    
    # 6. Add the 'role' column using the new type
    op.add_column('users', sa.Column('role', userrole_enum, server_default='regular_user', nullable=False))
    
    # 7. Add the 'permission_overrides' column
    op.add_column('users', sa.Column('permission_overrides', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    # ### end Alembic commands ###


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