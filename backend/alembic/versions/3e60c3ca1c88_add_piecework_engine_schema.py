"""Add piecework engine schema

Revision ID: 3e60c3ca1c88
Revises: 8b3cce251263
Create Date: 2026-07-15 21:11:37.580216

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3e60c3ca1c88'
down_revision: Union[str, None] = '8b3cce251263'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema with safe check-first logic."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Create piecework_rates table
    if 'piecework_rates' not in tables:
        op.create_table(
            'piecework_rates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
            sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
            sa.Column('base_wage_rate', sa.Float(), nullable=False),
            sa.Column('tool_allowance', sa.Float(), nullable=False),
            sa.Column('holiday_pay', sa.Float(), nullable=False),
            sa.Column('attendance_pay', sa.Float(), nullable=False),
            sa.Column('clothing_pay', sa.Float(), nullable=False),
            sa.Column('sick_pay', sa.Float(), nullable=False),
            sa.Column('reiknitala', sa.Float(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_piecework_rates_id'), 'piecework_rates', ['id'], unique=False)

    # 2. Create piecework_task_catalog table
    if 'piecework_task_catalog' not in tables:
        op.create_table(
            'piecework_task_catalog',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('category', sa.String(), nullable=False),
            sa.Column('description_is', sa.String(), nullable=False),
            sa.Column('base_standard_hours', sa.Float(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_piecework_task_catalog_id'), 'piecework_task_catalog', ['id'], unique=False)

    # 3. Create project_installation_logs table
    if 'project_installation_logs' not in tables:
        op.create_table(
            'project_installation_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('project_id', sa.Integer(), nullable=False),
            sa.Column('catalog_task_id', sa.String(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('has_height_surcharge', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('has_concrete_surcharge', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('is_occupied_space', sa.Boolean(), nullable=True, server_default='false'),
            sa.ForeignKeyConstraint(['catalog_task_id'], ['piecework_task_catalog.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_project_installation_logs_id'), 'project_installation_logs', ['id'], unique=False)

    # 4. Add columns to projects table
    projects_columns = [col["name"] for col in inspector.get_columns("projects")]
    if 'is_certified' not in projects_columns:
        op.add_column('projects', sa.Column('is_certified', sa.Boolean(), nullable=True, server_default='false'))
    if 'certification_date' not in projects_columns:
        op.add_column('projects', sa.Column('certification_date', sa.DateTime(timezone=True), nullable=True))

    # 5. Add columns to time_logs table
    timelogs_columns = [col["name"] for col in inspector.get_columns("time_logs")]
    if 'actual_hours' not in timelogs_columns:
        op.add_column('time_logs', sa.Column('actual_hours', sa.Float(), nullable=True))
    if 'base_hourly_wage_paid' not in timelogs_columns:
        op.add_column('time_logs', sa.Column('base_hourly_wage_paid', sa.Float(), nullable=True))

    # 6. Add columns to offer_line_items & offers
    offer_line_items_columns = [col["name"] for col in inspector.get_columns("offer_line_items")]
    if 'labor_catalog_item_id' not in offer_line_items_columns:
        op.add_column('offer_line_items', sa.Column('labor_catalog_item_id', sa.Integer(), nullable=True))
        op.create_index(op.f('ix_offer_line_items_labor_catalog_item_id'), 'offer_line_items', ['labor_catalog_item_id'], unique=False)
        op.create_foreign_key(None, 'offer_line_items', 'labor_catalog_items', ['labor_catalog_item_id'], ['id'])
    if 'eining_value' not in offer_line_items_columns:
        op.add_column('offer_line_items', sa.Column('eining_value', sa.Float(), nullable=True))

    offers_columns = [col["name"] for col in inspector.get_columns("offers")]
    if 'verdlag_per_eining' not in offers_columns:
        op.add_column('offers', sa.Column('verdlag_per_eining', sa.Float(), nullable=True))

    # 7. Modify suggestions is_read and time_logs travel_hours constraints
    op.alter_column('suggestions', 'is_read',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               existing_server_default=sa.text('false'))
    op.alter_column('time_logs', 'travel_hours',
               existing_type=sa.DOUBLE_PRECISION(precision=53) if bind.dialect.name == "postgresql" else sa.Float(),
               nullable=False,
               existing_server_default=sa.text('0.0'))


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    op.alter_column('time_logs', 'travel_hours',
               existing_type=sa.DOUBLE_PRECISION(precision=53) if bind.dialect.name == "postgresql" else sa.Float(),
               nullable=True,
               existing_server_default=sa.text('0.0'))
    op.alter_column('suggestions', 'is_read',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text('false'))
    op.drop_column('offers', 'verdlag_per_eining')
    op.drop_constraint(None, 'offer_line_items', type_='foreignkey')
    op.drop_index(op.f('ix_offer_line_items_labor_catalog_item_id'), table_name='offer_line_items')
    op.drop_column('offer_line_items', 'eining_value')
    op.drop_column('offer_line_items', 'labor_catalog_item_id')
    op.drop_column('time_logs', 'base_hourly_wage_paid')
    op.drop_column('time_logs', 'actual_hours')
    op.drop_column('projects', 'certification_date')
    op.drop_column('projects', 'is_certified')
    op.drop_index(op.f('ix_project_installation_logs_id'), table_name='project_installation_logs')
    op.drop_table('project_installation_logs')
    op.drop_index(op.f('ix_piecework_task_catalog_id'), table_name='piecework_task_catalog')
    op.drop_table('piecework_task_catalog')
    op.drop_index(op.f('ix_piecework_rates_id'), table_name='piecework_rates')
    op.drop_table('piecework_rates')
