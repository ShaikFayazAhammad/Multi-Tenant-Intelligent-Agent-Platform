import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Subscription(Base):
    """One active subscription per organization — tracks current plan & Razorpay state."""
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("plans.id"), nullable=False, index=True)

    # Status: active | trialing | past_due | cancelled | suspended
    status = Column(String(50), default="active", nullable=False)

    billing_cycle = Column(String(20), default="monthly", nullable=False)  # monthly | yearly

    current_period_start = Column(DateTime, nullable=False, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=True)                   # None = free/no expiry

    cancel_at_period_end = Column(Boolean, default=False, nullable=False)

    # Razorpay identifiers (populated after payment)
    razorpay_subscription_id = Column(String(100), nullable=True)
    razorpay_customer_id = Column(String(100), nullable=True)

    trial_end = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="subscription")
    plan = relationship("Plan")
    transactions = relationship("PaymentTransaction", back_populates="subscription", cascade="all, delete-orphan")
