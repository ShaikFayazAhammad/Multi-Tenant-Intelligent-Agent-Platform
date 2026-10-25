import requests

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== Testing Multitenant Hierarchy & Billing Pause-and-Swap ===")
    
    # 1. Login
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@bfsi.com",
        "password": "admin123"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Super Admin Login Success")

    import uuid
    uid = uuid.uuid4().hex[:6]
    org_name = f"Apex NeoBank {uid}"
    create_org_resp = requests.post(f"{BASE_URL}/api/admin/orgs", json={
        "name": org_name,
        "slug": f"apex-neobank-{uid}",
        "domain": "Retail Banking"
    }, headers=headers)
    assert create_org_resp.status_code == 200, f"Create Org failed: {create_org_resp.text}"
    new_org = create_org_resp.json()
    org_id = new_org["id"]
    print(f"✓ Created Organization: {org_name} (ID: {org_id})")

    # 3. Verify Org appears in GET /api/admin/orgs
    list_orgs_resp = requests.get(f"{BASE_URL}/api/admin/orgs", headers=headers)
    assert list_orgs_resp.status_code == 200, f"List Orgs failed: {list_orgs_resp.text}"
    orgs = list_orgs_resp.json()
    assert any(o["id"] == org_id for o in orgs), "Newly created Org not found in orgs list!"
    print(f"✓ Organization visible in dropdown list (Total orgs: {len(orgs)})")

    # 4. Check initial quota usage for new org
    sub_resp = requests.get(f"{BASE_URL}/api/billing/subscription?org_id={org_id}", headers=headers)
    assert sub_resp.status_code == 200, f"Usage check failed: {sub_resp.text}"
    print("SUB RESP:", sub_resp.json())
    usage = sub_resp.json().get("usage", {})
    plan_name = sub_resp.json().get("subscription", {}).get("plan_id", "free")
    print(f"✓ New Org Plan: {plan_name}, Usage: {usage}")

    # 5. Create Project 1 (Live) -> Should succeed
    p1_resp = requests.post(f"{BASE_URL}/api/admin/orgs/{org_id}/projects", json={
        "name": "Wealth Management Agent",
        "domain": "banking",
        "status": "Live"
    }, headers=headers)
    assert p1_resp.status_code == 200, f"Create P1 failed: {p1_resp.text}"
    p1 = p1_resp.json()
    print(f"✓ Created Project 1 (Live): {p1['name']} (ID: {p1['id']})")

    # Verify usage is now 1/1
    sub_data = requests.get(f"{BASE_URL}/api/billing/subscription?org_id={org_id}", headers=headers).json()
    proj_usage = sub_data["usage"]["projects"]
    assert proj_usage["current"] == 1
    print(f"✓ Quota usage after P1 Live: {proj_usage['current']}/{proj_usage['limit']}")

    # 6. Create Project 2 as Paused -> Should SUCCEED (Pause-and-swap feature)
    p2_resp = requests.post(f"{BASE_URL}/api/admin/orgs/{org_id}/projects", json={
        "name": "Loan Approval Agent",
        "domain": "lending",
        "status": "Paused"
    }, headers=headers)
    assert p2_resp.status_code == 200, f"Create P2 (Paused) failed: {p2_resp.text}"
    p2 = p2_resp.json()
    print(f"✓ Created Project 2 (Paused): {p2['name']} (ID: {p2['id']}) without quota restriction")

    # Create Project 3 as Draft -> Should also SUCCEED
    p3_resp = requests.post(f"{BASE_URL}/api/admin/orgs/{org_id}/projects", json={
        "name": "Fraud Detection Agent",
        "domain": "fraud",
        "status": "Draft"
    }, headers=headers)
    assert p3_resp.status_code == 200, f"Create P3 (Draft) failed: {p3_resp.text}"
    p3 = p3_resp.json()
    print(f"✓ Created Project 3 (Draft): {p3['name']} (ID: {p3['id']}) without quota restriction")

    # 7. Attempt to set Project 2 status to "Live" while Project 1 is "Live"
    # Should FAIL with 402 Payment Required / plan_limit_reached
    activate_p2_resp = requests.patch(
        f"{BASE_URL}/api/admin/projects/{p2['id']}/status",
        json={"status": "Live"},
        headers=headers
    )
    print(f"Attempting to activate P2 to Live -> Response code: {activate_p2_resp.status_code}")
    assert activate_p2_resp.status_code == 402, f"Expected 402, got: {activate_p2_resp.status_code} {activate_p2_resp.text}"
    err_body = activate_p2_resp.json()
    print(f"✓ Correctly blocked with plan limit: {err_body}")

    # 8. Pause Project 1, then activate Project 2 (Pause-and-swap)
    pause_p1_resp = requests.patch(
        f"{BASE_URL}/api/admin/projects/{p1['id']}/status",
        json={"status": "Paused"},
        headers=headers
    )
    assert pause_p1_resp.status_code == 200, f"Pause P1 failed: {pause_p1_resp.text}"
    print(f"✓ Paused Project 1 successfully")

    # Now activating Project 2 should SUCCEED
    activate_p2_now = requests.patch(
        f"{BASE_URL}/api/admin/projects/{p2['id']}/status",
        json={"status": "Live"},
        headers=headers
    )
    assert activate_p2_now.status_code == 200, f"Activate P2 failed: {activate_p2_now.text}"
    print(f"✓ Activated Project 2 to Live successfully (Pause-and-swap working seamlessly!)")

    # 9. List projects under Org
    projects_resp = requests.get(f"{BASE_URL}/api/admin/orgs/{org_id}/projects", headers=headers)
    assert projects_resp.status_code == 200
    projs = projects_resp.json()
    print(f"✓ Total projects created under Org {org_name}: {len(projs)}")
    for p in projs:
        print(f"  - [{p['status'].upper()}] {p['name']} ({p.get('bfsi_domain', 'General')})")

    print("\nALL MULTITENANT & BILLING TESTS PASSED PERFECTLY! 🚀")

if __name__ == "__main__":
    run_tests()
