"""Add offer management tables and extend clients

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b6
Create Date: 2026-03-08 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extend clients table ──
    with op.batch_alter_table('clients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_name', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('company_nip', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('company_address', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.drop_column('company_details')

    # ── Create offers table ──
    op.create_table(
        'offers',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('token', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.id'), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', name='offerstatus'), default='DRAFT'),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('internal_note', sa.Text(), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('client_comment', sa.Text(), nullable=True),
        sa.Column('accepted_variant_id', sa.Integer(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('viewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('view_count', sa.Integer(), default=0),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── Create offer_variants table ──
    op.create_table(
        'offer_variants',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('offer_id', sa.Integer(), sa.ForeignKey('offers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('is_recommended', sa.Boolean(), default=False),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('product_templates.id'), nullable=True),
        sa.Column('width_cm', sa.Numeric(10, 2), nullable=True),
        sa.Column('height_cm', sa.Numeric(10, 2), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('total_price_net', sa.Numeric(12, 2), nullable=True),
        sa.Column('total_price_gross', sa.Numeric(12, 2), nullable=True),
        sa.Column('calculation_snapshot', sa.JSON(), nullable=True),
        sa.Column('sort_order', sa.Integer(), default=0),
    )

    # ── Create offer_variant_components table ──
    op.create_table(
        'offer_variant_components',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('variant_id', sa.Integer(), sa.ForeignKey('offer_variants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name_snapshot', sa.String(255), nullable=True),
        sa.Column('type', sa.String(20), nullable=True),
        sa.Column('quantity', sa.Numeric(12, 4), nullable=True),
        sa.Column('unit', sa.String(20), nullable=True),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('total_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('visible_to_client', sa.Boolean(), default=True),
    )

    # ── Create offer_tracking table ──
    op.create_table(
        'offer_tracking',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('offer_id', sa.Integer(), sa.ForeignKey('offers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('offer_tracking')
    op.drop_table('offer_variant_components')
    op.drop_table('offer_variants')
    op.drop_table('offers')

    # Remove enum type
    op.execute("DROP TYPE IF EXISTS offerstatus")

    # Restore clients table
    with op.batch_alter_table('clients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_details', sa.Text(), nullable=True))
        batch_op.drop_column('updated_at')
        batch_op.drop_column('notes')
        batch_op.drop_column('company_address')
        batch_op.drop_column('company_nip')
        batch_op.drop_column('company_name')
