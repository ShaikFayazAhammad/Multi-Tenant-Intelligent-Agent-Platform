import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env
load_dotenv()

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
        f"mysql+pymysql://{os.getenv('MYSQL_USER','root')}:{os.getenv('MYSQL_PASSWORD','root')}@{os.getenv('MYSQL_SERVER','localhost')}:{os.getenv('MYSQL_PORT','3306')}/{os.getenv('MYSQL_DB','bfsi_platform')}"
    )

    # JWT Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "bfsi-super-secret-jwt-key-2026-change-in-prod")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Secret Vault Encryption Key (Fernet AES-256)
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "uN_4V6kZqX7zP_Y0qL9rT3vW8xM1nB5vC8xD7yZ4wE2=")

    # Vector Store
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

    # Legacy OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # OpenRouter LLM (primary)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "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")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OPENROUTER_DEFAULT_MODEL: str = os.getenv("OPENROUTER_DEFAULT_MODEL", "google/gemini-2.0-flash-001")
    OPENROUTER_FALLBACK_MODEL: str = os.getenv("OPENROUTER_FALLBACK_MODEL", "meta-llama/llama-3.1-8b-instruct")

    # ElevenLabs TTS
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

    class Config:
        case_sensitive = True

settings = Settings()

