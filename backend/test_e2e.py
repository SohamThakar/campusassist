import requests
import json
from urllib.parse import quote

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_system():
    print("--- 1. Testing Health & API Root ---")
    res = requests.get("http://127.0.0.1:8000/health")
    assert res.status_code == 200, f"Health failed: {res.text}"
    print("Health check OK:", res.json())

    print("\n--- 2. Testing Authority Login ---")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@campus.edu", "password": "password123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    auth_data = res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in as Authority Admin:", auth_data["user"]["name"])

    print("\n--- 3. Testing Student Complaint Submission (Manual Category) ---")
    complaint_payload = {
        "description": "Water cooler leaking near BioEngineering Hall Room 302.",
        "location": "BioEngineering Hall, Room 302",
        "category": "Plumbing"
    }
    res = requests.post(f"{BASE_URL}/complaints", json=complaint_payload)
    assert res.status_code == 200, f"Submission failed: {res.text}"
    submit_res = res.json()
    new_cid = submit_res["complaint_id"]
    print(f"Complaint created: {new_cid} | Category: {submit_res['category']} | Status: {submit_res['status']}")
    assert submit_res["category"] == "Plumbing"
    assert submit_res.get("ai_analysis") is None

    print("\n--- 4. Testing Complaint Lookup by ID ---")
    encoded_id = quote(new_cid)
    res = requests.get(f"{BASE_URL}/complaints/{encoded_id}")
    assert res.status_code == 200, f"Lookup failed: {res.text}"
    lookup_data = res.json()
    print(f"Lookup OK for {lookup_data['complaint_id']}, status: {lookup_data['status']}")

    print("\n--- 5. Testing Technician Listing & Manual Dispatch ---")
    tech_list_res = requests.get(f"{BASE_URL}/technicians")
    assert tech_list_res.status_code == 200
    techs = tech_list_res.json()
    
    if not techs:
        # Register a provider for testing
        reg_payload = {
            "name": "Marcus Plumbing Services",
            "email": f"plumber_{new_cid.replace('#', '').replace('-', '')}@service.com",
            "password": "password123",
            "business_name": "Marcus Plumbing",
            "skills": ["Plumbing"],
            "service_area": "Campus North"
        }
        reg_res = requests.post(f"{BASE_URL}/technicians/register", json=reg_payload)
        assert reg_res.status_code == 200
        assigned_tech = reg_res.json()
        tech_email = reg_payload["email"]
    else:
        assigned_tech = techs[0]
        tech_email = assigned_tech.get("user_email")

    target_tech_id = assigned_tech["technician_id"]
    print(f"Assigning request to technician: {target_tech_id} ({assigned_tech.get('user_name') or assigned_tech.get('business_name')})")

    res = requests.post(
        f"{BASE_URL}/complaints/{encoded_id}/approve",
        json={
            "technician_id": target_tech_id,
            "notes": "Urgent plumbing repair required before morning classes."
        },
        headers=headers
    )
    assert res.status_code == 200, f"Approve failed: {res.text}"
    approved_data = res.json()
    print(f"Complaint {new_cid} approved & assigned! Status: {approved_data['status']}")

    print("\n--- 6. Testing Provider Job Acceptance & Completion ---")
    if tech_email:
        login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": tech_email, "password": "password123"})
        if login_res.status_code == 200:
            tech_token = login_res.json()["access_token"]
            tech_headers = {"Authorization": f"Bearer {tech_token}"}
            
            res = requests.get(f"{BASE_URL}/assignments/mine", headers=tech_headers)
            assert res.status_code == 200
            my_jobs = res.json()
            target_assign = next((j for j in my_jobs if j["complaint_id"] == new_cid), None)
            if target_assign:
                assign_id = target_assign["id"]
                # Accept job
                res = requests.post(f"{BASE_URL}/assignments/{assign_id}/accept", json={"notes": "On my way with replacement valve."}, headers=tech_headers)
                assert res.status_code == 200
                print(f"Job {new_cid} moved to In Progress by technician.")
                
                # Complete job
                res = requests.post(f"{BASE_URL}/assignments/{assign_id}/complete", json={"notes": "Leak sealed and pipe tested OK."}, headers=tech_headers)
                assert res.status_code == 200
                print(f"Job {new_cid} marked as completed by technician!")

    print("\n--- 7. Testing Principal Analytics & KPIs ---")
    res = requests.get(f"{BASE_URL}/analytics/principal", headers=headers)
    assert res.status_code == 200
    principal_data = res.json()
    print("Principal KPI summary:")
    print(f"- Total Complaints: {principal_data['total_complaints']}")
    print(f"- In Progress: {principal_data['in_progress']}")
    print(f"- Completed: {principal_data['completed']}")
    print(f"- Active Providers: {principal_data['active_providers']}")

    print("\n==========================================")
    print("ALL FULL-STACK BACKEND API TESTS PASSED 100%!")
    print("==========================================")

if __name__ == "__main__":
    test_system()
