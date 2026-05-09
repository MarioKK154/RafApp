"""Implement multi-tenancy with Tenant model and links to User and Project

Revision ID: 3f99c73405b3
Revises: 35c01f968c77
Create Date: 2025-06-08 12:36:33.514918

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '3f99c73405b3'
down_revision: Union[str, None] = '35c01f968c77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Duplicate of 35c01f968c77 (same tenants table + tenant_id columns + data backfill).
    # Kept as an empty revision so the linear history stays valid.
    pass


def downgrade() -> None:
    # Schema for tenants / tenant_id is owned by 35c01f968c77; do not undo it here.
    pass