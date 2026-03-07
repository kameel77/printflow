"""Add max_bryt_width_cm to ProductTemplate

Revision ID: c1d2e3f4a5b6
Revises: b32a8e4df18b
Create Date: 2026-03-07 13:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'b32a8e4df18b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('max_bryt_width_cm', sa.Numeric(precision=10, scale=2), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.drop_column('max_bryt_width_cm')
