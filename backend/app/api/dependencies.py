from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)

class TenantContext:
    def __init__(self, user: User, org_id: Optional[str], role: str, project_ids: List[str] = None):
        self.user = user
        self.user_id = user.id
        self.org_id = org_id
        self.role = role
        self.project_ids = project_ids or []

    def is_super_admin(self) -> bool:
        return self.role == "super_admin"

    def is_supervisor(self) -> bool:
        return self.role in ["super_admin", "supervisor"]

    def can_access_org(self, target_org_id: str) -> bool:
        if self.is_super_admin():
            return True
        return self.org_id == target_org_id

    def can_access_project(self, target_project_id: str, db: Session = None) -> bool:
        if self.is_super_admin():
            return True
        if self.role == "supervisor":
            # Supervisors see all projects in their org
            return True
        # Leads see assigned projects
        return target_project_id in self.project_ids


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validate bearer JWT token and return authenticated User record"""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id") or payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Check by email fallback
        user = db.query(User).filter(User.email == payload.get("email")).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found",
        )
    return user


def get_tenant_context(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TenantContext:
    """
    Enforce tenant scoping dependency on every query.
    Extracts org_id and role from user record & JWT payload.
    """
    org_id = user.org_id
    role = user.role
    
    # Project assignment logic for leads can be expanded or loaded
    project_ids = []
    
    return TenantContext(
        user=user,
        org_id=org_id,
        role=role,
        project_ids=project_ids
    )


def require_super_admin(ctx: TenantContext = Depends(get_tenant_context)) -> TenantContext:
    if not ctx.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Super Admin role"
        )
    return ctx


def require_supervisor(ctx: TenantContext = Depends(get_tenant_context)) -> TenantContext:
    if not ctx.is_supervisor():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Supervisor or Super Admin roles"
        )
    return ctx
