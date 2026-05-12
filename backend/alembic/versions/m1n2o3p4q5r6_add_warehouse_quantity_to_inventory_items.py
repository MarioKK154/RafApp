"""Add warehouse_quantity to inventory_items.

Revision ID: m1n2o3p4q5r6
Revises: l0m1n2o3p4q5
Create Date: 2026-05-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "m1n2o3p4q5r6"
down_revision: Union[str, None] = "l0m1n2o3p4q5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "inventory_items",
        sa.Column(
            "warehouse_quantity",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("inventory_items", "warehouse_quantity")
