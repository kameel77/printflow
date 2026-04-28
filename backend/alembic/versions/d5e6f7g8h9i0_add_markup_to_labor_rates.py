"""add markup percentages to labor rate settings

Revision ID: d5e6f7g8h9i0
Revises: c4d5e6f7g8h9
Create Date: 2026-04-28 17:55:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'd5e6f7g8h9i0'
down_revision = 'c4d5e6f7g8h9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('labor_rate_settings', sa.Column('easy_markup', sa.Numeric(10, 2), nullable=False, server_default='0.00'))
    op.add_column('labor_rate_settings', sa.Column('medium_markup', sa.Numeric(10, 2), nullable=False, server_default='0.00'))
    op.add_column('labor_rate_settings', sa.Column('hard_markup', sa.Numeric(10, 2), nullable=False, server_default='0.00'))


def downgrade() -> None:
    op.drop_column('labor_rate_settings', 'hard_markup')
    op.drop_column('labor_rate_settings', 'medium_markup')
    op.drop_column('labor_rate_settings', 'easy_markup')
