"""Refactor labor cost: drop single columns, create template_labor_entries table

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-03-26 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.drop_column('labor_hours')
        batch_op.drop_column('labor_difficulty')

    op.create_table(
        'template_labor_entries',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('product_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hours', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('difficulty', sa.Enum('EASY', 'MEDIUM', 'HARD', name='labordifficulty'), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_table('template_labor_entries')

    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('labor_hours', sa.Numeric(precision=10, scale=2), nullable=True))
        batch_op.add_column(sa.Column('labor_difficulty', sa.Enum('EASY', 'MEDIUM', 'HARD', name='labordifficulty'), nullable=True))
