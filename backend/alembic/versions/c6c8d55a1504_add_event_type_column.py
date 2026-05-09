"""add_event_type_column

Revision ID: c6c8d55a1504
Revises: 6689f71c9030
Create Date: 2026-02-12 11:18:31.067140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c6c8d55a1504"
down_revision: Union[str, None] = "6689f71c9030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_eventtype = postgresql.ENUM(
    "meeting",
    "task",
    "custom",
    name="eventtype",
    create_type=True,
)


def upgrade() -> None:
    bind = op.get_bind()
    _eventtype.create(bind, checkfirst=True)
    op.add_column(
        "events",
        sa.Column(
            "event_type",
            _eventtype,
            server_default=sa.text("'custom'::eventtype"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_column("events", "event_type")
    _eventtype.drop(bind, checkfirst=True)
