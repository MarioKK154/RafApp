"""Add projects.project_number, parent_id, commissioned_at, verified_by_admin.

Revision ID: h3a4b5c6d7e8
Revises: g2f3e4d5c6b7
Create Date: 2026-03-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "h3a4b5c6d7e8"
down_revision: Union[str, None] = "g2f3e4d5c6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_names(bind, table: str) -> set:
    insp = inspect(bind)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def _index_names(bind, table: str) -> set:
    insp = inspect(bind)
    if table not in insp.get_table_names():
        return set()
    return {ix["name"] for ix in insp.get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    names = _col_names(bind, "projects")
    if not names:
        return

    if "project_number" not in names:
        op.add_column("projects", sa.Column("project_number", sa.String(), nullable=True))
    ix = "ix_projects_project_number"
    if ix not in _index_names(bind, "projects"):
        op.create_index(ix, "projects", ["project_number"], unique=False)

    if "parent_id" not in names:
        op.add_column("projects", sa.Column("parent_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_projects_parent_id_projects",
            "projects",
            "projects",
            ["parent_id"],
            ["id"],
        )

    names = _col_names(bind, "projects")
    if "commissioned_at" not in names:
        op.add_column(
            "projects",
            sa.Column("commissioned_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "verified_by_admin" not in names:
        op.add_column(
            "projects",
            sa.Column(
                "verified_by_admin",
                sa.Boolean(),
                server_default=sa.false(),
                nullable=False,
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    names = _col_names(bind, "projects")
    if "verified_by_admin" in names:
        op.drop_column("projects", "verified_by_admin")
    names = _col_names(bind, "projects")
    if "commissioned_at" in names:
        op.drop_column("projects", "commissioned_at")
    names = _col_names(bind, "projects")
    if "parent_id" in names:
        op.drop_constraint("fk_projects_parent_id_projects", "projects", type_="foreignkey")
        op.drop_column("projects", "parent_id")
    ix = "ix_projects_project_number"
    if ix in _index_names(bind, "projects"):
        op.drop_index(ix, table_name="projects")
    names = _col_names(bind, "projects")
    if "project_number" in names:
        op.drop_column("projects", "project_number")
