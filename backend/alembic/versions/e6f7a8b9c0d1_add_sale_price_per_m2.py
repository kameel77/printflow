"""Add sale_price_per_m2 to ProductTemplate

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7g8h9i0
Create Date: 2026-06-10 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7g8h9i0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sale_price_per_m2', sa.Numeric(precision=10, scale=2), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.drop_column('sale_price_per_m2')
