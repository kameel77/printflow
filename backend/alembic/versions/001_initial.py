"""Initial schema — all tables as of 2026-02-17.

Revision ID: 001_initial
Revises:
Create Date: 2026-02-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Materials ──
    op.create_table(
        "materials",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100)),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_materials_id", "materials", ["id"])

    op.create_table(
        "material_variants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("material_id", sa.Integer(), sa.ForeignKey("materials.id", ondelete="CASCADE")),
        sa.Column("width_cm", sa.Numeric(10, 2)),
        sa.Column("length_cm", sa.Numeric(10, 2)),
        sa.Column("cost_price_per_unit", sa.Numeric(10, 2), nullable=False),
        sa.Column("markup_percentage", sa.Numeric(5, 2), server_default="0.00"),
        sa.Column("unit", sa.String(10), nullable=False),
        sa.Column("margin_w_cm", sa.Numeric(10, 2), server_default="0.0"),
        sa.Column("margin_h_cm", sa.Numeric(10, 2), server_default="0.0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("tooltip_margin_w_cm", sa.String(500)),
        sa.Column("tooltip_margin_h_cm", sa.String(500)),
        sa.Column("tooltip_markup_percentage", sa.String(500)),
    )
    op.create_index("ix_material_variants_id", "material_variants", ["id"])

    # ── Processes ──
    calculation_method = sa.Enum("AREA", "LINEAR", "TIME", "UNIT", name="calculationmethod")
    op.create_table(
        "processes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("method", calculation_method, nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("setup_fee", sa.Numeric(10, 2), server_default="0.00"),
        sa.Column("internal_cost", sa.Numeric(10, 2)),
        sa.Column("margin_w_cm", sa.Numeric(10, 2), server_default="0.0"),
        sa.Column("margin_h_cm", sa.Numeric(10, 2), server_default="0.0"),
        sa.Column("unit", sa.String(10)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("tooltip_method", sa.String(500)),
        sa.Column("tooltip_unit_price", sa.String(500)),
        sa.Column("tooltip_setup_fee", sa.String(500)),
        sa.Column("tooltip_internal_cost", sa.String(500)),
        sa.Column("tooltip_margin_w_cm", sa.String(500)),
        sa.Column("tooltip_margin_h_cm", sa.String(500)),
    )
    op.create_index("ix_processes_id", "processes", ["id"])

    # ── Product Templates ──
    op.create_table(
        "product_templates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("default_margin_w_cm", sa.Numeric(10, 2), server_default="0.0"),
        sa.Column("default_margin_h_cm", sa.Numeric(10, 2), server_default="0.0"),
        sa.Column("default_overlap_cm", sa.Numeric(10, 2), server_default="1.0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("tooltip_margin_w_cm", sa.String(500)),
        sa.Column("tooltip_margin_h_cm", sa.String(500)),
        sa.Column("tooltip_overlap_cm", sa.String(500)),
    )
    op.create_index("ix_product_templates_id", "product_templates", ["id"])

    op.create_table(
        "template_components",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("product_templates.id", ondelete="CASCADE")),
        sa.Column("material_id", sa.Integer(), sa.ForeignKey("materials.id")),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("processes.id")),
        sa.Column("is_required", sa.Boolean(), server_default="true"),
        sa.Column("group_name", sa.String(100)),
        sa.Column("option_label", sa.String(255)),
        sa.Column("default_quantity_formula", sa.String(255)),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
    )
    op.create_index("ix_template_components_id", "template_components", ["id"])

    # ── Users ──
    user_role = sa.Enum("ADMIN", "SALES", "PRODUCTION", name="userrole")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("role", user_role, server_default="SALES"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("google_id", sa.String(255), unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_id", "users", ["id"])

    # ── Clients ──
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True),
        sa.Column("phone", sa.String(50)),
        sa.Column("company_details", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_clients_id", "clients", ["id"])

    # ── Quotes ──
    quote_status = sa.Enum("DRAFT", "SENT", "ACCEPTED", "REJECTED", "COMPLETED", name="quotestatus")
    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("status", quote_status, server_default="DRAFT"),
        sa.Column("lead_time_raw", sa.String(255)),
        sa.Column("total_price_net", sa.Numeric(12, 2)),
        sa.Column("margin_value", sa.Numeric(12, 2)),
        sa.Column("follow_up_count", sa.Integer(), server_default="0"),
        sa.Column("last_follow_up_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_quotes_id", "quotes", ["id"])

    op.create_table(
        "quote_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id", ondelete="CASCADE")),
        sa.Column("product_name", sa.String(255)),
        sa.Column("width_cm", sa.Numeric(10, 2)),
        sa.Column("height_cm", sa.Numeric(10, 2)),
        sa.Column("quantity", sa.Integer(), server_default="1"),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("product_templates.id")),
    )
    op.create_index("ix_quote_items_id", "quote_items", ["id"])

    op.create_table(
        "quote_components",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("quote_item_id", sa.Integer(), sa.ForeignKey("quote_items.id", ondelete="CASCADE")),
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("material_variants.id")),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("processes.id")),
        sa.Column("name_snapshot", sa.String(255)),
        sa.Column("calculated_quantity", sa.Numeric(12, 4)),
        sa.Column("unit_price_snapshot", sa.Numeric(10, 2)),
        sa.Column("total_price", sa.Numeric(10, 2)),
        sa.Column("is_from_option", sa.Boolean(), server_default="false"),
        sa.Column("tech_margin_applied_w", sa.Numeric(10, 2)),
        sa.Column("tech_margin_applied_h", sa.Numeric(10, 2)),
    )
    op.create_index("ix_quote_components_id", "quote_components", ["id"])

    # ── Audit Logs ──
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(255)),
        sa.Column("target_type", sa.String(50)),
        sa.Column("target_id", sa.Integer()),
        sa.Column("changes", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("quote_components")
    op.drop_table("quote_items")
    op.drop_table("quotes")
    op.drop_table("clients")
    op.drop_table("users")
    op.drop_table("template_components")
    op.drop_table("product_templates")
    op.drop_table("processes")
    op.drop_table("material_variants")
    op.drop_table("materials")
    sa.Enum(name="calculationmethod").drop(op.get_bind())
    sa.Enum(name="userrole").drop(op.get_bind())
    sa.Enum(name="quotestatus").drop(op.get_bind())
