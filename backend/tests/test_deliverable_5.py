import os
import sys
import asyncio
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password, create_access_token, encrypt_secret
from app.core.guardrails import GuardrailsEngine
from app.models import Organization, User, Project, ProjectConfig, ApiIntegration
from app.orchestrator.dynamic_tools import DynamicToolFactory
from app.orchestrator.rag_service import PerProjectRAGService
from app.orchestrator.dynamic_graph import DynamicOrchestrator
from main import app

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def test_guardrails_input_pre_check_and_pii_masking():
    """Verify input pre-check blocked topic rejection and PII masking"""
    config = {
        "blocked_topics": ["crypto gambling", "illegal tax evasion"],
        "required_disclaimers": ["Official Banking Disclaimer"],
        "pii_masking": True
    }

    # 1. Blocked Topic Test
    is_blocked, proc_input, reason = GuardrailsEngine.pre_check_input("Tell me about crypto gambling methods", config)
    assert is_blocked is True
    assert "crypto gambling" in reason

    # 2. PII Masking Test
    is_blocked, proc_input, _ = GuardrailsEngine.pre_check_input("My email is john.doe@example.com and phone is +1-555-123-4567", config)
    assert is_blocked is False
    assert "[REDACTED_EMAIL]" in proc_input
    assert "[REDACTED_PHONE]" in proc_input

def test_guardrails_output_post_check():
    """Verify disclaimer appending and output PII masking"""
    config = {
        "blocked_topics": [],
        "required_disclaimers": ["All interest rates subject to approval."],
        "pii_masking": True
    }

    raw_response = "Your balance query for card 4111-2222-3333-4444 has been processed."
    final_output, escalate, _ = GuardrailsEngine.post_check_output(raw_response, config)
    
    assert "[REDACTED_CARD]" in final_output
    assert "All interest rates subject to approval." in final_output

def test_per_project_rag_isolation():
    """Verify RAG document indexing and isolated query per project ID"""
    proj1_id = "p1_banking"
    proj2_id = "p2_insurance"

    PerProjectRAGService.index_document_text(proj1_id, "banking_faq.txt", "Savings account minimum balance is $500.")
    PerProjectRAGService.index_document_text(proj2_id, "insurance_faq.txt", "Auto insurance deductible is $250.")

    # Query Project 1
    res1 = PerProjectRAGService.query_project_kb(proj1_id, "minimum balance")
    assert len(res1) > 0
    assert "Savings account" in res1[0]["text"]

    # Query Project 2 (Should not return Project 1 info)
    res2 = PerProjectRAGService.query_project_kb(proj2_id, "minimum balance")
    assert len(res2) == 0

def test_dynamic_tools_builder_and_orchestration():
    """Verify dynamic tools creation from DB integration specs and session processing"""
    db = SessionLocal()

    import uuid
    slug_str = f"dynamic-test-bank-{str(uuid.uuid4())[:8]}"
    org = Organization(name="Dynamic Test Bank", slug=slug_str)
    db.add(org)
    db.commit()

    test_email = f"supervisor_test_{str(uuid.uuid4())[:8]}@bfsi.com"
    user = User(org_id=org.id, email=test_email, password_hash=hash_password("pass"), full_name="Sup User", role="supervisor")
    db.add(user)
    db.commit()

    proj = Project(org_id=org.id, name="Core Banking Project", domain="banking")
    db.add(proj)
    db.commit()

    config = ProjectConfig(
        project_id=proj.id,
        system_prompt="You are a Banking Assistant.",
        guardrails={"blocked_topics": ["money laundering"], "required_disclaimers": ["Member FDIC"], "pii_masking": True}
    )
    db.add(config)

    integ = ApiIntegration(
        org_id=org.id,
        project_id=proj.id,
        name="Account Service",
        base_url="https://httpbin.org",
        auth_type="bearer",
        encrypted_secret=encrypt_secret("test_token_123"),
        endpoints=[{"name": "check_balance", "method": "GET", "path": "/get"}]
    )
    db.add(integ)
    db.commit()

    # Test Dynamic Tool Factory
    tools = DynamicToolFactory.build_tools_for_project([integ])
    assert "account_service_check_balance" in tools

    # Test Full Dynamic Orchestrator Turn
    token = create_access_token({"sub": user.id, "user_id": user.id, "email": user.email, "org_id": org.id, "role": "supervisor"})
    headers = {"Authorization": f"Bearer {token}"}

    chat_res = client.post(
        "/api/client/chat",
        json={"project_id": proj.id, "message": "Can you check my balance for account_service_check_balance?"},
        headers=headers
    )
    assert chat_res.status_code == 200
    res_data = chat_res.json()
    assert "answer" in res_data
    assert "Member FDIC" in res_data["answer"]
    db.close()

if __name__ == "__main__":
    test_guardrails_input_pre_check_and_pii_masking()
    test_guardrails_output_post_check()
    test_per_project_rag_isolation()
    test_dynamic_tools_builder_and_orchestration()
    print("[SUCCESS] All Deliverable 5 Orchestrator & Guardrail tests passed successfully!")
