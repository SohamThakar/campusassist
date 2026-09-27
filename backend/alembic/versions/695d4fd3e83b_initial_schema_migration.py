"""Initial_schema_migration

Revision ID: 695d4fd3e83b
Revises: 
Create Date: 2026-09-02 20:50:43.085455

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '695d4fd3e83b'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('role', sa.Enum('student', 'authority', 'provider', 'principal', name='userrole'), nullable=False, server_default='student'),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. technicians table
    op.create_table(
        'technicians',
        sa.Column('technician_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('business_name', sa.String(length=150), nullable=True),
        sa.Column('skills', sa.JSON(), nullable=False),
        sa.Column('service_area', sa.String(length=100), nullable=False, server_default='Main Campus'),
        sa.Column('availability', sa.JSON(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'verified', 'suspended', name='technicianstatus'), nullable=False, server_default='verified'),
        sa.Column('rating', sa.Float(), nullable=False, server_default='4.8'),
        sa.Column('current_workload', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('technician_id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_technicians_technician_id'), 'technicians', ['technician_id'], unique=False)

    # 3. master_issues table
    op.create_table(
        'master_issues',
        sa.Column('issue_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='open'),
        sa.Column('primary_complaint_id', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('issue_id')
    )
    op.create_index(op.f('ix_master_issues_issue_id'), 'master_issues', ['issue_id'], unique=False)

    # 4. complaints table (initial base schema before video/tracking migration a1b2c3d4e5f6)
    op.create_table(
        'complaints',
        sa.Column('complaint_id', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=False),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='Other'),
        sa.Column('priority', sa.String(length=50), nullable=False, server_default='Medium'),
        sa.Column('status', sa.Enum('submitted', 'approved', 'assigned', 'in_progress', 'completed', 'rejected', name='complaintstatus'), nullable=False, server_default='submitted'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('submitted_by_contact', sa.String(length=100), nullable=True),
        sa.Column('master_issue_id', sa.String(length=50), nullable=True),
        sa.Column('duplicate_of', sa.String(length=50), nullable=True),
        sa.Column('duplicate_status', sa.String(length=50), nullable=True, server_default='none'),
        sa.Column('duplicate_confidence', sa.Float(), nullable=True),
        sa.Column('duplicate_reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['master_issue_id'], ['master_issues.issue_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('complaint_id')
    )
    op.create_index(op.f('ix_complaints_complaint_id'), 'complaints', ['complaint_id'], unique=False)
    op.create_index(op.f('ix_complaints_status'), 'complaints', ['status'], unique=False)
    op.create_index(op.f('ix_complaints_master_issue_id'), 'complaints', ['master_issue_id'], unique=False)

    # 5. ai_analysis table
    op.create_table(
        'ai_analysis',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('complaint_id', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=50), nullable=False),
        sa.Column('recommended_provider_id', sa.String(length=50), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.95'),
        sa.Column('reasoning', sa.Text(), nullable=True),
        sa.Column('duplicate_of', sa.String(length=50), nullable=True),
        sa.Column('metadata_info', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.complaint_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recommended_provider_id'], ['technicians.technician_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('complaint_id')
    )

    # 6. assignments table
    op.create_table(
        'assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('complaint_id', sa.String(length=50), nullable=False),
        sa.Column('technician_id', sa.String(length=50), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'accepted', 'rejected', 'in_progress', 'completed', name='assignmentstatus'), nullable=False, server_default='pending'),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.complaint_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.technician_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. status_history table
    op.create_table(
        'status_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('complaint_id', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('changed_by', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['changed_by'], ['users.user_id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.complaint_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('link', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('status_history')
    op.drop_table('assignments')
    op.drop_table('ai_analysis')
    op.drop_index(op.f('ix_complaints_master_issue_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_status'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_complaint_id'), table_name='complaints')
    op.drop_table('complaints')
    op.drop_index(op.f('ix_master_issues_issue_id'), table_name='master_issues')
    op.drop_table('master_issues')
    op.drop_index(op.f('ix_technicians_technician_id'), table_name='technicians')
    op.drop_table('technicians')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_user_id'), table_name='users')
    op.drop_table('users')
