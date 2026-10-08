import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class ApiIntegration(Base):
    __tablename__ = "api_integrations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    base_url = Column(String(512), nullable=False)
    auth_type = Column(String(50), default="none", nullable=False) # none, bearer, api_key, basic
    encrypted_secret = Column(Text, nullable=True) # Fernet encrypted key/token
    endpoints = Column(JSON, default=list, nullable=False) # list of endpoint definitions
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="api_integrations")
    project = relationship("Project", back_populates="api_integrations")
