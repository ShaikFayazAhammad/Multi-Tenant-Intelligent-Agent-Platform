import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models import Organization, User, Project, ProjectConfig, Plan, Subscription
from app.api.router_auth import router as auth_router
from app.api.router_admin import router as admin_router
from app.api.router_client import router as client_router
from app.api.router_websocket import router as ws_router
from app.api.router_analytics import router as analytics_router
from app.api.router_mock_apis import router as mock_apis_router
from app.api.router_hubspot import router as hubspot_router
from app.api.router_billing import router as billing_router, admin_setup_router

# Ensure tables exist on startup
Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    try:
        # 1. Seed Organization if missing
        org = db.query(Organization).filter(Organization.id == '11111111-1111-1111-1111-111111111111').first()
        if not org:
            org = Organization(
                id='11111111-1111-1111-1111-111111111111',
                name='Primary Financial Services Org',
                slug='primary-financial-org',
                status='active'
            )
            db.add(org)
            db.commit()

        # 2. Seed Super Admin User (admin@bfsi.com / admin123)
        admin = db.query(User).filter(User.email == 'admin@bfsi.com').first()
        if not admin:
            admin = User(
                id='33333333-3333-3333-3333-333333333333',
                org_id=None,
                email='admin@bfsi.com',
                password_hash=hash_password('admin123'),
                full_name='Platform Super Admin',
                role='super_admin',
                is_active=True
            )
            db.add(admin)

        # 3. Seed Lead User (lead@bfsi.com / lead123)
        lead = db.query(User).filter(User.email == 'lead@bfsi.com').first()
        if not lead:
            lead = User(
                id='44444444-4444-4444-4444-444444444444',
                org_id=org.id,
                email='lead@bfsi.com',
                password_hash=hash_password('lead123'),
                full_name='Lead Financial Advisor',
                role='lead',
                is_active=True
            )
            db.add(lead)

        # 4. Seed Supervisor User (supervisor@bfsi.com / supervisor123)
        supervisor = db.query(User).filter(User.email == 'supervisor@bfsi.com').first()
        if not supervisor:
            supervisor = User(
                id='66666666-6666-6666-6666-666666666666',
                org_id=org.id,
                email='supervisor@bfsi.com',
                password_hash=hash_password('supervisor123'),
                full_name='BFSI Operations Supervisor',
                role='supervisor',
                is_active=True
            )
            db.add(supervisor)

        # 5. Seed Project #1
        project = db.query(Project).filter(Project.id == '22222222-2222-2222-2222-222222222222').first()
        if not project:
            project = Project(
                id='22222222-2222-2222-2222-222222222222',
                org_id=org.id,
                name='Banking Operations Assistant',
                domain='banking',
                status='active'
            )
            db.add(project)
            db.commit()

            # Seed Config
            config = ProjectConfig(
                id='55555555-5555-5555-5555-555555555555',
                project_id=project.id,
                system_prompt="You are a professional BFSI Intelligent Assistant for Banking Operations.",
                guardrails={"blocked_topics": ["crypto gambling"], "required_disclaimers": ["Not financial advice"], "pii_masking": True},
                agent_settings={"llm_model": "gpt-4o-mini", "temperature": 0.2},
                voice_settings={"tts_vendor": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM"}
            )
            db.add(config)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Seed warning: {e}")
    finally:
        db.close()


def seed_plans():
    """Seed the 4 billing plan tiers on startup (idempotent)."""
    db = SessionLocal()
    try:
        PLANS = [
            dict(
                id="plan-free-0001", name="free", display_name="Free",
                description="Get started — 1 project, 1 agent.",
                price_monthly=0, price_yearly=0,
                max_projects=1, max_agents=1,
                max_conversations_per_month=500, max_knowledge_docs=5,
                max_api_integrations=1, sort_order=0,
                features={"analytics": "basic", "support": "community"},
            ),
            dict(
                id="plan-pro-0002", name="pro", display_name="Pro",
                description="Scale up — 5 projects, 5 agents.",
                price_monthly=999, price_yearly=9990,
                max_projects=5, max_agents=5,
                max_conversations_per_month=10000, max_knowledge_docs=50,
                max_api_integrations=10, sort_order=1,
                features={"analytics": "advanced", "support": "email"},
            ),
            dict(
                id="plan-ultra-0003", name="ultra_pro", display_name="Ultra Pro",
                description="Power users — 10 projects, 10 agents.",
                price_monthly=2999, price_yearly=29990,
                max_projects=10, max_agents=10,
                max_conversations_per_month=50000, max_knowledge_docs=200,
                max_api_integrations=25, sort_order=2,
                features={"analytics": "full", "support": "priority"},
            ),
            dict(
                id="plan-ent-0004", name="enterprise", display_name="Enterprise",
                description="Unlimited everything. Contact us.",
                price_monthly=0, price_yearly=0,
                max_projects=-1, max_agents=-1,
                max_conversations_per_month=-1, max_knowledge_docs=-1,
                max_api_integrations=-1, sort_order=3,
                features={"analytics": "custom", "support": "dedicated"},
            ),
        ]
        for p in PLANS:
            existing = db.query(Plan).filter(Plan.id == p["id"]).first()
            if not existing:
                db.add(Plan(**p))
        db.commit()
        print("[SEED] Billing plans seeded.")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Plan seed warning: {e}")
    finally:
        db.close()


def assign_free_subscription_to_seeded_org():
    """Ensure the seeded primary org has a free subscription (idempotent)."""
    db = SessionLocal()
    try:
        from datetime import datetime
        org_id = '11111111-1111-1111-1111-111111111111'
        existing_sub = db.query(Subscription).filter(Subscription.org_id == org_id).first()
        if not existing_sub:
            free_plan = db.query(Plan).filter(Plan.name == "free").first()
            if free_plan:
                db.add(Subscription(
                    org_id=org_id,
                    plan_id=free_plan.id,
                    status="active",
                    billing_cycle="monthly",
                    current_period_start=datetime.utcnow(),
                ))
                db.commit()
                print("[SEED] Free subscription assigned to primary org.")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Subscription seed warning: {e}")
    finally:
        db.close()


seed_db()
seed_plans()
assign_free_subscription_to_seeded_org()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Multi-Tenant SaaS Backend for BFSI (Banking, Finance, Insurance)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(client_router)
app.include_router(analytics_router)
app.include_router(ws_router)
app.include_router(mock_apis_router)   # /api/mock/* — BFSI Demo Mock APIs
app.include_router(hubspot_router)     # /api/admin/hubspot/* — HubSpot CRM Integration
app.include_router(billing_router)     # /api/billing/* — Billing & Subscriptions
app.include_router(admin_setup_router) # /api/admin/setup — One-time super admin creation

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
