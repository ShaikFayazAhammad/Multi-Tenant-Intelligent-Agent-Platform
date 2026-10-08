import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional, Any
import jwt
from cryptography.fernet import Fernet
from app.core.config import settings

# --- Password Security ---
def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt for secure storage"""
    salt = settings.JWT_SECRET[:16].encode('utf-8')
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored hash"""
    return hash_password(plain_password) == hashed_password


# --- Secret Vault Encryption (Fernet AES-256) ---
def _get_fernet_key() -> bytes:
    key_bytes = settings.ENCRYPTION_KEY.encode('utf-8')
    # Pad or slice key to 32 bytes and base64 encode for Fernet requirement
    hashed = hashlib.sha256(key_bytes).digest()
    return base64.urlsafe_b64encode(hashed)

def encrypt_secret(plain_text: str) -> str:
    """Encrypt sensitive API keys or credentials before DB persistence"""
    if not plain_text:
        return ""
    f = Fernet(_get_fernet_key())
    return f.encrypt(plain_text.encode('utf-8')).decode('utf-8')

def decrypt_secret(cipher_text: str) -> str:
    """Decrypt sensitive API keys for runtime execution (Never sent to frontend)"""
    if not cipher_text:
        return ""
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(cipher_text.encode('utf-8')).decode('utf-8')
    except Exception:
        return ""


# --- JWT Token Security ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT token containing user_id, org_id, and role"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate JWT access token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception:
        return None
