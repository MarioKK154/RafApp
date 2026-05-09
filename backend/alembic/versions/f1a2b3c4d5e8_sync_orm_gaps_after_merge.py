"""Create missing ORM tables and columns (risk, tutorials, inventory i18n/SKUs, etc.).

Safe on Postgres and SQLite: uses inspector + checkfirst create_all.

Revision ID: f1a2b3c4d5e8
Revises: e8f9a0b1c2d3
Create Date: 2026-03-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "f1a2b3c4d5e8"
down_revision: Union[str, None] = "e8f9a0b1c2d3"
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


def _create_index_if_missing(table: str, index_name: str, columns: list, unique: bool = False) -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if table not in insp.get_table_names():
        return
    existing = {ix["name"] for ix in insp.get_indexes(table)}
    if index_name in existing:
        return
    op.create_index(index_name, table, columns, unique=unique)


def upgrade() -> None:
    # Register metadata with all ORM tables
    from app import models  # noqa: F401
    from app.database import Base

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)

    _add_column_if_missing(
        "users",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    _add_column_if_missing(
        "projects",
        sa.Column("work_load_ratio_codes", sa.Text(), nullable=True),
    )
    _add_column_if_missing(
        "offers",
        sa.Column("work_load_ratio_codes", sa.Text(), nullable=True),
    )

    for col in (
        sa.Column("name_en", sa.String(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("ronning_sku", sa.String(), nullable=True),
        sa.Column("iskraft_sku", sa.String(), nullable=True),
        sa.Column("reykjafell_sku", sa.String(), nullable=True),
    ):
        _add_column_if_missing("inventory_items", col)

    _create_index_if_missing("inventory_items", "ix_inventory_items_name_en", ["name_en"], unique=False)
    _create_index_if_missing("inventory_items", "ix_inventory_items_ronning_sku", ["ronning_sku"], unique=False)
    _create_index_if_missing("inventory_items", "ix_inventory_items_iskraft_sku", ["iskraft_sku"], unique=False)
    _create_index_if_missing("inventory_items", "ix_inventory_items_reykjafell_sku", ["reykjafell_sku"], unique=False)


def downgrade() -> None:
    # Downgrade is best-effort; tables created by create_all in upgrade are not dropped.
    bind = op.get_bind()
    if "inventory_items" in inspect(bind).get_table_names():
        for ix in (
            "ix_inventory_items_reykjafell_sku",
            "ix_inventory_items_iskraft_sku",
            "ix_inventory_items_ronning_sku",
            "ix_inventory_items_name_en",
        ):
            try:
                op.drop_index(ix, table_name="inventory_items")
            except Exception:
                pass
        for col in ("reykjafell_sku", "iskraft_sku", "ronning_sku", "description_en", "name_en"):
            if col in _col_names(bind, "inventory_items"):
                try:
                    op.drop_column("inventory_items", col)
                except Exception:
                    pass
    for tbl, col in (("offers", "work_load_ratio_codes"), ("projects", "work_load_ratio_codes")):
        if tbl in inspect(bind).get_table_names() and col in _col_names(bind, tbl):
            try:
                op.drop_column(tbl, col)
            except Exception:
                pass
    if "users" in inspect(bind).get_table_names() and "last_login_at" in _col_names(bind, "users"):
        try:
            op.drop_column("users", "last_login_at")
        except Exception:
            pass
