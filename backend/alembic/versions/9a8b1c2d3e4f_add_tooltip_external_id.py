"""Add tooltip_external_id

Revision ID: 9a8b1c2d3e4f
Revises: ef43289b387f
Create Date: 2026-03-01 18:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a8b1c2d3e4f'
down_revision: Union[str, None] = 'ef43289b387f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tooltip_external_id', sa.String(length=500), nullable=True))

    with op.batch_alter_table('material_variants', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tooltip_external_id', sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('material_variants', schema=None) as batch_op:
        batch_op.drop_column('tooltip_external_id')

    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.drop_column('tooltip_external_id')
