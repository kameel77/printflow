"""Add weight_kg to material_variants

Revision ID: a1b2c3d4e5f6
Revises: d4e5f6a7b8c9
Create Date: 2026-03-15 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('material_variants', schema=None) as batch_op:
        batch_op.add_column(sa.Column('weight_kg', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('material_variants', schema=None) as batch_op:
        batch_op.drop_column('weight_kg')
