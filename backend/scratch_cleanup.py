import requests
import sqlite3

def run_cleanup():
    # 1. Login as Authority Admin
    login = requests.post(
        'http://127.0.0.1:8000/api/v1/auth/login',
        json={'email': 'admin@campus.edu', 'password': 'password123'}
    ).json()
    token = login['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Get all assignments
    assignments = requests.get('http://127.0.0.1:8000/api/v1/assignments/mine', headers=headers).json()
    print(f'Found {len(assignments)} assignment(s) to delete.')

    for a in assignments:
        job_id = a['id']
        del_res = requests.delete(f'http://127.0.0.1:8000/api/v1/assignments/{job_id}', headers=headers)
        print(f'Deleted job #{job_id}:', del_res.json())

    # 3. Clean temporary test complaints
    conn = sqlite3.connect('campus_ai.db')
    c = conn.cursor()
    c.execute("DELETE FROM master_issues WHERE issue_id = '#MI-3308'")
    c.execute("DELETE FROM ai_analysis WHERE complaint_id IN ('#REQ-2841', '#T-9999')")
    c.execute("DELETE FROM status_history WHERE complaint_id IN ('#REQ-2841', '#T-9999')")
    c.execute("DELETE FROM complaints WHERE complaint_id IN ('#REQ-2841', '#T-9999')")
    conn.commit()
    print('Cleaned temporary test items.')

    print('\n=== REMAINING ASSIGNMENTS ===')
    for r in c.execute('SELECT * FROM assignments'):
        print(r)

    print('\n=== REMAINING COMPLAINTS ===')
    for r in c.execute('SELECT complaint_id, status, master_issue_id, duplicate_status, description FROM complaints'):
        print(r)

    print('\n=== REMAINING MASTER ISSUES ===')
    for r in c.execute('SELECT * FROM master_issues'):
        print(r)

if __name__ == '__main__':
    run_cleanup()
