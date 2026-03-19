"""Add structured address to client

Revision ID: f1f2f3f4f5f6
Revises: a1b2c3d4e5f6
Create Date: 2026-03-19 19:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1f2f3f4f5f6'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('clients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_street', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('company_postal_code', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('company_city', sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('clients', schema=None) as batch_op:
        batch_op.drop_column('company_city')
        batch_op.drop_column('company_postal_code')
        batch_op.drop_column('company_street')
