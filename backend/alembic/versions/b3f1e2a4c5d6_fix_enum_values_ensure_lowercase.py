"""fix_enum_values_ensure_lowercase

Root cause fix for:
  asyncpg.exceptions.InvalidTextRepresentationError:
  invalid input value for enum complaintstatus: "SUBMITTED"

SQLAlchemy SQLEnum(SomeStrEnum) without values_callable uses the Python
enum member .name (e.g. "SUBMITTED") instead of .value (e.g. "submitted")
when writing to PostgreSQL. The fix in app/models/*.py adds
  values_callable=lambda x: [e.value for e in x]
to all three SQLEnum columns (complaintstatus, assignmentstatus, userrole).

This migration ensures the PostgreSQL enum types contain ALL expected
lowercase values. The IF NOT EXISTS guard makes it safe to run on both:
  - Existing Render databases (already have correct values - no-op)
  - Fresh databases (supplements initial migration 695d4fd3e83b)

Revision ID: b3f1e2a4c5d6
Revises: a1b2c3d4e5f6
Create Date: 2026-09-27 21:11:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3f1e2a4c5d6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # complaintstatus enum - ensure all 6 lowercase values exist.
    op.execute("ALTER TYPE complaintstatus ADD VALUE IF NOT EXISTS 'submitted'")
    op.execute("ALTER TYPE complaintstatus ADD VALUE IF NOT EXISTS 'approved'")
    op.execute("ALTER TYPE complaintstatus ADD VALUE IF NOT EXISTS 'assigned'")
    op.execute("ALTER TYPE complaintstatus ADD VALUE IF NOT EXISTS 'in_progress'")
    op.execute("ALTER TYPE complaintstatus ADD VALUE IF NOT EXISTS 'completed'")
    op.execute("ALTER TYPE complaintstatus ADD VALUE IF NOT EXISTS 'rejected'")

    # assignmentstatus enum - ensure all 5 lowercase values exist.
    op.execute("ALTER TYPE assignmentstatus ADD VALUE IF NOT EXISTS 'pending'")
    op.execute("ALTER TYPE assignmentstatus ADD VALUE IF NOT EXISTS 'accepted'")
    op.execute("ALTER TYPE assignmentstatus ADD VALUE IF NOT EXISTS 'rejected'")
    op.execute("ALTER TYPE assignmentstatus ADD VALUE IF NOT EXISTS 'in_progress'")
    op.execute("ALTER TYPE assignmentstatus ADD VALUE IF NOT EXISTS 'completed'")

    # userrole enum - ensure all 4 lowercase values exist.
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'student'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'authority'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'provider'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'principal'")

    # technicianstatus enum - ensure all 3 lowercase values exist.
    op.execute("ALTER TYPE technicianstatus ADD VALUE IF NOT EXISTS 'pending'")
    op.execute("ALTER TYPE technicianstatus ADD VALUE IF NOT EXISTS 'verified'")
    op.execute("ALTER TYPE technicianstatus ADD VALUE IF NOT EXISTS 'suspended'")


def downgrade() -> None:
    # PostgreSQL does not support removing individual enum values.
    # Downgrade is intentionally a no-op.
    pass