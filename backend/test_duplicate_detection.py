import asyncio
import httpx
from urllib.parse import quote
from app.main import app
from app.database import init_db

async def run_duplicate_test_suite():
    print("=" * 70)
    print("CAMPUSAI — AI-BASED DUPLICATE COMPLAINT DETECTION TEST SUITE")
    print("=" * 70)

    await init_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Authority Admin
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@campus.edu", "password": "password123"}
        )
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        admin_token = login_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  [INIT] Authority admin authenticated successfully.")

        import uuid
        run_id = uuid.uuid4().hex[:8]
        loc_1 = f"T1-IT-Seminar-Hall-{run_id}"
        loc_2 = f"T2-Conference-Room-{run_id}"
        loc_3a = f"T3A-Academic-Hall-{run_id}"
        loc_3b = f"T3B-Library-Room-{run_id}"
        loc_4 = f"T4-Auditorium-{run_id}"
        loc_5 = f"T5-Physics-Lab-{run_id}"

        # ─────────────────────────────────────────────────────────────
        # TEST 1: Same complaint, same location (Likely duplicate)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 1] Testing Same Complaint, Same Location (Likely Duplicate)...")
        # Submit Complaint 1A
        res_1a = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_1,
                "description": "Ceiling fan is not working.",
                "submitted_by_contact": "Student A • studentA@campus.edu"
            }
        )
        assert res_1a.status_code == 200, f"Submission 1A failed: {res_1a.text}"
        cid_1a = res_1a.json()["complaint_id"]
        print(f"  -> Submitted Complaint 1A: {cid_1a} ('Ceiling fan is not working.') at {loc_1}")

        # Submit Complaint 1B (Same location + similar fan description)
        res_1b = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": f"T1-IT-Block-Seminar-Hall-{run_id}", # Normalized alias match with Block
                "description": "The fan has stopped working in the seminar room.",
                "submitted_by_contact": "Student B • studentB@campus.edu"
            }
        )
        assert res_1b.status_code == 200, f"Submission 1B failed: {res_1b.text}"
        data_1b = res_1b.json()
        cid_1b = data_1b["complaint_id"]
        print(f"  -> Submitted Complaint 1B: {cid_1b} ('The fan has stopped working in the seminar room.') at IT Block Seminar Hall {run_id}")

        # Verify Complaint 1B detected as confirmed duplicate
        detail_1b = (await client.get(f"/api/v1/complaints/{quote(cid_1b)}")).json()
        print(f"  -> Duplicate Status: {detail_1b.get('duplicate_status')}")
        print(f"  -> Matched ID: {detail_1b.get('duplicate_of')}")
        print(f"  -> Confidence: {detail_1b.get('duplicate_confidence')}")
        print(f"  -> Reason: {detail_1b.get('duplicate_reason')}")
        print(f"  -> Master Issue ID: {detail_1b.get('master_issue_id')}")

        assert detail_1b.get("duplicate_status") == "confirmed_duplicate", f"Expected confirmed_duplicate, got {detail_1b.get('duplicate_status')}"
        assert detail_1b.get("duplicate_of") == cid_1a, f"Expected matched ID {cid_1a}, got {detail_1b.get('duplicate_of')}"
        assert (detail_1b.get("duplicate_confidence") or 0) >= 0.80, "Expected high confidence >= 0.80"
        assert detail_1b.get("master_issue_id") is not None, "Expected master_issue_id to be established"
        print("  [PASS] TEST 1 SUCCEEDED: High-confidence duplicate identified and linked to Master Issue!")

        # ─────────────────────────────────────────────────────────────
        # TEST 2: Same location, different problem (NOT duplicate)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 2] Testing Same Location, Different Problem...")
        # First submit problem 2A in location 2
        res_2a = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_2,
                "description": "Ceiling fan is not working.",
                "submitted_by_contact": "Student C1 • studentC1@campus.edu"
            }
        )
        assert res_2a.status_code == 200
        cid_2a = res_2a.json()["complaint_id"]

        # Now submit problem 2B in same location 2 (different problem: lights flickering)
        res_2b = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_2,
                "description": "Lights are flickering.",
                "submitted_by_contact": "Student C2 • studentC2@campus.edu"
            }
        )
        assert res_2b.status_code == 200
        data_2b = res_2b.json()
        cid_2b = data_2b["complaint_id"]
        detail_2b = (await client.get(f"/api/v1/complaints/{quote(cid_2b)}")).json()
        print(f"  -> Compared: {cid_2b} ('Lights are flickering.') vs {cid_2a} ('Ceiling fan is not working.') at {loc_2}")
        print(f"  -> Duplicate Status: {detail_2b.get('duplicate_status')}")
        print(f"  -> Confidence: {detail_2b.get('duplicate_confidence')}")
        print(f"  -> Reason: {detail_2b.get('duplicate_reason')}")

        assert detail_2b.get("duplicate_status") in ["none", None], f"Expected none, got {detail_2b.get('duplicate_status')}"
        assert detail_2b.get("duplicate_of") is None, "Different problem must NOT link duplicate"
        assert (detail_2b.get("duplicate_confidence") or 0) < 0.55, "Confidence must be low for different problem"
        print("  [PASS] TEST 2 SUCCEEDED: Same location + different problem NOT marked as duplicate!")

        # ─────────────────────────────────────────────────────────────
        # TEST 3: Different location, same type of problem (NOT duplicate)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 3] Testing Different Location, Same Type of Problem...")
        res_3a = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_3a,
                "description": "Fan is not working.",
                "submitted_by_contact": "Student D1 • studentD1@campus.edu"
            }
        )
        assert res_3a.status_code == 200

        res_3b = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_3b,
                "description": "Fan is not working.",
                "submitted_by_contact": "Student D2 • studentD2@campus.edu"
            }
        )
        assert res_3b.status_code == 200
        cid_3b = res_3b.json()["complaint_id"]
        detail_3b = (await client.get(f"/api/v1/complaints/{quote(cid_3b)}")).json()
        print(f"  -> Submitted: {cid_3b} at {loc_3b} vs prior at {loc_3a}")
        print(f"  -> Duplicate Status: {detail_3b.get('duplicate_status')}")
        print(f"  -> Confidence: {detail_3b.get('duplicate_confidence')}")

        assert detail_3b.get("duplicate_status") in ["none", None]
        assert detail_3b.get("duplicate_of") is None
        print("  [PASS] TEST 3 SUCCEEDED: Different location treated as independent complaint!")

        # ─────────────────────────────────────────────────────────────
        # TEST 4: Different category (NOT duplicate)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 4] Testing Different Category in Same Location...")
        res_4a = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_4,
                "description": "Fan is not working.",
                "submitted_by_contact": "Student E1 • studentE1@campus.edu"
            }
        )
        assert res_4a.status_code == 200

        res_4b = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Cleaning",
                "location": loc_4,
                "description": "Room floor is dirty.",
                "submitted_by_contact": "Student E2 • studentE2@campus.edu"
            }
        )
        assert res_4b.status_code == 200
        cid_4b = res_4b.json()["complaint_id"]
        detail_4b = (await client.get(f"/api/v1/complaints/{quote(cid_4b)}")).json()
        print(f"  -> Submitted: {cid_4b} (Cleaning at {loc_4})")
        print(f"  -> Duplicate Status: {detail_4b.get('duplicate_status')}")
        print(f"  -> Confidence: {detail_4b.get('duplicate_confidence')}")

        assert detail_4b.get("duplicate_status") in ["none", None]
        assert detail_4b.get("duplicate_of") is None
        print("  [PASS] TEST 4 SUCCEEDED: Different category rejected from duplicate relationship!")

        # ─────────────────────────────────────────────────────────────
        # TEST 5: Medium confidence & Admin Confirmation Flow
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 5] Testing Medium Confidence & Admin Review Action...")
        # Create primary issue
        res_5a = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_5,
                "description": "Ceiling fan making loud grinding noise when switched on.",
                "submitted_by_contact": "Student F • studentF@campus.edu"
            }
        )
        cid_5a = res_5a.json()["complaint_id"]

        # Create partially similar issue in same location (same subject 'fan', but differing fault 'loose')
        res_5b = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_5,
                "description": "Fan regulator button is loose on the board.",
                "submitted_by_contact": "Student G • studentG@campus.edu"
            }
        )
        cid_5b = res_5b.json()["complaint_id"]
        detail_5b = (await client.get(f"/api/v1/complaints/{quote(cid_5b)}")).json()
        print(f"  -> Submitted related complaints {cid_5a} & {cid_5b} at {loc_5}")
        print(f"  -> Duplicate Status: {detail_5b.get('duplicate_status')}")
        print(f"  -> Matched ID: {detail_5b.get('duplicate_of')}")
        print(f"  -> Confidence: {detail_5b.get('duplicate_confidence')}")

        assert detail_5b.get("duplicate_status") == "possible_duplicate", f"Expected possible_duplicate, got {detail_5b.get('duplicate_status')}"
        assert detail_5b.get("duplicate_of") == cid_5a
        assert 0.55 <= (detail_5b.get("duplicate_confidence") or 0) < 0.80
        print("  -> Flagged as 'possible duplicate' for admin review!")

        # Now test Admin Confirming the duplicate
        print("  -> Admin confirming duplicate relationship via API...")
        confirm_res = await client.post(
            f"/api/v1/complaints/{quote(cid_5b)}/confirm-duplicate",
            headers=admin_headers,
            json={"notes": "Confirmed both issues pertain to the same ceiling fan assembly."}
        )
        assert confirm_res.status_code == 200, f"Confirm failed: {confirm_res.text}"
        confirmed_data = confirm_res.json()
        assert confirmed_data.get("duplicate_status") == "confirmed_duplicate"
        assert confirmed_data.get("master_issue_id") is not None
        print(f"  -> Admin confirmed! Linked to Master Issue: {confirmed_data.get('master_issue_id')}")

        # Test Admin Dismissing a duplicate on another test complaint
        res_5c = await client.post(
            "/api/v1/complaints",
            json={
                "category": "Electrical",
                "location": loc_5,
                "description": "Projector remote battery dead.",
                "submitted_by_contact": "Student H • studentH@campus.edu"
            }
        )
        cid_5c = res_5c.json()["complaint_id"]
        dismiss_res = await client.post(
            f"/api/v1/complaints/{quote(cid_5c)}/dismiss-duplicate",
            headers=admin_headers
        )
        assert dismiss_res.status_code == 200
        assert dismiss_res.json().get("duplicate_status") == "dismissed"
        print("  -> Admin dismiss action verified successfully!")
        print("  [PASS] TEST 5 SUCCEEDED: Medium confidence flagged for review & confirmed by admin!")

        # ─────────────────────────────────────────────────────────────
        # TEST 6: AI unavailable (Graceful fallback, no data loss)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 6] Testing AI Service Unavailable Simulation...")
        res_6 = await client.post(
            "/api/v1/complaints?simulate_ai_failure=true",
            json={
                "category": "Electrical",
                "location": "Mechanical Workshop",
                "description": "Main breaker switch tripped during heavy load.",
                "submitted_by_contact": "Lab Tech • labtech@campus.edu"
            }
        )
        assert res_6.status_code == 200, f"Complaint submission should succeed even if AI fails: {res_6.text}"
        cid_6 = res_6.json()["complaint_id"]
        detail_6 = (await client.get(f"/api/v1/complaints/{quote(cid_6)}")).json()

        print(f"  -> Complaint successfully saved with ID: {cid_6}")
        print(f"  -> Status: {detail_6['status']}")
        print(f"  -> Description: {detail_6['description']}")
        print(f"  -> Duplicate Status: {detail_6.get('duplicate_status')}")
        print(f"  -> Duplicate Reason: {detail_6.get('duplicate_reason')}")

        assert detail_6["complaint_id"] == cid_6
        assert detail_6["status"] == "submitted"
        assert detail_6["description"] == "Main breaker switch tripped during heavy load."
        print("  [PASS] TEST 6 SUCCEEDED: Submission succeeded and complaint preserved during AI outage!")

        # ─────────────────────────────────────────────────────────────
        # TEST 7: Master Issue Aggregation & Transparency
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 7] Testing Master Issue Aggregation & Endpoint Details...")
        mi_res = await client.get("/api/v1/complaints/master-issues", headers=admin_headers)
        assert mi_res.status_code == 200, f"Master issues listing failed: {mi_res.text}"
        issues_list = mi_res.json()
        print(f"  -> Total Master Issues active: {len(issues_list)}")
        assert len(issues_list) >= 1

        primary_mi = issues_list[0]
        print(f"  -> Inspected Master Issue {primary_mi['issue_id']}:")
        print(f"     Title: {primary_mi['title']}")
        print(f"     Category: {primary_mi['category']}")
        print(f"     Location: {primary_mi['location']}")
        print(f"     Student Complaints Count: {primary_mi['complaints_count']}")
        assert primary_mi["complaints_count"] >= 2, "Master Issue must group 2 or more student complaints"

        # Fetch detail of this master issue
        mi_detail_res = await client.get(f"/api/v1/complaints/master-issues/{quote(primary_mi['issue_id'])}", headers=admin_headers)
        assert mi_detail_res.status_code == 200
        mi_detail = mi_detail_res.json()
        print(f"     Linked Complaint IDs: {[c['complaint_id'] for c in mi_detail['complaints']]}")
        assert len(mi_detail["complaints"]) == primary_mi["complaints_count"]
        print("  [PASS] TEST 7 SUCCEEDED: Master Issue correctly aggregates all linked student complaints!")

        print("\n" + "=" * 70)
        print("ALL 6 TEST CASES + MASTER ISSUE APIS VERIFIED 100% SUCCESSFULLY!")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_duplicate_test_suite())
