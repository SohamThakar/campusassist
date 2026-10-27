import os
# Force local sqlite for local test execution
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./campus_ai.db"
os.environ["ENVIRONMENT"] = "development"

import asyncio
import sys
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.models.complaint import Complaint, ComplaintStatus
from app.models.technician import Technician, TechnicianStatus
from app.models.assignment import Assignment, AssignmentStatus
from app.models.review import Review
from app.routers.complaints import submit_complaint_review, get_complaint_review
from app.schemas.review import ReviewCreate
from app.routers.analytics import get_principal_analytics

async def run_review_e2e_test():
    print("=== Starting Review System End-to-End Test (SQLite Local) ===")
    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Find or create technician
        tech_res = await session.execute(
            select(Technician).options(selectinload(Technician.user))
        )
        tech = tech_res.scalars().first()
        if not tech:
            user = User(
                user_id="tech_test_user",
                email="tech_test@campus.edu",
                name="Suresh Verma",
                role=UserRole.PROVIDER,
                is_active=True
            )
            session.add(user)
            await session.flush()
            tech = Technician(
                technician_id="TECH-101",
                user_id=user.user_id,
                business_name="Campus HVAC Services",
                skills=["HVAC", "Electrical"],
                status=TechnicianStatus.VERIFIED,
                rating=4.8,
                current_workload=0
            )
            session.add(tech)
            await session.commit()
            await session.refresh(tech)

        print(f"Using technician: {tech.technician_id} (Initial rating: {tech.rating})")

        # 2. Create a test completed complaint
        test_id = f"#TEST-REV-{int(datetime.utcnow().timestamp())}"
        complaint = Complaint(
            complaint_id=test_id,
            description="AC fan making buzzing noise in Seminar Hall B",
            location="Main Campus, Seminar Hall B",
            category="HVAC",
            priority="Medium",
            status=ComplaintStatus.COMPLETED,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(complaint)
        await session.flush()

        # 3. Create completed assignment
        assignment = Assignment(
            complaint_id=test_id,
            technician_id=tech.technician_id,
            assigned_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            status=AssignmentStatus.COMPLETED
        )
        session.add(assignment)
        await session.commit()
        print(f"Created completed test complaint: {test_id} assigned to {tech.technician_id}")

        # 4. Student submits rating & review
        review_data = ReviewCreate(
            rating=5,
            comment="Technician arrived on time and fixed the AC motor cleanly. Great service!",
            technician_id=tech.technician_id
        )

        review_out = await submit_complaint_review(
            complaint_id=test_id,
            review_in=review_data,
            db=session
        )

        print(f"Review submitted successfully:")
        print(f"  - Rating: {review_out.rating} stars")
        print(f"  - Worker: {review_out.technician_name}")
        print(f"  - Comment: {review_out.comment}")

        # 5. Verify review via get_complaint_review
        fetched_review = await get_complaint_review(complaint_id=test_id, db=session)
        assert fetched_review.rating == 5
        print(f"Verified review retrieval for {test_id}: OK")

        # 6. Verify technician updated rating
        await session.refresh(tech)
        print(f"Technician updated rating in DB: {tech.rating} stars")

        # 7. Check Principal Analytics reflection
        principal_user = User(
            user_id="principal_audit",
            email="principal@campus.edu",
            name="Campus Principal",
            role=UserRole.PRINCIPAL
        )

        analytics_out = await get_principal_analytics(current_user=principal_user, db=session)
        print(f"Principal Analytics reflected:")
        print(f"  - Total reviews: {analytics_out.get('total_reviews')}")
        print(f"  - Avg student rating: {analytics_out.get('avg_student_rating')} / 5.0")
        print(f"  - Recent reviews count: {len(analytics_out.get('recent_reviews', []))}")
        
        # Verify our review appears in recent_reviews
        match = next((r for r in analytics_out.get('recent_reviews', []) if r.get('complaint_id') == test_id), None)
        assert match is not None, "Test review not found in Principal recent reviews!"
        print(f"  - Found test review in Principal Dashboard feed: {match['complaint_id']} -> {match['rating']} stars ({match['comment']})")

        # Clean up test complaint and review
        await session.delete(complaint)
        await session.commit()
        print("Cleaned up test complaint and review.")

    print("=== All Review System Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_review_e2e_test())
