"""Drop unique constraint from material_variants.external_id

Revision ID: b32a8e4df18b
Revises: 9a8b1c2d3e4f
Create Date: 2026-03-01 20:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b32a8e4df18b'
down_revision: Union[str, None] = '9a8b1c2d3e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop unique index on external_id, recreate as standard index
    op.drop_index('ix_material_variants_external_id', table_name='material_variants')
    op.create_index('ix_material_variants_external_id', 'material_variants', ['external_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_material_variants_external_id', table_name='material_variants')
    op.create_index('ix_material_variants_external_id', 'material_variants', ['external_id'], unique=True)
