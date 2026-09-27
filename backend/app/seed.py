import asyncio
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal, init_db
from app.auth.jwt import get_password_hash
from app.models.user import User, UserRole

async def seed_data():
    """
    Initializes default administrative accounts with zero demo complaints or technician records.
    All operational data (complaints, technicians, assignments) starts clean and empty.
    """
    await init_db()
    async with AsyncSessionLocal() as db:
        default_pwd = get_password_hash("password123")

        # 1. Authority Admin
        existing_admin = await db.execute(select(User).where(User.email == "admin@campus.edu"))
        if not existing_admin.scalars().first():
            admin_user = User(
                user_id="usr_admin_01",
                name="Facility Authority Admin",
                email="admin@campus.edu",
                password_hash=default_pwd,
                role=UserRole.AUTHORITY,
                created_at=datetime.utcnow()
            )
            db.add(admin_user)

        # 2. Principal (Executive Oversight)
        existing_principal = await db.execute(select(User).where(User.email == "principal@campus.edu"))
        if not existing_principal.scalars().first():
            principal_user = User(
                user_id="usr_principal_01",
                name="Campus Principal",
                email="principal@campus.edu",
                password_hash=default_pwd,
                role=UserRole.PRINCIPAL,
                created_at=datetime.utcnow()
            )
            db.add(principal_user)

        # 3. Demo Student (for complaint tracking testing)
        existing_student = await db.execute(select(User).where(User.email == "student@campus.edu"))
        if not existing_student.scalars().first():
            student_user = User(
                user_id="usr_student_01",
                name="Demo Student",
                email="student@campus.edu",
                password_hash=default_pwd,
                role=UserRole.STUDENT,
                created_at=datetime.utcnow()
            )
            db.add(student_user)

        # 4. Demo Service Provider / Technician
        existing_provider = await db.execute(select(User).where(User.email == "provider@campus.edu"))
        if not existing_provider.scalars().first():
            from app.models.technician import Technician, TechnicianStatus
            provider_user = User(
                user_id="usr_provider_01",
                name="Senior Maintenance Technician",
                email="provider@campus.edu",
                password_hash=default_pwd,
                role=UserRole.PROVIDER,
                created_at=datetime.utcnow()
            )
            db.add(provider_user)
            await db.flush()

            tech_profile = Technician(
                technician_id="tech_default_01",
                user_id=provider_user.user_id,
                business_name="Campus Facilities Support",
                skills=["Electrical", "Plumbing", "HVAC", "Structural", "Cleaning"],
                service_area="Main Campus",
                availability={"status": "available"},
                status=TechnicianStatus.VERIFIED,
                rating=4.9,
                current_workload=0
            )
            db.add(tech_profile)

        await db.commit()
        print("Clean administrative accounts verified (admin@campus.edu, principal@campus.edu, student@campus.edu, provider@campus.edu).")

if __name__ == "__main__":
    asyncio.run(seed_data())
