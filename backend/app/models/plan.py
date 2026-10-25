import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, JSON
from app.core.database import Base


class Plan(Base):
    """Master billing plan catalog — Free / Pro / Ultra Pro / Enterprise."""
    __tablename__ = "plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), unique=True, nullable=False, index=True)   # free | pro | ultra_pro | enterprise
    display_name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    price_monthly = Column(Numeric(10, 2), default=0.00, nullable=False)  # INR
    price_yearly = Column(Numeric(10, 2), default=0.00, nullable=False)   # INR (discounted)
    razorpay_plan_id = Column(String(100), nullable=True)                 # set after Razorpay plan creation

    # Resource limits — use -1 for unlimited (enterprise / override)
    max_projects = Column(Integer, default=1, nullable=False)
    max_agents = Column(Integer, default=1, nullable=False)
    max_conversations_per_month = Column(Integer, default=500, nullable=False)
    max_knowledge_docs = Column(Integer, default=5, nullable=False)
    max_api_integrations = Column(Integer, default=1, nullable=False)

    # Extra feature flags stored as JSON (e.g. {"analytics": "basic", "support": "community"})
    features = Column(JSON, default=dict, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)   # display order on pricing page

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
