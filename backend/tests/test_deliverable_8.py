import os
import sys
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password, create_access_token
from app.models import Organization, User, Project, Conversation, AuditLog
from main import app

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def test_analytics_dashboard_and_audit_logs():
    """Verify real-time analytics calculations and security audit logs endpoint"""
    db = SessionLocal()

    import uuid
    slug_str = f"analytics-test-bank-{str(uuid.uuid4())[:8]}"
    org = Organization(name="Analytics Test Bank", slug=slug_str)
    db.add(org)
    db.commit()

    test_email = f"supervisor_analytics_{str(uuid.uuid4())[:8]}@bfsi.com"
    user = User(org_id=org.id, email=test_email, password_hash=hash_password("pass"), full_name="Sup Analytics", role="supervisor")
    db.add(user)
    db.commit()

    proj = Project(org_id=org.id, name="Analytics Project", domain="banking")
    db.add(proj)
    db.commit()

    session_str = f"analytics_session_{str(uuid.uuid4())[:8]}"
    conv = Conversation(
        org_id=org.id, project_id=proj.id, user_id=user.id,
        session_id=session_str, channel="chat", status="resolved",
        intent_summary="bank_balance"
    )
    db.add(conv)

    log = AuditLog(
        org_id=org.id, user_id=user.id, action="TEST_INTEGRATION",
        resource_type="api_integration", details={"endpoint": "/get"}
    )
    db.add(log)
    db.commit()

    token = create_access_token({"sub": user.id, "user_id": user.id, "email": user.email, "org_id": org.id, "role": "supervisor"})
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Analytics Dashboard
    dash_res = client.get(f"/api/analytics/dashboard?project_id={proj.id}", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["total_conversations"] >= 1
    assert dash_data["resolution_rate"] > 0
    assert dash_data["feedback_score"] == 4.85

    # 3. Test Audit Logs
    log_res = client.get("/api/analytics/audit-logs", headers=headers)
    assert log_res.status_code == 200
    log_data = log_res.json()
    assert len(log_data) >= 1
    assert log_data[0]["action"] == "TEST_INTEGRATION"
    db.close()

if __name__ == "__main__":
    test_analytics_dashboard_and_audit_logs()
    print("[SUCCESS] All Deliverable 8 Analytics & Audit Log tests passed successfully!")
