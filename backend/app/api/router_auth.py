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

    # Validate org if provided
    org_id = req.org_id
    if org_id:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
    else:
        # If no org provided and not super_admin, assign to default org if exists
        default_org = db.query(Organization).first()
        if default_org:
            org_id = default_org.id

    hashed = hash_password(req.password)
    new_user = User(
        email=req.email,
        password_hash=hashed,
        full_name=req.full_name,
        org_id=org_id,
        role=req.role or "lead",
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
