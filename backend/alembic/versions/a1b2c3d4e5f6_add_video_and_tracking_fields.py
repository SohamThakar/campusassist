"""add_video_and_tracking_fields

Revision ID: a1b2c3d4e5f6
Revises: 695d4fd3e83b
Create Date: 2026-09-24 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '695d4fd3e83b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('complaints', schema=None) as batch_op:
        batch_op.add_column(sa.Column('video_url', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('video_filename', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('user_id', sa.String(length=50), nullable=True))
        batch_op.create_foreign_key('fk_complaints_users_user_id', 'users', ['user_id'], ['user_id'], ondelete='SET NULL')


def downgrade() -> None:
    with op.batch_alter_table('complaints', schema=None) as batch_op:
        batch_op.drop_constraint('fk_complaints_users_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')
        batch_op.drop_column('updated_at')
        batch_op.drop_column('video_filename')
        batch_op.drop_column('video_url')
