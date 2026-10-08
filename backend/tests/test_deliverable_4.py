import os
import sys
import uuid
# pytest omitted
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password, create_access_token, decrypt_secret
from app.models import Organization, User, Project, ProjectConfig, ApiIntegration
from main import app

client = TestClient(app)

def setup_module(module):
    """Setup test database tables and super admin token"""
    Base.metadata.create_all(bind=engine)

def test_admin_domain_templates():
    """Verify listing of BFSI domain templates"""
    import uuid
    db = SessionLocal()
    admin_email = f"superadmin_test_{str(uuid.uuid4())[:8]}@bfsi.com"
    admin_user = User(
        email=admin_email,
        password_hash=hash_password("adminpass"),
        full_name="Super Admin",
        role="super_admin"
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    token = create_access_token({"sub": admin_user.id, "user_id": admin_user.id, "email": admin_user.email, "role": "super_admin"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/admin/templates", headers=headers)
    assert response.status_code == 200
    templates = response.json()
    assert len(templates) == 3
    domains = [t["domain"] for t in templates]
    assert "banking" in domains
    assert "finance" in domains
    assert "insurance" in domains
    db.close()

def test_admin_org_and_project_workflow():
    """Verify Org creation, user creation, project creation with template pre-fill, and config update"""
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "super_admin").first()
    token = create_access_token({"sub": admin.id, "user_id": admin.id, "email": admin.email, "role": "super_admin"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Organization
    slug_val = f"first-national-bank-{str(uuid.uuid4())[:8]}"
    org_res = client.post("/api/admin/orgs", json={"name": "First National Bank", "slug": slug_val}, headers=headers)
    assert org_res.status_code == 200
    org_data = org_res.json()
    org_id = org_data["id"]

    # 2. Create Project under Org with Insurance template pre-fill
    proj_res = client.post(
        f"/api/admin/orgs/{org_id}/projects",
        json={"name": "Auto Insurance Claims Bot", "domain": "insurance", "template_domain": "insurance"},
        headers=headers
    )
    assert proj_res.status_code == 200
    proj_id = proj_res.json()["id"]

    # 3. Check pre-filled Project Config
    config_res = client.get(f"/api/admin/projects/{proj_id}/config", headers=headers)
    assert config_res.status_code == 200
    config_data = config_res.json()
    assert "Insurance Assistant" in config_data["system_prompt"]
    assert config_data["guardrails"]["pii_masking"] is True

    # 4. Update System Prompt and Guardrails
    update_res = client.put(
        f"/api/admin/projects/{proj_id}/config",
        json={
            "system_prompt": "Customized Insurance Claims Agent Prompt",
            "guardrails": {"blocked_topics": ["fake claims"], "pii_masking": True}
        },
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["system_prompt"] == "Customized Insurance Claims Agent Prompt"
    db.close()

def test_api_integration_secret_encryption():
    """Verify API integration creation encrypts secret key and test call executes safely"""
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "super_admin").first()
    project = db.query(Project).first()
    token = create_access_token({"sub": admin.id, "user_id": admin.id, "email": admin.email, "role": "super_admin"})
    headers = {"Authorization": f"Bearer {token}"}

    raw_secret = "secret_bearer_token_9999"
    integ_res = client.post(
        f"/api/admin/projects/{project.id}/integrations",
        json={
            "name": "Core Banking API",
            "base_url": "https://httpbin.org",
            "auth_type": "bearer",
            "secret_key": raw_secret,
            "endpoints": [{"name": "get_balance", "method": "GET", "path": "/get"}]
        },
        headers=headers
    )
    assert integ_res.status_code == 200
    integ_data = integ_res.json()
    assert integ_data["has_secret"] is True

    # Verify secret is encrypted in DB and not leaked plain text
    db.commit()
    db_item = db.query(ApiIntegration).filter(ApiIntegration.id == integ_data["id"]).first()
    assert db_item is not None
    assert db_item.encrypted_secret != raw_secret
    assert decrypt_secret(db_item.encrypted_secret) == raw_secret

    # Test call execution
    test_res = client.post(
        f"/api/admin/integrations/{integ_data['id']}/test-call",
        json={"endpoint_name": "get_balance"},
        headers=headers
    )
    assert test_res.status_code == 200
    test_body = test_res.json()
    assert "status_code" in test_body
    db.close()

if __name__ == "__main__":
    test_admin_domain_templates()
    test_admin_org_and_project_workflow()
    test_api_integration_secret_encryption()
    print("[SUCCESS] All Deliverable 4 Admin API tests passed successfully!")
