import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "BFSI Multi-Tenant Agent Platform"
    API_V1_STR: str = "/api/v1"
    
    # MySQL Database Configuration
    MYSQL_SERVER: str = os.getenv("MYSQL_SERVER", "localhost")
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "root")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "bfsi_platform")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT", "3306")
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_SERVER}:{MYSQL_PORT}/{MYSQL_DB}"
    )

    # JWT Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "bfsi-super-secret-jwt-key-2026-change-in-prod")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Secret Vault Encryption Key (Fernet AES-256)
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "uN_4V6kZqX7zP_Y0qL9rT3vW8xM1nB5vC8xD7yZ4wE2=")

    # Vector Store & AI
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

    class Config:
        case_sensitive = True

settings = Settings()
