"""Add labor cost fields to product_templates and create labor_rate_settings table

Revision ID: a2b3c4d5e6f7
Revises: f1f2f3f4f5f6
Create Date: 2026-03-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1f2f3f4f5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    labor_difficulty_enum = sa.Enum('EASY', 'MEDIUM', 'HARD', name='labordifficulty')
    labor_difficulty_enum.create(op.get_bind(), checkfirst=True)

    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('labor_hours', sa.Numeric(precision=10, scale=2), nullable=True))
        batch_op.add_column(sa.Column('labor_difficulty', sa.Enum('EASY', 'MEDIUM', 'HARD', name='labordifficulty'), nullable=True))

    op.create_table(
        'labor_rate_settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('easy_rate', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('medium_rate', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('hard_rate', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('labor_rate_settings')

    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.drop_column('labor_difficulty')
        batch_op.drop_column('labor_hours')

    sa.Enum(name='labordifficulty').drop(op.get_bind(), checkfirst=True)
