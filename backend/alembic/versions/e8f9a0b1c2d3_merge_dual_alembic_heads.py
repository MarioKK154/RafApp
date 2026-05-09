"""Merge dual Alembic heads (tenant background URLs vs event_type batch).

Revision ID: e8f9a0b1c2d3
Revises: b7e8123f4a91, c6c8d55a1504
Create Date: 2026-03-27

"""
from typing import Sequence, Union

revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, None, tuple] = ("b7e8123f4a91", "c6c8d55a1504")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
