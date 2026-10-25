from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.models.organization import Organization
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user under an organization with hashed password"""
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Validate org if provided, or create a brand new isolated organization
    org_id = req.org_id
    if org_id:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
    else:
        # Create a fresh tenant Organization with 0 projects and 0 agents on Free tier
        import uuid
        import re
        from datetime import datetime, timedelta
        from app.models.plan import Plan
        from app.models.subscription import Subscription

        org_name = (req.org_name or "").strip() or f"{req.full_name}'s Org"
        slug_base = re.sub(r'[^a-z0-9]+', '-', org_name.lower()).strip('-') or "org"
        slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

        new_org = Organization(
            id=str(uuid.uuid4()),
            name=org_name,
            slug=slug,
            status="active"
        )
        db.add(new_org)
        db.commit()
        db.refresh(new_org)
        org_id = new_org.id

        # Auto-provision Free Plan Subscription for this new organization
        free_plan = db.query(Plan).filter(Plan.name == "free").first()
        if free_plan:
            new_sub = Subscription(
                id=str(uuid.uuid4()),
                org_id=new_org.id,
                plan_id=free_plan.id,
                status="active",
                billing_cycle="monthly",
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=3650),
            )
            db.add(new_sub)
            db.commit()

    hashed = hash_password(req.password)
    new_user = User(
        email=req.email,
        password_hash=hashed,
        full_name=req.full_name,
        org_id=org_id,
        role=req.role or "super_admin",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({
        "sub": new_user.id,
        "user_id": new_user.id,
        "email": new_user.email,
        "org_id": new_user.org_id,
        "role": new_user.role,
        "name": new_user.full_name
    })

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning signed JWT"""
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email credentials or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    token = create_access_token({
        "sub": user.id,
        "user_id": user.id,
        "email": user.email,
        "org_id": user.org_id,
        "role": user.role,
        "name": user.full_name
    })

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile data of currently authenticated user"""
    return UserResponse.model_validate(current_user)
