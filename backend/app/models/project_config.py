import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProjectConfig(Base):
    __tablename__ = "project_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    system_prompt = Column(Text, nullable=False)
    guardrails = Column(JSON, default=dict, nullable=False) # blocked_topics, disclaimers, pii_masking, escalation_rules
    agent_settings = Column(JSON, default=dict, nullable=False) # llm_model, temperature, max_tokens
    voice_settings = Column(JSON, default=dict, nullable=False) # tts_vendor, voice_id, speed, stability
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="config")
