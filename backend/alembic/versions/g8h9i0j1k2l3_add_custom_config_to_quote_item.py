"""add custom config to quote item

Revision ID: g8h9i0j1k2l3
Revises: f7g8h9i0j1k2
Create Date: 2026-06-22 15:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g8h9i0j1k2l3'
down_revision: Union[str, None] = 'f7g8h9i0j1k2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Dodanie kolumny custom_config (JSON) do offer_variants
    with op.batch_alter_table('offer_variants', schema=None) as batch_op:
        batch_op.add_column(sa.Column('custom_config', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('offer_variants', schema=None) as batch_op:
        batch_op.drop_column('custom_config')
