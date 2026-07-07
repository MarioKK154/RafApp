"""Labor catalog + risk template bilingual columns.

Revision ID: k9l8m7n6o5p4
Revises: j4c5d6e7f8a9
Create Date: 2026-03-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "k9l8m7n6o5p4"
down_revision: Union[str, None] = "j4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_names(bind, table: str) -> set:
    insp = inspect(bind)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def _add_column_if_missing(table: str, column: sa.Column) -> None:
    bind = op.get_bind()
    names = _col_names(bind, table)
    if not names or column.name in names:
        return
    op.add_column(table, column)


def upgrade() -> None:
    _add_column_if_missing("labor_catalog_items", sa.Column("description_en", sa.String(), nullable=True))
    _add_column_if_missing("labor_catalog_items", sa.Column("main_category_en", sa.String(), nullable=True))
    _add_column_if_missing("labor_catalog_items", sa.Column("sub_category_en", sa.String(), nullable=True))
    _add_column_if_missing(
        "labor_catalog_item_conditions",
        sa.Column("condition_description_en", sa.String(), nullable=True),
    )
    _add_column_if_missing("labor_main_category_refs", sa.Column("name_en", sa.String(), nullable=True))
    _add_column_if_missing("risk_templates", sa.Column("category_is", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("risk_templates", "category_is")
    op.drop_column("labor_main_category_refs", "name_en")
    op.drop_column("labor_catalog_item_conditions", "condition_description_en")
    op.drop_column("labor_catalog_items", "sub_category_en")
    op.drop_column("labor_catalog_items", "main_category_en")
    op.drop_column("labor_catalog_items", "description_en")
