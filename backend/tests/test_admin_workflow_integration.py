import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password, create_access_token, decrypt_secret
from app.models import Organization, User, Project, ProjectConfig, ApiIntegration, KnowledgeDoc
from app.orchestrator.rag_service import PerProjectRAGService
from app.orchestrator.dynamic_tools import DynamicToolFactory
from main import app

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def get_super_admin_headers():
    db = SessionLocal()
    admin_email = f"superadmin_{str(uuid.uuid4())[:8]}@bfsi.com"
    admin = User(
        email=admin_email,
        password_hash=hash_password("admin123"),
        full_name="Workflow Super Admin",
        role="super_admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token({
        "sub": admin.id,
        "user_id": admin.id,
        "email": admin.email,
        "role": "super_admin"
    })
    db.close()
    return {"Authorization": f"Bearer {token}"}

def test_complete_admin_workflow_hierarchy_and_lifecycle():
    """
    Test Step 1: Organization Creation + User Credentials Onboarding
    Test Step 2: Multiple Projects under Organization
    Test Step 3: Agent Lifecycle Status (Draft -> Live -> Paused -> Draft)
    Test Step 4: Prompt, Guardrails & LLM Config Updates
    """
    headers = get_super_admin_headers()
    unique_suffix = str(uuid.uuid4())[:8]

    # --- 1. CREATE ORGANIZATION ---
    org_slug = f"apex-bank-{unique_suffix}"
    org_res = client.post(
        "/api/admin/orgs",
        json={"name": "Apex Global Bank", "slug": org_slug},
        headers=headers
    )
    assert org_res.status_code == 200, org_res.text
    org_data = org_res.json()
    org_id = org_data["id"]
    assert org_data["name"] == "Apex Global Bank"
    assert org_data["slug"] == org_slug

    # --- 2. ONBOARD CREDENTIALS (USER) UNDER ORG ---
    user_email = f"lead_apex_{unique_suffix}@apexbank.com"
    user_res = client.post(
        f"/api/admin/orgs/{org_id}/users",
        json={
            "email": user_email,
            "password": "ApexPassword123!",
            "full_name": "Apex Operations Lead",
            "role": "lead"
        },
        headers=headers
    )
    assert user_res.status_code == 200, user_res.text
    user_data = user_res.json()
    assert user_data["email"] == user_email
    assert user_data["role"] == "lead"
    assert user_data["org_id"] == org_id

    # --- 3. CREATE MULTIPLE PROJECTS UNDER ORG ---
    # Project A: Retail Banking
    p_banking_res = client.post(
        f"/api/admin/orgs/{org_id}/projects",
        json={
            "name": "Apex Retail Banking",
            "domain": "banking",
            "template_domain": "banking",
            "status": "Draft"
        },
        headers=headers
    )
    assert p_banking_res.status_code == 200, p_banking_res.text
    proj_banking_id = p_banking_res.json()["id"]

    # Project B: Wealth Management
    p_wealth_res = client.post(
        f"/api/admin/orgs/{org_id}/projects",
        json={
            "name": "Apex Wealth Advisory",
            "domain": "finance",
            "template_domain": "finance",
            "status": "Draft"
        },
        headers=headers
    )
    assert p_wealth_res.status_code == 200, p_wealth_res.text
    proj_wealth_id = p_wealth_res.json()["id"]

    # Verify both projects exist under org
    list_res = client.get(f"/api/admin/orgs/{org_id}/projects", headers=headers)
    assert list_res.status_code == 200
    projects_list = list_res.json()
    proj_ids = [p["id"] for p in projects_list]
    assert proj_banking_id in proj_ids
    assert proj_wealth_id in proj_ids

    # --- 4. AGENT LIFECYCLE CONTROLS (Draft -> Live -> Paused) ---
    # Make Project A Active/Live
    live_res = client.patch(
        f"/api/admin/projects/{proj_banking_id}/status",
        json={"status": "Live"},
        headers=headers
    )
    assert live_res.status_code == 200, live_res.text
    assert live_res.json()["status"] == "Live"

    # Pause Project A
    pause_res = client.patch(
        f"/api/admin/projects/{proj_banking_id}/status",
        json={"status": "Paused"},
        headers=headers
    )
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "Paused"

    # Revert to Draft
    draft_res = client.patch(
        f"/api/admin/projects/{proj_banking_id}/status",
        json={"status": "Draft"},
        headers=headers
    )
    assert draft_res.status_code == 200
    assert draft_res.json()["status"] == "Draft"

    # --- 5. SYSTEM PROMPT, GUARDRAILS & MODEL CONFIG ---
    cfg_update_res = client.put(
        f"/api/admin/projects/{proj_banking_id}/config",
        json={
            "system_prompt": "You are Apex Virtual Banker. Assist verified customers with accounts and transactions politely.",
            "guardrails": {
                "blocked_topics": ["money laundering", "insider trading"],
                "required_disclaimers": ["Apex Global Bank is an FDIC-insured institution."],
                "pii_masking": True
            },
            "agent_settings": {
                "llm_model": "google/gemini-2.0-flash-001",
                "temperature": 0.2,
                "max_tokens": 800
            }
        },
        headers=headers
    )
    assert cfg_update_res.status_code == 200, cfg_update_res.text
    cfg_data = cfg_update_res.json()
    assert "Apex Virtual Banker" in cfg_data["system_prompt"]
    assert cfg_data["guardrails"]["pii_masking"] is True
    assert "money laundering" in cfg_data["guardrails"]["blocked_topics"]
    assert cfg_data["agent_settings"]["llm_model"] == "google/gemini-2.0-flash-001"

def test_rag_upload_and_crawl_workflow():
    """
    Test Step 5: Knowledge Base RAG Attach (Document Upload + URL Crawl + Query Retrieval)
    """
    headers = get_super_admin_headers()
    unique_suffix = str(uuid.uuid4())[:8]

    # Setup Org & Project
    org_res = client.post(
        "/api/admin/orgs",
        json={"name": f"RAG Test Org {unique_suffix}", "slug": f"rag-org-{unique_suffix}"},
        headers=headers
    )
    org_id = org_res.json()["id"]

    proj_res = client.post(
        f"/api/admin/orgs/{org_id}/projects",
        json={"name": "RAG Project", "domain": "banking", "template_domain": "banking"},
        headers=headers
    )
    proj_id = proj_res.json()["id"]

    # 1. Direct text/PDF document upload simulation into RAG Service
    sample_faq = (
        "Apex Platinum Savings Account offers 4.5% APY with zero monthly fees.\n\n"
        "To qualify for the 4.5% APY, maintain a minimum daily balance of $1,000."
    )
    chunks_indexed = PerProjectRAGService.index_document_text(
        project_id=proj_id,
        filename="apex_platinum_faq.txt",
        content=sample_faq,
        source="upload"
    )
    assert chunks_indexed >= 1

    # 2. Query Project Knowledge Base
    retrieved = PerProjectRAGService.query_project_kb(proj_id, "Platinum Savings APY interest rate")
    assert len(retrieved) > 0
    assert any("4.5% APY" in item["text"] for item in retrieved)
    assert retrieved[0]["filename"] == "apex_platinum_faq.txt"

    # 3. Test Crawl URL endpoint
    crawl_res = client.post(
        f"/api/admin/projects/{proj_id}/kb/crawl",
        json={"url": "https://httpbin.org/html"},
        headers=headers
    )
    assert crawl_res.status_code == 200, crawl_res.text
    crawl_data = crawl_res.json()
    assert crawl_data["doc_metadata"]["source"] == "web_crawler"
    assert "httpbin" in crawl_data["doc_metadata"]["url"].lower() or "httpbin" in crawl_data["filename"].lower()

    # 4. List Documents for Project
    docs_list_res = client.get(f"/api/admin/projects/{proj_id}/kb", headers=headers)
    assert docs_list_res.status_code == 200
    docs = docs_list_res.json()
    assert len(docs) >= 1
    assert any("httpbin" in d.get("doc_metadata", {}).get("url", "") or "Web:" in d["filename"] for d in docs)

    # 5. Clean up document chunks
    deleted = PerProjectRAGService.delete_document_chunks(proj_id, "apex_platinum_faq.txt")
    assert deleted is True

def test_api_vault_and_dynamic_tools():
    """
    Test Step 6: API Vault Integration, Encrypted Secret Storage, and Test Call
    """
    headers = get_super_admin_headers()
    unique_suffix = str(uuid.uuid4())[:8]

    # Setup Org & Project
    org_res = client.post(
        "/api/admin/orgs",
        json={"name": f"API Vault Org {unique_suffix}", "slug": f"vault-org-{unique_suffix}"},
        headers=headers
    )
    org_id = org_res.json()["id"]

    proj_res = client.post(
        f"/api/admin/orgs/{org_id}/projects",
        json={"name": "API Vault Project", "domain": "banking", "template_domain": "banking"},
        headers=headers
    )
    proj_id = proj_res.json()["id"]

    # 1. Create API Integration in Vault with secret
    secret = "sk_live_secret_bank_key_12345"
    integ_res = client.post(
        f"/api/admin/projects/{proj_id}/integrations",
        json={
            "name": "Core Banking Balances",
            "base_url": "https://httpbin.org",
            "auth_type": "bearer",
            "secret_key": secret,
            "endpoints": [
                {"name": "get_account_balance", "method": "GET", "path": "/get"}
            ]
        },
        headers=headers
    )
    assert integ_res.status_code == 200, integ_res.text
    integ_data = integ_res.json()
    integ_id = integ_data["id"]
    assert integ_data["name"] == "Core Banking Balances"
    assert integ_data["has_secret"] is True

    # 2. Verify encrypted in DB and not in plaintext
    db = SessionLocal()
    db_integ = db.query(ApiIntegration).filter(ApiIntegration.id == integ_id).first()
    assert db_integ is not None
    assert db_integ.encrypted_secret != secret
    assert decrypt_secret(db_integ.encrypted_secret) == secret

    # 3. Test Dynamic Tool Generation from integration
    tools = DynamicToolFactory.build_tools_for_project([db_integ])
    assert "core_banking_balances_get_account_balance" in tools
    db.close()

    # 4. Execute Test Call via API Vault endpoint
    test_call_res = client.post(
        f"/api/admin/integrations/{integ_id}/test-call",
        json={"endpoint_name": "get_account_balance"},
        headers=headers
    )
    assert test_call_res.status_code == 200, test_call_res.text
    call_result = test_call_res.json()
    assert call_result["status_code"] == 200
    assert call_result["success"] is True
    assert "response_body" in call_result
    assert call_result["latency_ms"] > 0

def test_playground_simulator_with_guardrails_and_rag():
    """
    Test Step 7: Agent Playground Simulator Node
    - Tests blocked topic rejection via input guardrail
    - Tests normal query with RAG context
    """
    headers = get_super_admin_headers()
    unique_suffix = str(uuid.uuid4())[:8]

    # Setup Org, Project, Config
    org_res = client.post(
        "/api/admin/orgs",
        json={"name": f"Playground Org {unique_suffix}", "slug": f"pg-org-{unique_suffix}"},
        headers=headers
    )
    org_id = org_res.json()["id"]

    proj_res = client.post(
        f"/api/admin/orgs/{org_id}/projects",
        json={"name": "Playground Bot", "domain": "banking", "template_domain": "banking"},
        headers=headers
    )
    proj_id = proj_res.json()["id"]

    # Index RAG document for this project
    PerProjectRAGService.index_document_text(
        project_id=proj_id,
        filename="branch_hours.txt",
        content="Apex Downtown Branch is open Monday through Friday from 9 AM to 5 PM.",
        source="upload"
    )

    # 1. Test Blocked Topic in Playground
    blocked_res = client.post(
        f"/api/admin/projects/{proj_id}/playground-test",
        json={"query": "How do I do crypto gambling and laundering?"},
        headers=headers
    )
    assert blocked_res.status_code == 200, blocked_res.text
    blocked_data = blocked_res.json()
    assert blocked_data["is_flagged"] is True
    assert blocked_data["intent"] == "blocked_input"
    assert "restricted" in blocked_data["answer"].lower() or "apologize" in blocked_data["answer"].lower()

    # 2. Test Safe Query in Playground with RAG retrieval
    safe_res = client.post(
        f"/api/admin/projects/{proj_id}/playground-test",
        json={"query": "What are the hours for Apex Downtown Branch?"},
        headers=headers
    )
    assert safe_res.status_code == 200, safe_res.text
    safe_data = safe_res.json()
    assert safe_data["is_flagged"] is False
    assert len(safe_data["rag_passages"]) > 0
    assert any("9 AM to 5 PM" in p["text"] for p in safe_data["rag_passages"])
    assert "answer" in safe_data
    assert safe_data["latency_ms"] > 0
