import asyncio
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal, init_db
from app.auth.jwt import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.models.technician import Technician, TechnicianStatus

async def seed_data():
    """
    Initializes default administrative accounts with zero demo complaints or technician records.
    All operational data (complaints, technicians, assignments) starts clean and empty.
    """
    await init_db()
    async with AsyncSessionLocal() as db:
        default_pwd = get_password_hash("password123")

        # 1. Authority Admin
        try:
            res = await db.execute(select(User).where(User.email == "admin@campus.edu"))
            admin_user = res.scalars().first()
            if not admin_user:
                admin_user = User(
                    user_id="usr_admin_01",
                    name="Facility Authority Admin",
                    email="admin@campus.edu",
                    password_hash=default_pwd,
                    role=UserRole.AUTHORITY,
                    created_at=datetime.utcnow()
                )
                db.add(admin_user)
            elif not verify_password("password123", admin_user.password_hash):
                admin_user.password_hash = default_pwd
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Seed note (admin): {e}")

        # 2. Principal (Executive Oversight)
        try:
            res = await db.execute(select(User).where(User.email == "principal@campus.edu"))
            principal_user = res.scalars().first()
            if not principal_user:
                principal_user = User(
                    user_id="usr_principal_01",
                    name="Campus Principal",
                    email="principal@campus.edu",
                    password_hash=default_pwd,
                    role=UserRole.PRINCIPAL,
                    created_at=datetime.utcnow()
                )
                db.add(principal_user)
            elif not verify_password("password123", principal_user.password_hash):
                principal_user.password_hash = default_pwd
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Seed note (principal): {e}")

        # 3. Demo Student (for complaint tracking testing)
        try:
            res = await db.execute(select(User).where(User.email == "student@campus.edu"))
            student_user = res.scalars().first()
            if not student_user:
                student_user = User(
                    user_id="usr_student_01",
                    name="Demo Student",
                    email="student@campus.edu",
                    password_hash=default_pwd,
                    role=UserRole.STUDENT,
                    created_at=datetime.utcnow()
                )
                db.add(student_user)
            elif not verify_password("password123", student_user.password_hash):
                student_user.password_hash = default_pwd
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Seed note (student): {e}")

        # 4. Demo Service Provider / Technician
        try:
            res = await db.execute(select(User).where(User.email == "provider@campus.edu"))
            provider_user = res.scalars().first()
            if not provider_user:
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
            elif not verify_password("password123", provider_user.password_hash):
                provider_user.password_hash = default_pwd
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Seed note (provider): {e}")

        print("Clean administrative accounts verified (admin@campus.edu, principal@campus.edu, student@campus.edu, provider@campus.edu).")

if __name__ == "__main__":
    asyncio.run(seed_data())
