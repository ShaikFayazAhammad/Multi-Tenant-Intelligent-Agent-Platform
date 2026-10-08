import os
import sys

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password, verify_password, encrypt_secret, decrypt_secret, create_access_token, decode_access_token
from app.models import Organization, User, Project, ProjectConfig, KnowledgeDoc, ApiIntegration, Conversation, Message
from app.api.dependencies import TenantContext

def test_database_schema_creation():
    """Verify that all models can be created cleanly in database"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create test Org
        org = Organization(name="Test Bank Org", slug="test-bank-org")
        db.add(org)
        db.commit()
        db.refresh(org)
        assert org.id is not None

        # Create test User
        user = User(
            org_id=org.id,
            email="testuser@bfsi.com",
            password_hash=hash_password("password123"),
            full_name="Test User",
            role="supervisor"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        assert user.id is not None
        assert user.org_id == org.id

        # Clean up
        db.delete(user)
        db.delete(org)
        db.commit()
    finally:
        db.close()

def test_password_security():
    """Verify password hashing and verification"""
    raw_pass = "SecurePass2026!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_fernet_secret_vault():
    """Verify Fernet AES-256 secret encryption and decryption"""
    api_key = "sk_live_bfsi_secret_token_12345"
    encrypted = encrypt_secret(api_key)
    assert encrypted != api_key
    decrypted = decrypt_secret(encrypted)
    assert decrypted == api_key

def test_jwt_token_handling():
    """Verify signed JWT token creation and decoding"""
    token_data = {
        "sub": "user-123",
        "user_id": "user-123",
        "email": "lead@bfsi.com",
        "org_id": "org-456",
        "role": "lead"
    }
    token = create_access_token(token_data)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["user_id"] == "user-123"
    assert decoded["org_id"] == "org-456"
    assert decoded["role"] == "lead"

def test_tenant_context_permissions():
    """Verify TenantContext access control logic"""
    dummy_user = User(id="u1", org_id="org1", role="supervisor")
    ctx = TenantContext(user=dummy_user, org_id="org1", role="supervisor", project_ids=["p1", "p2"])
    
    assert ctx.is_supervisor() is True
    assert ctx.is_super_admin() is False
    assert ctx.can_access_org("org1") is True
    assert ctx.can_access_org("org2") is False

if __name__ == "__main__":
    test_database_schema_creation()
    test_password_security()
    test_fernet_secret_vault()
    test_jwt_token_handling()
    test_tenant_context_permissions()
    print("[SUCCESS] All Deliverable 3 tests passed successfully!")
