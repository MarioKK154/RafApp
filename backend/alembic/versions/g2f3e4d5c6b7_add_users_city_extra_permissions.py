"""Add users.city and users.extra_permissions (align ORM with Postgres).

Revision ID: g2f3e4d5c6b7
Revises: f1a2b3c4d5e8
Create Date: 2026-03-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "g2f3e4d5c6b7"
down_revision: Union[str, None] = "f1a2b3c4d5e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_names(bind, table: str) -> set:
    insp = inspect(bind)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    names = _col_names(bind, "users")
    if not names:
        return
    if "city" not in names:
        op.add_column("users", sa.Column("city", sa.String(), nullable=True))
    if "extra_permissions" not in names:
        op.add_column("users", sa.Column("extra_permissions", sa.Text(), nullable=True))

    if bind.dialect.name != "postgresql":
        return

    names = _col_names(bind, "users")
    if "permission_overrides" not in names:
        return
    op.execute(
        sa.text(
            "UPDATE users SET extra_permissions = permission_overrides::text "
            "WHERE permission_overrides IS NOT NULL "
            "AND (extra_permissions IS NULL OR extra_permissions = '')"
        )
    )
    op.drop_column("users", "permission_overrides")


def downgrade() -> None:
    bind = op.get_bind()
    names = _col_names(bind, "users")
    if bind.dialect.name == "postgresql" and "permission_overrides" not in names:
        op.add_column(
            "users",
            sa.Column("permission_overrides", JSONB(astext_type=sa.Text()), nullable=True),
        )
    if "extra_permissions" in names:
        op.drop_column("users", "extra_permissions")
    names = _col_names(bind, "users")
    if "city" in names:
        op.drop_column("users", "city")
