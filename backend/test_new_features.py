import asyncio
import io
import httpx
from datetime import datetime

from app.main import app
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.complaint import Complaint

async def run_tests():
    print("=" * 60)
    print("RUNNING CAMPUSAI FEATURE TEST SUITE")
    print("=" * 60)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        print("\n[1] Testing Health Check...")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("  Ã¢Å“â€œ Health OK")

        # 2. Logins
        print("\n[2] Testing Authentication for Roles...")
        # Admin
        res = await client.post("/api/v1/auth/login", json={"email": "admin@campus.edu", "password": "password123"})
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        admin_token = res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  Ã¢Å“â€œ Admin logged in (role: authority)")

        # Principal
        res = await client.post("/api/v1/auth/login", json={"email": "principal@campus.edu", "password": "password123"})
        assert res.status_code == 200, f"Principal login failed: {res.text}"
        principal_token = res.json()["access_token"]
        principal_headers = {"Authorization": f"Bearer {principal_token}"}
        print("  Ã¢Å“â€œ Principal logged in (role: principal)")

        # Student 1
        res = await client.post("/api/v1/auth/login", json={"email": "student@campus.edu", "password": "password123"})
        assert res.status_code == 200, f"Student login failed: {res.text}"
        student1_token = res.json()["access_token"]
        student1_headers = {"Authorization": f"Bearer {student1_token}"}
        student1_id = res.json()["user"]["user_id"]
        print(f"  Ã¢Å“â€œ Student 1 logged in (user_id: {student1_id})")

        # Student 2 registration
        res = await client.post("/api/v1/auth/register", json={
            "name": "Second Student",
            "email": "student2@campus.edu",
            "password": "password123"
        })
        if res.status_code == 409: # Already exists from previous run
            res = await client.post("/api/v1/auth/login", json={"email": "student2@campus.edu", "password": "password123"})
        assert res.status_code == 200, f"Student 2 register/login failed: {res.text}"
        student2_token = res.json()["access_token"]
        student2_headers = {"Authorization": f"Bearer {student2_token}"}
        student2_id = res.json()["user"]["user_id"]
        print(f"  Ã¢Å“â€œ Student 2 registered/logged in (user_id: {student2_id})")

        # 3. Video upload validation
        print("\n[3] Testing Video Upload & Validation...")
        # Bad format rejection
        bad_file = io.BytesIO(b"fake text content")
        res = await client.post(
            "/api/v1/complaints/upload-video",
            files={"file": ("malicious.exe", bad_file, "application/octet-stream")}
        )
        assert res.status_code == 400, "Should reject non-video extensions"
        print("  Ã¢Å“â€œ Rejected invalid video format (.exe)")

        # Valid video upload
        fake_video = io.BytesIO(b"\x00\x00\x00 ftypmp42" + b"A" * 1024)
        res = await client.post(
            "/api/v1/complaints/upload-video",
            files={"file": ("leak_evidence.mp4", fake_video, "video/mp4")}
        )
        assert res.status_code == 200, f"Video upload failed: {res.text}"
        video_data = res.json()
        assert "video_url" in video_data
        video_url = video_data["video_url"]
        video_filename = video_data["filename"]
        print(f"  Ã¢Å“â€œ Video uploaded successfully: {video_url} ({video_filename})")

        # 4. Student complaint submission
        print("\n[4] Testing Complaint Submission Flow...")
        # Complaint A: Without video (Student 1)
        res = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "description": "Flickering overhead lights in Lecture Hall B.",
                "location": "Academic Complex, Lecture Hall B",
                "submitted_by_contact": "Demo Student Ã¢â‚¬Â¢ student@campus.edu"
            },
            headers=student1_headers
        )
        assert res.status_code == 200, f"Complaint without video failed: {res.text}"
        cid_no_video = res.json()["complaint_id"]
        print(f"  Ã¢Å“â€œ Complaint submitted without video: {cid_no_video}")

        # Complaint B: With video (Student 1)
        res = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Plumbing",
                "description": "Pipe leaking under main sink in Chemistry Lab 102.",
                "location": "Science Wing, Chem Lab 102",
                "submitted_by_contact": "Demo Student Ã¢â‚¬Â¢ student@campus.edu",
                "video_url": video_url,
                "video_filename": video_filename
            },
            headers=student1_headers
        )
        assert res.status_code == 200, f"Complaint with video failed: {res.text}"
        cid_with_video = res.json()["complaint_id"]
        print(f"  Ã¢Å“â€œ Complaint submitted with video: {cid_with_video}")

        # 5. Student Complaint Tracking Flow
        print("\n[5] Testing Student Complaint Tracking (/complaints/my)...")
        res = await client.get("/api/v1/complaints/my", headers=student1_headers)
        assert res.status_code == 200, f"List my complaints failed: {res.text}"
        my_complaints = res.json()
        my_ids = [c["complaint_id"] for c in my_complaints]
        assert cid_no_video in my_ids, f"{cid_no_video} not in student's list"
        assert cid_with_video in my_ids, f"{cid_with_video} not in student's list"
        print(f"  Ã¢Å“â€œ Student 1 sees their {len(my_complaints)} complaints in /complaints/my")

        from urllib.parse import quote

        # Verify detail endpoint
        res = await client.get(f"/api/v1/complaints/my/{quote(cid_with_video)}", headers=student1_headers)
        assert res.status_code == 200, f"Get complaint detail failed: {res.text}"
        detail = res.json()
        assert detail["complaint_id"] == cid_with_video
        assert detail["video_url"] == video_url
        assert detail["video_filename"] == video_filename
        assert len(detail["history"]) >= 1
        assert detail["history"][0]["status"] == "Submitted"
        print(f"  [PASS] Student 1 fetched detail for {cid_with_video} with video & status history")

        # 6. Ownership & Security Isolation Testing
        print("\n[6] Testing Student Permission & Ownership Isolation...")
        # Student 2 tries to access Student 1's complaint
        res = await client.get(f"/api/v1/complaints/my/{quote(cid_with_video)}", headers=student2_headers)
        assert res.status_code == 403, f"Expected 403 for unauthorized student, got {res.status_code}"
        print("  [PASS] Student 2 is BLOCKED (403 Forbidden) from viewing Student 1's complaint")

        # 7. Admin View of Complaint with Video
        print("\n[7] Testing Admin View & Processing of Complaint with Video...")
        from urllib.parse import quote
        res = await client.get(f"/api/v1/complaints/{quote(cid_with_video)}", headers=admin_headers)
        assert res.status_code == 200, f"Admin lookup failed: {res.text}"
        admin_complaint = res.json()
        assert admin_complaint["video_url"] == video_url
        assert admin_complaint["video_filename"] == video_filename
        print(f"  Ã¢Å“â€œ Admin successfully retrieved complaint {cid_with_video} with video evidence intact")

        # 8. Principal Reports (Permissions & Statistics)
        print("\n[8] Testing Principal Reports & Role Enforcement...")
        # Student cannot access Principal Reports
        res = await client.get("/api/v1/analytics/principal-reports", headers=student1_headers)
        assert res.status_code == 403, f"Expected 403 for student accessing reports, got {res.status_code}"
        print("  Ã¢Å“â€œ Student is BLOCKED (403 Forbidden) from Principal Reports")

        # Admin cannot access Principal Reports (Strict Principal-only)
        res = await client.get("/api/v1/analytics/principal-reports", headers=admin_headers)
        assert res.status_code == 403, f"Expected 403 for admin accessing reports, got {res.status_code}"
        print("  Ã¢Å“â€œ Admin is BLOCKED (403 Forbidden) from Principal Reports")

        # Principal CAN access Reports
        res = await client.get("/api/v1/analytics/principal-reports", headers=principal_headers)
        assert res.status_code == 200, f"Principal reports failed: {res.text}"
        rep = res.json()
        print(f"  Ã¢Å“â€œ Principal accessed Reports! Overview stats:")
        print(f"    - Total Complaints: {rep['total_complaints']}")
        print(f"    - Pending: {rep['pending']}")
        print(f"    - In Progress: {rep['in_progress']}")
        print(f"    - Completed: {rep['completed']}")
        print(f"    - High Priority: {rep['high_priority']}")
        print(f"    - Avg Resolution Days: {rep['avg_resolution_days']}")
        print(f"    - Status Breakdown Categories: {len(rep['status_breakdown'])}")
        print(f"    - Category Breakdown Count: {len(rep['category_breakdown'])}")
        print(f"    - Complaints List Length: {len(rep['complaints'])}")

        # 9. Principal Reports Filters
        print("\n[9] Testing Principal Reports Filters...")
        # Filter by category
        res = await client.get("/api/v1/analytics/principal-reports?category=Plumbing", headers=principal_headers)
        assert res.status_code == 200
        plumbing_rep = res.json()
        for c in plumbing_rep["complaints"]:
            assert c["category"] == "Plumbing", f"Expected category Plumbing, got {c['category']}"
        print(f"  Ã¢Å“â€œ Filtered by category=Plumbing: {plumbing_rep['total_complaints']} complaints returned")

        # Filter by status
        res = await client.get("/api/v1/analytics/principal-reports?status=submitted", headers=principal_headers)
        assert res.status_code == 200
        submitted_rep = res.json()
        print(f"  Ã¢Å“â€œ Filtered by status=submitted: {submitted_rep['total_complaints']} complaints returned")

        # Filter by priority
        res = await client.get("/api/v1/analytics/principal-reports?priority=Medium", headers=principal_headers)
        assert res.status_code == 200
        priority_rep = res.json()
        print(f"  Ã¢Å“â€œ Filtered by priority=Medium: {priority_rep['total_complaints']} complaints returned")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())

