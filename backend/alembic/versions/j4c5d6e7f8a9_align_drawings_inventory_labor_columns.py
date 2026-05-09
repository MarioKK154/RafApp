"""Align drawings, inventory_items, labor_catalog_items with ORM (missing columns).

Revision ID: j4c5d6e7f8a9
Revises: h3a4b5c6d7e8
Create Date: 2026-03-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "j4c5d6e7f8a9"
down_revision: Union[str, None] = "h3a4b5c6d7e8"
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

    # --- drawings: folder_id, tenant_id (backfill from project) ---
    dcols = _col_names(bind, "drawings")
    if dcols and "folder_id" not in dcols:
        op.add_column("drawings", sa.Column("folder_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_drawings_folder_id_drawing_folders",
            "drawings",
            "drawing_folders",
            ["folder_id"],
            ["id"],
        )
    dcols = _col_names(bind, "drawings")
    if dcols and "tenant_id" not in dcols:
        op.add_column("drawings", sa.Column("tenant_id", sa.Integer(), nullable=True))
        op.execute(
            sa.text(
                "UPDATE drawings SET tenant_id = "
                "(SELECT tenant_id FROM projects WHERE projects.id = drawings.project_id) "
                "WHERE tenant_id IS NULL"
            )
        )
        op.execute(
            sa.text(
                "UPDATE drawings SET tenant_id = (SELECT MIN(id) FROM tenants) "
                "WHERE tenant_id IS NULL"
            )
        )
        op.alter_column("drawings", "tenant_id", existing_type=sa.Integer(), nullable=False)
        op.create_foreign_key(
            "fk_drawings_tenant_id_tenants",
            "drawings",
            "tenants",
            ["tenant_id"],
            ["id"],
        )

    # --- inventory_items: category, subcategory ---
    icols = _col_names(bind, "inventory_items")
    if icols and "category" not in icols:
        op.add_column("inventory_items", sa.Column("category", sa.String(), nullable=True))
    if "ix_inventory_items_category" not in _index_names(bind, "inventory_items"):
        op.create_index(
            "ix_inventory_items_category",
            "inventory_items",
            ["category"],
            unique=False,
        )
    icols = _col_names(bind, "inventory_items")
    if icols and "subcategory" not in icols:
        op.add_column("inventory_items", sa.Column("subcategory", sa.String(), nullable=True))
    if "ix_inventory_items_subcategory" not in _index_names(bind, "inventory_items"):
        op.create_index(
            "ix_inventory_items_subcategory",
            "inventory_items",
            ["subcategory"],
            unique=False,
        )

    # --- labor_catalog_items ---
    lcols = _col_names(bind, "labor_catalog_items")
    if not lcols:
        return
    adds = [
        ("category", sa.Column("category", sa.String(), nullable=True)),
        ("recommended_item_ids", sa.Column("recommended_item_ids", sa.Text(), nullable=True)),
        ("main_category", sa.Column("main_category", sa.String(), nullable=True)),
        ("sub_category", sa.Column("sub_category", sa.String(), nullable=True)),
        ("conditions", sa.Column("conditions", sa.String(), nullable=True)),
        ("reference_price", sa.Column("reference_price", sa.Float(), nullable=True)),
        ("units_per_hour", sa.Column("units_per_hour", sa.Float(), nullable=True)),
    ]
    for name, col in adds:
        cur = _col_names(bind, "labor_catalog_items")
        if name not in cur:
            op.add_column("labor_catalog_items", col)
    if "ix_labor_catalog_items_main_category" not in _index_names(
        bind, "labor_catalog_items"
    ):
        op.create_index(
            "ix_labor_catalog_items_main_category",
            "labor_catalog_items",
            ["main_category"],
            unique=False,
        )
    if "ix_labor_catalog_items_sub_category" not in _index_names(
        bind, "labor_catalog_items"
    ):
        op.create_index(
            "ix_labor_catalog_items_sub_category",
            "labor_catalog_items",
            ["sub_category"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    for ix, tbl in (
        ("ix_labor_catalog_items_sub_category", "labor_catalog_items"),
        ("ix_labor_catalog_items_main_category", "labor_catalog_items"),
        ("ix_inventory_items_subcategory", "inventory_items"),
        ("ix_inventory_items_category", "inventory_items"),
    ):
        if ix in _index_names(bind, tbl):
            op.drop_index(ix, table_name=tbl)

    for name in (
        "units_per_hour",
        "reference_price",
        "conditions",
        "sub_category",
        "main_category",
        "recommended_item_ids",
        "category",
    ):
        lcols = _col_names(bind, "labor_catalog_items")
        if name in lcols:
            op.drop_column("labor_catalog_items", name)

    icols = _col_names(bind, "inventory_items")
    if "subcategory" in icols:
        op.drop_column("inventory_items", "subcategory")
    icols = _col_names(bind, "inventory_items")
    if "category" in icols:
        op.drop_column("inventory_items", "category")

    dcols = _col_names(bind, "drawings")
    if "tenant_id" in dcols:
        op.drop_constraint("fk_drawings_tenant_id_tenants", "drawings", type_="foreignkey")
        op.drop_column("drawings", "tenant_id")
    dcols = _col_names(bind, "drawings")
    if "folder_id" in dcols:
        op.drop_constraint(
            "fk_drawings_folder_id_drawing_folders", "drawings", type_="foreignkey"
        )
        op.drop_column("drawings", "folder_id")
