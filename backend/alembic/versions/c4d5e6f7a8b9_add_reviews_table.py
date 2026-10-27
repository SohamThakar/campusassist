"""add_reviews_table

Revision ID: c4d5e6f7a8b9
Revises: b3f1e2a4c5d6
Create Date: 2026-10-27 15:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c4d5e6f7a8b9'
down_revision = 'b3f1e2a4c5d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('complaint_id', sa.String(length=50), nullable=False),
        sa.Column('technician_id', sa.String(length=50), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.complaint_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.technician_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('complaint_id')
    )
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_reviews_complaint_id'), ['complaint_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_reviews_technician_id'), ['technician_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reviews_technician_id'))
        batch_op.drop_index(batch_op.f('ix_reviews_complaint_id'))
    op.drop_table('reviews')
