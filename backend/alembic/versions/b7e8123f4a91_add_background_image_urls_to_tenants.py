"""Add background_image_urls to tenants

Revision ID: b7e8123f4a91
Revises: c6d9012e2798
Create Date: 2025-02-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'b7e8123f4a91'
down_revision: Union[str, None] = 'c6d9012e2798'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column('background_image_urls', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('tenants', 'background_image_urls')
