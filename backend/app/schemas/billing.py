from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


# ─── Plan Schemas ────────────────────────────────────────────────────────────

class PlanResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: Optional[str] = None
    price_monthly: float
    price_yearly: float
    max_projects: int
    max_agents: int
    max_conversations_per_month: int
    max_knowledge_docs: int
    max_api_integrations: int
    features: Dict[str, Any]
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


# ─── Subscription Schemas ─────────────────────────────────────────────────────

class SubscriptionResponse(BaseModel):
    id: str
    org_id: str
    plan_id: str
    plan: Optional[PlanResponse] = None
    status: str
    billing_cycle: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool
    razorpay_subscription_id: Optional[str] = None

    class Config:
        from_attributes = True


class SubscriptionWithUsage(BaseModel):
    subscription: SubscriptionResponse
    usage: Dict[str, Any]   # current counts vs limits


# ─── Razorpay / Payment Schemas ───────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan_name: str          # free | pro | ultra_pro | enterprise
    billing_cycle: str = "monthly"   # monthly | yearly
    org_id: Optional[str] = None


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int             # in paise (e.g. 99900 = ₹999)
    currency: str
    plan_name: str
    razorpay_key_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_name: str
    billing_cycle: str = "monthly"
    org_id: Optional[str] = None


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    subscription: Optional[SubscriptionResponse] = None


# ─── Payment Transaction Schemas ──────────────────────────────────────────────

class PaymentTransactionResponse(BaseModel):
    id: str
    org_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None
    plan_name: Optional[str] = None
    billing_cycle: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Upgrade / Cancel Schemas ────────────────────────────────────────────────

class UpgradePlanRequest(BaseModel):
    plan_name: str
    billing_cycle: str = "monthly"
    org_id: Optional[str] = None


class CancelSubscriptionRequest(BaseModel):
    cancel_at_period_end: bool = True   # True = cancel at end of period, False = immediate
    org_id: Optional[str] = None


# ─── Admin Setup Schemas ─────────────────────────────────────────────────────

class AdminSetupRequest(BaseModel):
    full_name: str
    email: str
    password: str
    setup_secret: Optional[str] = None   # matches env ADMIN_SETUP_SECRET


class AdminSetupResponse(BaseModel):
    access_token: str
    message: str
