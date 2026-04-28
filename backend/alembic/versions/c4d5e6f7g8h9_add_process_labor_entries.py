"""Add process labor entries, markup_percentage, rename hours to minutes

Revision ID: c4d5e6f7g8h9
Revises: b3c4d5e6f7a8
Create Date: 2026-04-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'c4d5e6f7g8h9'
down_revision = 'b3c4d5e6f7a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create process_labor_entries table
    op.execute("""
        CREATE TABLE process_labor_entries (
            id SERIAL PRIMARY KEY,
            process_id INTEGER REFERENCES processes(id) ON DELETE CASCADE,
            minutes NUMERIC(10,2) NOT NULL,
            difficulty labordifficulty NOT NULL,
            sort_order INTEGER DEFAULT 0
        )
    """)
    op.execute("CREATE INDEX ix_process_labor_entries_id ON process_labor_entries (id)")

    # 2. Add markup_percentage to processes
    op.add_column('processes', sa.Column('markup_percentage', sa.Numeric(5, 2), server_default='0.00'))

    # 3. Rename hours → minutes in template_labor_entries + convert data
    op.alter_column('template_labor_entries', 'hours', new_column_name='minutes')
    # Convert existing hours values to minutes (1 hour = 60 minutes)
    op.execute("UPDATE template_labor_entries SET minutes = minutes * 60")


def downgrade() -> None:
    # Reverse: convert minutes back to hours
    op.execute("UPDATE template_labor_entries SET minutes = minutes / 60")
    op.alter_column('template_labor_entries', 'minutes', new_column_name='hours')

    op.drop_column('processes', 'markup_percentage')
    op.drop_table('process_labor_entries')
