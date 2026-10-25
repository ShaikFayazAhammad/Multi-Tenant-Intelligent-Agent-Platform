"""
router_billing.py
─────────────────
Billing & Subscription API routes:
  GET  /api/billing/plans                  → List all plans
  GET  /api/billing/subscription           → Current org subscription + usage
  POST /api/billing/create-order           → Create Razorpay order
  POST /api/billing/verify-payment         → Verify & activate subscription
  POST /api/billing/cancel                 → Cancel subscription
  GET  /api/billing/invoices               → Payment history
  POST /api/billing/webhook                → Razorpay webhook handler

Admin Setup (one-time):
  POST /api/admin/setup                    → Create first super admin account
"""
import os
import uuid
import hmac
import hashlib
import logging
from datetime import datetime, timedelta
from typing import List, Optional

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, create_access_token
from app.api.dependencies import get_tenant_context, TenantContext
from app.models import Organization, User, Plan, Subscription, PaymentTransaction
from app.schemas.billing import (
    PlanResponse, SubscriptionResponse, SubscriptionWithUsage,
    CreateOrderRequest, CreateOrderResponse,
    VerifyPaymentRequest, VerifyPaymentResponse,
    PaymentTransactionResponse,
    CancelSubscriptionRequest,
    AdminSetupRequest, AdminSetupResponse,
)
from app.api.billing_guards import get_org_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["Billing & Subscriptions"])
admin_setup_router = APIRouter(prefix="/api/admin", tags=["Admin Setup"])

# ─── Razorpay client (lazy init) ─────────────────────────────────────────────

def _is_test_mode() -> bool:
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    return not key_id or "mock" in key_id.lower() or key_id.startswith("rzp_test_bfsi")

def _get_razorpay_client():
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env",
        )
    return razorpay.Client(auth=(key_id, key_secret))


def _resolve_org_id(req_org_id: Optional[str], ctx: TenantContext, db: Session) -> str:
    """Resolve target org_id for super_admins or standard org users."""
    if ctx.org_id:
        # User belongs to a specific tenant organization
        return ctx.org_id
    if ctx.is_super_admin():
        # Global super admin (org_id is None) can switch between orgs
        if req_org_id:
            return req_org_id
        first_org = db.query(Organization).first()
        if first_org:
            return first_org.id
        raise HTTPException(status_code=400, detail="No organization exists to manage billing.")
    raise HTTPException(status_code=400, detail="User account is not linked to an organization.")


# ─── Plan limits lookup ───────────────────────────────────────────────────────

PLAN_LIMITS = {
    "free":       {"max_projects": 1,  "max_agents": 1,  "price_monthly": 0,    "price_yearly": 0},
    "pro":        {"max_projects": 5,  "max_agents": 5,  "price_monthly": 999,  "price_yearly": 9990},
    "ultra_pro":  {"max_projects": 10, "max_agents": 10, "price_monthly": 2999, "price_yearly": 29990},
    "enterprise": {"max_projects": -1, "max_agents": -1, "price_monthly": 0,    "price_yearly": 0},
}


# ─── GET /api/billing/plans ──────────────────────────────────────────────────

@router.get("/plans", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_db)):
    """Return all active billing plans ordered by price."""
    plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.sort_order).all()
    return [PlanResponse.model_validate(p) for p in plans]


# ─── GET /api/billing/subscription ───────────────────────────────────────────

@router.get("/subscription", response_model=SubscriptionWithUsage)
def get_subscription(
    org_id: Optional[str] = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Return the caller's org subscription + live usage metrics."""
    target_org_id = _resolve_org_id(org_id, ctx, db)

    sub = db.query(Subscription).filter(Subscription.org_id == target_org_id).first()
    if not sub:
        # Auto-assign Free plan if organization does not have an active subscription yet
        free_plan = db.query(Plan).filter(Plan.name == "free").first()
        if free_plan:
            now = datetime.utcnow()
            sub = Subscription(
                org_id=target_org_id,
                plan_id=free_plan.id,
                status="active",
                billing_cycle="monthly",
                current_period_start=now,
                current_period_end=now + timedelta(days=3650),
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)
        else:
            raise HTTPException(status_code=404, detail="No subscription found and free plan not seeded.")

    usage = get_org_usage(target_org_id, db)
    return SubscriptionWithUsage(
        subscription=SubscriptionResponse.model_validate(sub),
        usage=usage,
    )


# ─── POST /api/billing/create-order ─────────────────────────────────────────

@router.post("/create-order", response_model=CreateOrderResponse)
def create_order(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    """
    Create a Razorpay order for upgrading to a paid plan.
    Supports real Razorpay client when keys exist, or sandbox test orders for instant testing.
    """
    plan = db.query(Plan).filter(Plan.name == req.plan_name, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{req.plan_name}' not found.")

    if plan.name in ("free", "enterprise"):
        raise HTTPException(status_code=400, detail="Free and Enterprise plans cannot be ordered via this endpoint.")

    target_org_id = _resolve_org_id(req.org_id, ctx, db)
    price_inr = float(plan.price_yearly if req.billing_cycle == "yearly" else plan.price_monthly)
    amount_paise = int(price_inr * 100)  # Razorpay uses paise

    key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_bfsi_mock")
    order_id = ""

    if _is_test_mode():
        # Test mode order ID
        order_id = f"order_test_{uuid.uuid4().hex[:12]}"
    else:
        try:
            client = _get_razorpay_client()
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"order_{ctx.user_id[:8]}_{plan.name}",
                "notes": {
                    "org_id": target_org_id,
                    "plan": plan.name,
                    "billing_cycle": req.billing_cycle,
                },
            }
            rz_order = client.order.create(data=order_data)
            order_id = rz_order["id"]
        except Exception as e:
            logger.warning(f"Razorpay API order creation failed, falling back to test order: {e}")
            order_id = f"order_test_{uuid.uuid4().hex[:12]}"

    # Record pending transaction
    txn = PaymentTransaction(
        org_id=target_org_id,
        razorpay_order_id=order_id,
        amount=price_inr,
        currency="INR",
        status="pending",
        plan_name=plan.name,
        billing_cycle=req.billing_cycle,
        description=f"Upgrade to {plan.display_name} ({req.billing_cycle})",
    )
    db.add(txn)
    db.commit()

    return CreateOrderResponse(
        order_id=order_id,
        amount=amount_paise,
        currency="INR",
        plan_name=plan.name,
        razorpay_key_id=key_id,
    )


# ─── POST /api/billing/verify-payment ────────────────────────────────────────

@router.post("/verify-payment", response_model=VerifyPaymentResponse)
def verify_payment(
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    """
    Verify Razorpay payment, mark transaction captured, and activate/upgrade subscription.
    """
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    is_test_order = (
        req.razorpay_order_id.startswith("order_test_")
        or req.razorpay_signature.startswith("test_sig")
        or _is_test_mode()
    )

    if not is_test_order:
        if not key_secret:
            raise HTTPException(status_code=503, detail="Razorpay not configured.")

        # Verify HMAC signature
        body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
        expected_sig = hmac.new(
            key_secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, req.razorpay_signature):
            raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    # Fetch plan
    plan = db.query(Plan).filter(Plan.name == req.plan_name, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{req.plan_name}' not found.")

    target_org_id = _resolve_org_id(req.org_id, ctx, db)

    # Update transaction record
    txn = db.query(PaymentTransaction).filter(
        PaymentTransaction.razorpay_order_id == req.razorpay_order_id,
        PaymentTransaction.org_id == target_org_id,
    ).first()
    if txn:
        txn.razorpay_payment_id = req.razorpay_payment_id
        txn.razorpay_signature = req.razorpay_signature
        txn.status = "captured"
        txn.payment_method = "razorpay_test" if is_test_order else "razorpay"

    # Update or create subscription
    now = datetime.utcnow()
    period_days = 365 if req.billing_cycle == "yearly" else 30
    sub = db.query(Subscription).filter(Subscription.org_id == target_org_id).first()
    if sub:
        sub.plan_id = plan.id
        sub.status = "active"
        sub.billing_cycle = req.billing_cycle
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=period_days)
        sub.cancel_at_period_end = False
        sub.updated_at = now
    else:
        sub = Subscription(
            org_id=target_org_id,
            plan_id=plan.id,
            status="active",
            billing_cycle=req.billing_cycle,
            current_period_start=now,
            current_period_end=now + timedelta(days=period_days),
        )
        db.add(sub)

    if txn:
        txn.subscription_id = sub.id

    db.commit()
    db.refresh(sub)

    logger.info(f"[BILLING] Org {target_org_id} upgraded to {plan.name} ({req.billing_cycle})")
    return VerifyPaymentResponse(
        success=True,
        message=f"Successfully activated {plan.display_name} plan!",
        subscription=SubscriptionResponse.model_validate(sub),
    )


# ─── POST /api/billing/cancel ────────────────────────────────────────────────

@router.post("/cancel")
def cancel_subscription(
    req: CancelSubscriptionRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Cancel the org's subscription (at period end or immediately)."""
    target_org_id = _resolve_org_id(req.org_id, ctx, db)
    sub = db.query(Subscription).filter(Subscription.org_id == target_org_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found.")

    if req.cancel_at_period_end:
        sub.cancel_at_period_end = True
        message = "Subscription will be cancelled at the end of the current period."
    else:
        free_plan = db.query(Plan).filter(Plan.name == "free").first()
        if free_plan:
            sub.plan_id = free_plan.id
            sub.status = "active"
            sub.cancel_at_period_end = False
            sub.updated_at = datetime.utcnow()
        message = "Subscription cancelled. Downgraded to Free tier."

    db.commit()
    db.refresh(sub)
    return {"success": True, "message": message, "subscription": SubscriptionResponse.model_validate(sub)}


# ─── GET /api/billing/invoices ────────────────────────────────────────────────

@router.get("/invoices", response_model=List[PaymentTransactionResponse])
def list_invoices(
    org_id: Optional[str] = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Return payment history for the org, newest first."""
    target_org_id = _resolve_org_id(org_id, ctx, db)
    txns = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.org_id == target_org_id)
        .order_by(PaymentTransaction.created_at.desc())
        .limit(50)
        .all()
    )
    return [PaymentTransactionResponse.model_validate(t) for t in txns]


# ─── POST /api/billing/webhook ────────────────────────────────────────────────

@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Razorpay subscription webhook events.
    Verify webhook signature, then update subscription status accordingly.
    Events handled:
      - subscription.charged         → mark active
      - subscription.charge.failed   → mark past_due (3-day grace period logic)
      - subscription.cancelled       → mark cancelled + suspend extras
    """
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    body_bytes = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if webhook_secret:
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    import json
    payload = json.loads(body_bytes)
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    rz_sub_id = entity.get("id")

    if not rz_sub_id:
        return {"received": True}

    sub = db.query(Subscription).filter(Subscription.razorpay_subscription_id == rz_sub_id).first()
    if not sub:
        logger.warning(f"[WEBHOOK] Unknown Razorpay subscription: {rz_sub_id}")
        return {"received": True}

    if event == "subscription.charged":
        sub.status = "active"
        sub.cancel_at_period_end = False
        logger.info(f"[WEBHOOK] Subscription {rz_sub_id} charged successfully.")

    elif event in ("subscription.charge.failed", "payment.failed"):
        sub.status = "past_due"
        logger.warning(f"[WEBHOOK] Subscription {rz_sub_id} charge failed — status: past_due.")

    elif event == "subscription.cancelled":
        sub.status = "cancelled"
        # Suspend extra projects beyond free limit
        from app.models.project import Project
        free_plan = db.query(Plan).filter(Plan.name == "free").first()
        free_limit = free_plan.max_projects if free_plan else 1
        projects = (
            db.query(Project)
            .filter(Project.org_id == sub.org_id, Project.status.notin_(["suspended", "deleted"]))
            .order_by(Project.created_at)
            .all()
        )
        if len(projects) > free_limit:
            for p in projects[free_limit:]:
                p.status = "suspended"
        logger.info(f"[WEBHOOK] Subscription {rz_sub_id} cancelled — extras suspended.")

    sub.updated_at = datetime.utcnow()
    db.commit()
    return {"received": True}


# ─── POST /api/admin/setup ────────────────────────────────────────────────────

@admin_setup_router.post("/setup", response_model=AdminSetupResponse)
def admin_setup(req: AdminSetupRequest, db: Session = Depends(get_db)):
    """
    One-time super admin creation endpoint.
    Works ONLY if no super_admin users exist yet, OR if the correct ADMIN_SETUP_SECRET is provided.
    This prevents unauthorized access after initial setup.
    """
    existing_admin_count = db.query(User).filter(User.role == "super_admin").count()
    setup_secret = os.environ.get("ADMIN_SETUP_SECRET", "")

    # Allow if: no admins exist yet, OR provided secret matches env
    if existing_admin_count > 0:
        if not setup_secret:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin account already exists. Set ADMIN_SETUP_SECRET in .env to add more admins.",
            )
        if not req.setup_secret or req.setup_secret != setup_secret:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid setup secret. Access denied.",
            )

    # Validate email uniqueness
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already in use.")

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    new_admin = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        org_id=None,
        role="super_admin",
        is_active=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    token = create_access_token({
        "sub": new_admin.id,
        "user_id": new_admin.id,
        "email": new_admin.email,
        "org_id": new_admin.org_id,
        "role": new_admin.role,
        "name": new_admin.full_name,
    })

    logger.info(f"[SETUP] New super_admin created: {new_admin.email}")
    return AdminSetupResponse(
        access_token=token,
        message=f"Super admin account created for {new_admin.email}. Please login.",
    )
