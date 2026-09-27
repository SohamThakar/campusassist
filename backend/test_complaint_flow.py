import asyncio
import httpx
from urllib.parse import quote
from app.main import app
from app.database import AsyncSessionLocal
from app.models.complaint import Complaint

async def run_verification():
    print("=" * 65)
    print("TESTING START COMPLAINT, TRACKING, & ADMIN AUTH ISOLATION")
    print("=" * 65)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # ─────────────────────────────────────────────────────────────
        # Scenario 1 & 2: Public Student/User Start & Submit Complaint
        # ─────────────────────────────────────────────────────────────
        print("\n[Scenario 1 & 2] Testing Public Start Complaint Submission Flow (No Auth)...")
        res = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "description": "Loose wire hanging near computer lab 304 doorway.",
                "location": "Main Academic Block, Room 304",
                "submitted_by_contact": "John Student • jstudent@campus.edu"
            }
        )
        assert res.status_code == 200, f"Public submission failed: {res.text}"
        data = res.json()
        cid = data["complaint_id"]
        assert cid.startswith("#T-") or cid.startswith("#REQ-"), f"Unexpected ID format: {cid}"
        assert data["status"] == "submitted"
        print(f"  [PASS] Public complaint submitted successfully WITHOUT admin login!")
        print(f"  [PASS] Unique Complaint ID generated: {cid}")

        # ─────────────────────────────────────────────────────────────
        # Scenario 3: Public Complaint Tracking by Reference ID
        # ─────────────────────────────────────────────────────────────
        print("\n[Scenario 3] Testing Public Complaint Tracking by Reference ID (No Auth)...")
        # 3a. Lookup with exact ID (e.g. #T-XXXX)
        res = await client.get(f"/api/v1/complaints/{quote(cid)}")
        assert res.status_code == 200, f"Tracking lookup failed: {res.text}"
        details = res.json()
        assert details["complaint_id"] == cid
        assert details["category"] == "Electrical"
        assert details["location"] == "Main Academic Block, Room 304"
        assert len(details["history"]) >= 1
        assert details["history"][0]["status"] == "Submitted"
        print(f"  [PASS] Retrieved full complaint details & history using '{cid}'")

        # 3b. Lookup without '#' prefix (e.g. T-XXXX or REQ-XXXX)
        clean_id = cid.lstrip("#")
        res = await client.get(f"/api/v1/complaints/{quote(clean_id)}")
        assert res.status_code == 200, f"Tracking lookup without '#' failed: {res.text}"
        assert res.json()["complaint_id"] == cid
        print(f"  [PASS] Retrieved full complaint details without '#' prefix: '{clean_id}'")

        # 3c. Lookup with lowercase (e.g. #t-xxxx or t-xxxx)
        lower_id = cid.lower()
        res = await client.get(f"/api/v1/complaints/{quote(lower_id)}")
        assert res.status_code == 200, f"Case-insensitive lookup failed: {res.text}"
        assert res.json()["complaint_id"] == cid
        print(f"  [PASS] Case-insensitive tracking lookup succeeded: '{lower_id}'")

        # ─────────────────────────────────────────────────────────────
        # Scenario 4: Admin Authentication & Management
        # ─────────────────────────────────────────────────────────────
        print("\n[Scenario 4] Testing Admin Login & Protected Functionality...")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@campus.edu", "password": "password123"}
        )
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        admin_token = login_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  [PASS] Admin logged in successfully (role: authority)")

        # Admin can view authority queue
        queue_res = await client.get("/api/v1/complaints", headers=admin_headers)
        assert queue_res.status_code == 200, f"Admin queue access failed: {queue_res.text}"
        print(f"  [PASS] Admin successfully accessed complaints queue ({len(queue_res.json())} complaints)")

        # ─────────────────────────────────────────────────────────────
        # Scenario 5: Unauthorized Access Protection
        # ─────────────────────────────────────────────────────────────
        print("\n[Scenario 5] Testing Unauthorized Access Protection for Admin Routes...")
        # Unauthenticated access to admin complaints queue must return 401
        unauth_res = await client.get("/api/v1/complaints")
        assert unauth_res.status_code == 401, f"Expected 401 Unauthorized for admin route, got {unauth_res.status_code}"
        print("  [PASS] Admin complaints list correctly rejects unauthenticated requests with 401 Unauthorized")

        # Student user trying to access admin complaints queue must return 403 Forbidden
        student_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "student@campus.edu", "password": "password123"}
        )
        assert student_login.status_code == 200
        student_token = student_login.json()["access_token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}

        forbidden_res = await client.get("/api/v1/complaints", headers=student_headers)
        assert forbidden_res.status_code == 403, f"Expected 403 Forbidden for student on admin route, got {forbidden_res.status_code}"
        print("  [PASS] Student user correctly blocked from admin route with 403 Forbidden")

        # Cleanup test complaint from DB
        async with AsyncSessionLocal() as db:
            complaint_obj = await db.get(Complaint, cid)
            if complaint_obj:
                await db.delete(complaint_obj)
                await db.commit()
                print(f"  [PASS] Cleaned up temporary test complaint {cid}")

    print("\n" + "=" * 65)
    print("ALL 5 SCENARIOS VERIFIED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_verification())
