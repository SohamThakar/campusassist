import asyncio
import io
import httpx
from urllib.parse import quote

from app.main import app

async def run_full_verification():
    print("=" * 65)
    print("RUNNING COMPREHENSIVE END-TO-END FLOW VERIFICATION")
    print("=" * 65)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200
        print("[1] Health Check: OK")

        # 2. Student 1 Login
        res = await client.post("/api/v1/auth/login", json={"email": "student@campus.edu", "password": "password123"})
        assert res.status_code == 200
        student_token = res.json()["access_token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}
        student_id = res.json()["user"]["user_id"]
        print(f"[2] Student Logged In: {student_id}")

        # 3. Video Upload
        fake_video = io.BytesIO(b"\x00\x00\x00 ftypmp42" + b"X" * 512)
        res = await client.post(
            "/api/v1/complaints/upload-video",
            files={"file": ("projector_glitch.mp4", fake_video, "video/mp4")}
        )
        assert res.status_code == 200
        video_data = res.json()
        video_url = video_data["video_url"]
        video_filename = video_data["filename"]
        print(f"[3] Video Uploaded: {video_url} ({video_filename})")

        # 4. Student Submits Complaint
        complaint_payload = {
            "category": "IT / Network",
            "description": "Projector HDMI port broken in CS Department Lab 0/1.",
            "location": "CS Department - Lab 0/1",
            "submitted_by_contact": "Demo Student • student@campus.edu",
            "video_url": video_url,
            "video_filename": video_filename,
        }
        res = await client.post("/api/v1/complaints", json=complaint_payload, headers=student_headers)
        assert res.status_code == 200
        submit_res = res.json()
        cid = submit_res["complaint_id"]
        print(f"[4] Complaint Created: {cid} | Status: {submit_res['status']}")

        # 5. Student My Complaints List & Tracking
        res = await client.get("/api/v1/complaints/my", headers=student_headers)
        assert res.status_code == 200
        my_list = res.json()
        my_cids = [c["complaint_id"] for c in my_list]
        assert cid in my_cids, f"{cid} not found in student's My Complaints list!"
        print(f"[5] Complaint {cid} immediately visible in Student's 'My Complaints' list ({len(my_list)} total)")

        # 6. Student Fetches Complaint Detail & Status Timeline
        res = await client.get(f"/api/v1/complaints/my/{quote(cid)}", headers=student_headers)
        assert res.status_code == 200
        detail = res.json()
        assert detail["complaint_id"] == cid
        assert detail["video_url"] == video_url
        assert detail["location"] == "CS Department - Lab 0/1"
        assert len(detail["history"]) >= 1
        print(f"[6] Student successfully tracked complaint {cid}. Video attached & timeline initialized.")

        # 7. Register/Get Technician
        tech_list_res = await client.get("/api/v1/technicians")
        assert tech_list_res.status_code == 200
        techs = tech_list_res.json()
        if not techs:
            reg_res = await client.post("/api/v1/technicians/register", json={
                "name": "Alex Tech Specialist",
                "email": f"tech_{cid.replace('#', '').replace('-', '')}@campus.edu",
                "password": "password123",
                "business_name": "Campus IT Services",
                "skills": ["IT / Network", "Electrical"],
                "service_area": "Campus Wide"
            })
            assert reg_res.status_code == 200
            target_tech = reg_res.json()
            tech_email = target_tech["user_email"]
        else:
            target_tech = techs[0]
            tech_email = target_tech.get("user_email")
        target_tech_id = target_tech["technician_id"]
        print(f"[7] Target Technician: {target_tech_id}")

        # 8. Authority Admin Logins and Dispatches Complaint
        admin_res = await client.post("/api/v1/auth/login", json={"email": "admin@campus.edu", "password": "password123"})
        assert admin_res.status_code == 200
        admin_token = admin_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        approve_res = await client.post(
            f"/api/v1/complaints/{quote(cid)}/approve",
            json={"technician_id": target_tech_id, "notes": "Dispatched to senior technician."},
            headers=admin_headers
        )
        assert approve_res.status_code == 200
        approved_data = approve_res.json()
        assert approved_data["status"] == "assigned"
        print(f"[8] Authority Admin Approved & Assigned Complaint {cid} -> Auto-created work assignment.")

        # 9. Technician Logins and Progresses the Task
        tech_login = await client.post("/api/v1/auth/login", json={"email": tech_email, "password": "password123"})
        assert tech_login.status_code == 200
        tech_token = tech_login.json()["access_token"]
        tech_headers = {"Authorization": f"Bearer {tech_token}"}

        # Check assigned work
        assign_res = await client.get("/api/v1/assignments/mine", headers=tech_headers)
        assert assign_res.status_code == 200
        my_tasks = assign_res.json()
        task = next((t for t in my_tasks if t["complaint_id"] == cid), None)
        assert task is not None, f"Task for {cid} not found in technician assignments"
        task_id = task["id"]
        print(f"[9] Technician received assigned task #{task_id} for complaint {cid}")

        # Accept task -> in_progress
        accept_res = await client.post(f"/api/v1/assignments/{task_id}/accept", json={"notes": "Arrived at Lab 0/1, replacing cable."}, headers=tech_headers)
        assert accept_res.status_code == 200
        print(f"    - Technician accepted task -> Status: In Progress")

        # Complete task -> completed
        complete_res = await client.post(f"/api/v1/assignments/{task_id}/complete", json={"notes": "Replaced HDMI socket, projector calibrated and working."}, headers=tech_headers)
        assert complete_res.status_code == 200
        print(f"    - Technician completed task -> Status: Completed")

        # 10. Student Views Updated Timeline
        res = await client.get(f"/api/v1/complaints/my/{quote(cid)}", headers=student_headers)
        assert res.status_code == 200
        final_detail = res.json()
        assert final_detail["status"] == "completed"
        statuses_in_history = [h["status"] for h in final_detail["history"]]
        assert "Submitted" in statuses_in_history
        assert "Assigned" in statuses_in_history
        assert "In Progress" in statuses_in_history
        assert "Completed" in statuses_in_history
        print(f"[10] Student Tracking View: All timeline stages verified:")
        for h in reversed(final_detail["history"]):
            print(f"     [STATUS] {h['status']} | {h['notes']}")

        # 11. Student 2 Isolation Test
        student2_login = await client.post("/api/v1/auth/register", json={
            "name": "Another Student",
            "email": "student_isolation_test@campus.edu",
            "password": "password123"
        })
        if student2_login.status_code == 409:
            student2_login = await client.post("/api/v1/auth/login", json={"email": "student_isolation_test@campus.edu", "password": "password123"})
        s2_token = student2_login.json()["access_token"]
        s2_headers = {"Authorization": f"Bearer {s2_token}"}

        s2_get = await client.get(f"/api/v1/complaints/my/{quote(cid)}", headers=s2_headers)
        assert s2_get.status_code == 403, "Student 2 must NOT be able to view Student 1's complaint tracking"
        print(f"[11] Student isolation verified: Student 2 receives 403 Forbidden when attempting to view Student 1's complaint.")

        # 12. Create a second complaint & job, then test DELETE JOB functionality
        print("\n[12] Testing Admin DELETE JOB Workflow & Complaint Preservation...")
        res = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "description": "Exposed high-voltage wire in Robotics Lab Room 204.",
                "location": "Robotics Lab, Room 204",
                "submitted_by_contact": "Demo Student • student@campus.edu"
            },
            headers=student_headers
        )
        assert res.status_code == 200
        cid2 = res.json()["complaint_id"]
        print(f"     - Created second complaint: {cid2}")

        # Admin assigns tech -> creates Job
        approve_res2 = await client.post(
            f"/api/v1/complaints/{quote(cid2)}/approve",
            json={"technician_id": target_tech_id, "notes": "Urgent wire insulation job."},
            headers=admin_headers
        )
        assert approve_res2.status_code == 200
        approved2_data = approve_res2.json()
        assert len(approved2_data["assignments"]) >= 1
        job2_id = approved2_data["assignments"][0]["id"]
        print(f"     - Job #{job2_id} created for Complaint {cid2}")

        # Unauthorized user (student) tries to delete Job -> 403 Forbidden
        del_student = await client.delete(f"/api/v1/assignments/{job2_id}", headers=student_headers)
        assert del_student.status_code == 403, f"Expected 403 for student deleting job, got {del_student.status_code}"
        print(f"     [PASS] Student is BLOCKED (403 Forbidden) from deleting Job #{job2_id}")

        # Unauthorized user (technician) tries to delete Job -> 403 Forbidden
        del_tech = await client.delete(f"/api/v1/assignments/{job2_id}", headers=tech_headers)
        assert del_tech.status_code == 403, f"Expected 403 for technician deleting job, got {del_tech.status_code}"
        print(f"     [PASS] Technician is BLOCKED (403 Forbidden) from deleting Job #{job2_id}")

        # Authorized Admin deletes the Job
        del_admin = await client.delete(f"/api/v1/assignments/{job2_id}", headers=admin_headers)
        assert del_admin.status_code == 200
        del_resp = del_admin.json()
        print(f"     [PASS] Admin successfully deleted Job #{job2_id}: {del_resp['message']}")

        # Verify Job #{job2_id} no longer exists
        del_again = await client.delete(f"/api/v1/assignments/{job2_id}", headers=admin_headers)
        assert del_again.status_code == 404, "Job should be gone (404)"

        # CRITICAL VERIFICATION: Complaint #{cid2} STILL EXISTS!
        comp_check = await client.get(f"/api/v1/complaints/{quote(cid2)}", headers=admin_headers)
        assert comp_check.status_code == 200
        comp_data = comp_check.json()
        assert comp_data["complaint_id"] == cid2
        assert comp_data["status"] == "submitted" # Reset to unassigned queue
        print(f"     [PASS] Associated Complaint {cid2} STILL EXISTS INTACT! Status: {comp_data['status']}")

        # Student can still view and track the complaint in My Complaints
        student_track = await client.get(f"/api/v1/complaints/my/{quote(cid2)}", headers=student_headers)
        assert student_track.status_code == 200
        track_data = student_track.json()
        assert track_data["complaint_id"] == cid2
        print(f"     [PASS] Student can still track Complaint {cid2} without interruption!")

        print("\n" + "=" * 65)
        print("ALL 12 END-TO-END FLOW TESTS COMPLETED WITH 100% SUCCESS!")
        print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_full_verification())

