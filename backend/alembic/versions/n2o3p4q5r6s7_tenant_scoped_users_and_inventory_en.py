"""Tenant-scoped user email; inventory category/subcategory EN.

Revision ID: n2o3p4q5r6s7
Revises: m1n2o3p4q5r6
Create Date: 2026-05-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "n2o3p4q5r6s7"
down_revision: Union[str, None] = "m1n2o3p4q5r6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("inventory_items", sa.Column("category_en", sa.String(), nullable=True))
    op.add_column("inventory_items", sa.Column("subcategory_en", sa.String(), nullable=True))
    op.create_index(op.f("ix_inventory_items_category_en"), "inventory_items", ["category_en"], unique=False)
    op.create_index(op.f("ix_inventory_items_subcategory_en"), "inventory_items", ["subcategory_en"], unique=False)

    # Superusers need a tenant row for (tenant_id, email) uniqueness; bind to first tenant if any.
    op.execute(
        """
        UPDATE users SET tenant_id = (SELECT MIN(id) FROM tenants)
        WHERE tenant_id IS NULL AND is_superuser IS TRUE
        AND EXISTS (SELECT 1 FROM tenants)
        """
    )

    with op.batch_alter_table("users") as batch:
        batch.drop_index("ix_users_email")
        batch.create_index("ix_users_email", ["email"], unique=False)
        batch.drop_index("ix_users_employee_id")
        batch.create_index("ix_users_employee_id", ["employee_id"], unique=False)
        batch.drop_index("ix_users_kennitala")
        batch.create_index("ix_users_kennitala", ["kennitala"], unique=False)
        batch.create_unique_constraint("uq_users_tenant_email", ["tenant_id", "email"])
        batch.create_unique_constraint("uq_users_tenant_employee_id", ["tenant_id", "employee_id"])
        batch.create_unique_constraint("uq_users_tenant_kennitala", ["tenant_id", "kennitala"])


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_constraint("uq_users_tenant_kennitala", type_="unique")
        batch.drop_constraint("uq_users_tenant_employee_id", type_="unique")
        batch.drop_constraint("uq_users_tenant_email", type_="unique")
        batch.drop_index("ix_users_kennitala")
        batch.create_index("ix_users_kennitala", ["kennitala"], unique=True)
        batch.drop_index("ix_users_employee_id")
        batch.create_index("ix_users_employee_id", ["employee_id"], unique=True)
        batch.drop_index("ix_users_email")
        batch.create_index("ix_users_email", ["email"], unique=True)

    op.drop_index(op.f("ix_inventory_items_subcategory_en"), table_name="inventory_items")
    op.drop_index(op.f("ix_inventory_items_category_en"), table_name="inventory_items")
    op.drop_column("inventory_items", "subcategory_en")
    op.drop_column("inventory_items", "category_en")
