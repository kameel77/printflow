"""add product categories

Revision ID: f7g8h9i0j1k2
Revises: e6f7a8b9c0d1
Create Date: 2026-06-22 13:41:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7g8h9i0j1k2'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Utworzenie tabeli product_categories
    op.create_table('product_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_categories_id'), 'product_categories', ['id'], unique=False)

    # 2. Dodanie kategorii domyślnej
    op.execute(
        "INSERT INTO product_categories (name, description, sort_order, is_active) "
        "VALUES ('Ogólne', 'Domyślna kategoria dla istniejących produktów', 0, true)"
    )

    # 3. Dodanie kolumny category_id do product_templates
    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_product_templates_category_id', 'product_categories', ['category_id'], ['id'])

    # 4. Przypisanie domyślnej kategorii do wszystkich istniejących szablonów
    op.execute(
        "UPDATE product_templates SET category_id = (SELECT id FROM product_categories WHERE name = 'Ogólne' LIMIT 1)"
    )


def downgrade() -> None:
    with op.batch_alter_table('product_templates', schema=None) as batch_op:
        batch_op.drop_constraint('fk_product_templates_category_id', type_='foreignkey')
        batch_op.drop_column('category_id')

    op.drop_index(op.f('ix_product_categories_id'), table_name='product_categories')
    op.drop_table('product_categories')
