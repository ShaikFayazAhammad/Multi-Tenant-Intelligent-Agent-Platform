import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class PaymentTransaction(Base):
    """Immutable record of every Razorpay payment attempt for an organization."""
    __tablename__ = "payment_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(String(36), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)

    # Razorpay identifiers
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    razorpay_signature = Column(String(512), nullable=True)

    # Payment details
    amount = Column(Numeric(10, 2), nullable=False)       # INR (in rupees, not paise)
    currency = Column(String(10), default="INR", nullable=False)
    # Status: pending | captured | failed | refunded
    status = Column(String(50), default="pending", nullable=False, index=True)
    payment_method = Column(String(50), nullable=True)    # card | upi | netbanking | wallet

    plan_name = Column(String(50), nullable=True)         # snapshot of plan at time of payment
    billing_cycle = Column(String(20), nullable=True)     # monthly | yearly

    description = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    extra_data = Column(JSON, default=dict, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="transactions")
    subscription = relationship("Subscription", back_populates="transactions")
