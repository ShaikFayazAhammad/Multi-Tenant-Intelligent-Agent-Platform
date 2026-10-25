from typing import Optional
from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    role: Optional[str] = "super_admin" # super_admin, supervisor, lead

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    org_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
