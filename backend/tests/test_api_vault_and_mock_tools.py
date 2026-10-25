import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.security import create_access_token

client = TestClient(app)

def get_auth_headers():
    token = create_access_token(
        data={"sub": "33333333-3333-3333-3333-333333333333", "role": "super_admin", "org_id": "11111111-1111-1111-1111-111111111111"}
    )
    return {"Authorization": f"Bearer {token}"}


def test_parse_curl_get():
    headers = get_auth_headers()
    curl_str = 'curl -X GET "https://api.example.com/v1/accounts/123?format=json" -H "Authorization: Bearer secret_token_123" -H "Accept: application/json"'
    resp = client.post("/api/admin/parse-curl", json={"curl_command": curl_str}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["method"] == "GET"
    assert data["base_url"] == "https://api.example.com"
    assert data["path"] == "/v1/accounts/123"
    assert data["auth_type"] == "bearer"
    assert data["auth_value_present"] is True
    assert data["query_params"].get("format") == "json"


def test_parse_curl_post_json():
    headers = get_auth_headers()
    curl_str = """curl -X POST https://api.bank.com/cards/block \
      -H "Content-Type: application/json" \
      -H "X-API-Key: my_api_key" \
      -d '{"card_number": "4111222233334444", "reason": "lost"}'"""
    resp = client.post("/api/admin/parse-curl", json={"curl_command": curl_str}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["method"] == "POST"
    assert data["auth_type"] == "api_key"
    assert data["body_json"]["card_number"] == "4111222233334444"
    assert data["body_json"]["reason"] == "lost"


def test_mock_banking_apis():
    # Balance
    resp = client.get("/api/mock/banking/accounts/ACC100234/balance")
    assert resp.status_code == 200
    data = resp.json()
    assert data["_mock"] is True
    assert data["data"]["account_id"] == "ACC100234"
    assert "available_balance" in data["data"]

    # Account details
    resp2 = client.get("/api/mock/banking/accounts/ACC100234")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert "holder_name" in data2["data"]
    assert data2["data"]["status"] == "Active"

    # Loan status
    resp3 = client.get("/api/mock/banking/loans/LN882211/status")
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["data"]["loan_id"] == "LN882211"
    assert "outstanding_amount" in data3["data"]


def test_mock_insurance_apis():
    # Policy details
    resp = client.get("/api/mock/insurance/policies/POL99212")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["policy_id"] == "POL99212"
    assert "sum_assured" in data["data"]

    # Claim status
    resp2 = client.get("/api/mock/insurance/claims/CLM55443/status")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["data"]["claim_id"] == "CLM55443"
    assert "claimed_amount" in data2["data"]


def test_mock_finance_emi():
    resp = client.get("/api/mock/finance/emi?principal=500000&rate=9.5&tenure=36")
    assert resp.status_code == 200
    data = resp.json()
    assert data["inputs"]["principal"] == 500000.0
    assert data["emi_amount"] > 0
    assert "total_amount_payable" in data


def test_install_mock_integrations_and_tool_assignments():
    headers = get_auth_headers()
    project_id = "22222222-2222-2222-2222-222222222222"

    # Install mock integrations
    resp = client.post(f"/api/admin/projects/{project_id}/install-mock-integrations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert len(data["integration_ids"]) == 3

    # Update tool assignments (disable first integration)
    first_id = data["integration_ids"][0]
    assign_resp = client.put(
        f"/api/admin/projects/{project_id}/tool-assignments",
        json={"assignments": [{"integration_id": first_id, "is_enabled": False}]},
        headers=headers,
    )
    assert assign_resp.status_code == 200
    assign_data = assign_resp.json()
    assert assign_data["updated"] == 1

    # Re-enable it
    assign_resp2 = client.put(
        f"/api/admin/projects/{project_id}/tool-assignments",
        json={"assignments": [{"integration_id": first_id, "is_enabled": True}]},
        headers=headers,
    )
    assert assign_resp2.status_code == 200


def test_hubspot_status_and_install():
    headers = get_auth_headers()
    project_id = "22222222-2222-2222-2222-222222222222"

    # Status check (should be unconfigured by default)
    resp = client.get(f"/api/admin/hubspot/status?project_id={project_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["unconfigured", "connected"]

    # Install HubSpot integration for project
    resp2 = client.post(f"/api/admin/projects/{project_id}/install-hubspot-integration", headers=headers)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] in ["installed", "success", "already_installed"]
    assert data2.get("integration_id") is not None or "HubSpot" in data2["message"]


def test_playground_with_mock_tool():
    headers = get_auth_headers()
    project_id = "22222222-2222-2222-2222-222222222222"

    # Ensure mock integrations are installed & enabled
    client.post(f"/api/admin/projects/{project_id}/install-mock-integrations", headers=headers)

    # Test playground query that requests balance
    chat_resp = client.post(
        f"/api/admin/projects/{project_id}/playground-test",
        json={"query": "What is the available balance for account ACC100234?"},
        headers=headers,
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "answer" in chat_data
    # tool_calls should have executed an API tool
    assert len(chat_data["tool_calls"]) > 0
    tc = chat_data["tool_calls"][0]
    assert tc["status"] == "success"
    assert tc["status_code"] == 200
    assert tc["result"] is not None


def test_hubspot_demo_sandbox_in_playground():
    headers = get_auth_headers()
    project_id = "22222222-2222-2222-2222-222222222222"

    # Connect with demo sandbox token
    conn_resp = client.post(
        "/api/admin/hubspot/connect",
        json={"project_id": project_id, "private_app_token": "pat-demo-hubspot-sandbox"},
        headers=headers,
    )
    assert conn_resp.status_code == 200

    # Test playground search query for John in HubSpot
    chat_resp = client.post(
        f"/api/admin/projects/{project_id}/playground-test",
        json={"query": "Search contacts for John in HubSpot CRM"},
        headers=headers,
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "answer" in chat_data
    # Should have executed hubspot_crm_search_contacts with 200 OK
    tc = [t for t in chat_data.get("tool_calls", []) if "hubspot" in t["tool"]]
    assert len(tc) > 0
    assert tc[0]["status"] == "success"
    assert tc[0]["status_code"] == 200
    assert "John" in str(tc[0]["result"])
