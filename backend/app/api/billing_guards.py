"""
billing_guards.py
─────────────────
FastAPI dependency functions that enforce plan-based resource limits.
Import and inject into any router that creates gated resources.

Usage example:
    @router.post("/orgs/{org_id}/projects")
    def create_project(
        org_id: str,
        req: ProjectCreate,
        db: Session = Depends(get_db),
        ctx: TenantContext = Depends(require_super_admin),
        _: None = Depends(lambda db=Depends(get_db): check_project_limit(org_id, db)),
    ): ...
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.project import Project
from app.models.api_integration import ApiIntegration
from app.models.knowledge_doc import KnowledgeDoc
from app.models.conversation import Conversation
from app.models.organization import Organization


# ─── Internal helper ─────────────────────────────────────────────────────────

def _get_plan_for_org(org_id: str, db: Session):
    """Return (plan, subscription, plan_override) for the org, or raise 403."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    sub = db.query(Subscription).filter(Subscription.org_id == org_id).first()
    if not sub:
        # Org has no subscription — treat as free-tier
        return None, None, org.plan_override

    if sub.status in ("cancelled", "suspended") and not org.plan_override:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "subscription_inactive",
                "message": "Your subscription is inactive. Please renew to continue.",
                "upgrade_url": "/billing",
            },
        )

    return sub.plan, sub, org.plan_override


def _limit_error(resource: str, limit: int, current: int, plan_name: str):
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "error": "plan_limit_reached",
            "resource": resource,
            "limit": limit,
            "current": current,
            "plan": plan_name,
            "message": f"You have reached your {plan_name} plan limit of {limit} {resource}. Upgrade to add more.",
            "upgrade_url": "/billing/upgrade",
        },
    )


# ─── Public guard functions ───────────────────────────────────────────────────

def check_project_limit(org_id: str, db: Session) -> None:
    """Raise 402 if org has reached its plan's max_projects limit."""
    plan, sub, override = _get_plan_for_org(org_id, db)
    if override:
        return  # super_admin bypass

    max_projects = plan.max_projects if plan else 1  # free default = 1
    if max_projects == -1:
        return  # unlimited

    active_count = db.query(Project).filter(
        Project.org_id == org_id,
        Project.status.notin_(["suspended", "deleted"])
    ).count()

    if active_count >= max_projects:
        _limit_error("projects", max_projects, active_count, plan.name if plan else "free")


def check_agent_limit(org_id: str, db: Session) -> None:
    """
    Raise 402 if org has reached its plan's max_agents limit.
    Agents are tracked as project configs (one agent = one project with config).
    """
    plan, sub, override = _get_plan_for_org(org_id, db)
    if override:
        return

    max_agents = plan.max_agents if plan else 1
    if max_agents == -1:
        return

    # Count projects that have an active agent config
    from app.models.project_config import ProjectConfig
    agent_count = (
        db.query(ProjectConfig)
        .join(Project, ProjectConfig.project_id == Project.id)
        .filter(Project.org_id == org_id, Project.status.notin_(["suspended", "deleted"]))
        .count()
    )

    if agent_count >= max_agents:
        _limit_error("agents", max_agents, agent_count, plan.name if plan else "free")


def check_integration_limit(org_id: str, db: Session) -> None:
    """Raise 402 if org has reached its plan's max_api_integrations limit."""
    plan, sub, override = _get_plan_for_org(org_id, db)
    if override:
        return

    max_integrations = plan.max_api_integrations if plan else 1
    if max_integrations == -1:
        return

    count = db.query(ApiIntegration).filter(
        ApiIntegration.org_id == org_id,
        ApiIntegration.is_enabled == True
    ).count()

    if count >= max_integrations:
        _limit_error("api_integrations", max_integrations, count, plan.name if plan else "free")


def check_knowledge_doc_limit(org_id: str, db: Session) -> None:
    """Raise 402 if org has reached its plan's max_knowledge_docs limit."""
    plan, sub, override = _get_plan_for_org(org_id, db)
    if override:
        return

    max_docs = plan.max_knowledge_docs if plan else 5
    if max_docs == -1:
        return

    count = db.query(KnowledgeDoc).filter(
        KnowledgeDoc.org_id == org_id,
        KnowledgeDoc.status == "indexed"
    ).count()

    if count >= max_docs:
        _limit_error("knowledge_docs", max_docs, count, plan.name if plan else "free")


def check_conversation_quota(org_id: str, db: Session) -> None:
    """
    Raise 402 if org has exceeded the monthly conversation quota.
    Counts conversations started in current calendar month.
    """
    from datetime import datetime
    plan, sub, override = _get_plan_for_org(org_id, db)
    if override:
        return

    max_conv = plan.max_conversations_per_month if plan else 500
    if max_conv == -1:
        return

    # Count this month's conversations
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count = db.query(Conversation).filter(
        Conversation.org_id == org_id,
        Conversation.created_at >= month_start
    ).count()

    if count >= max_conv:
        _limit_error("conversations", max_conv, count, plan.name if plan else "free")


# ─── Usage summary helper (used by billing endpoint) ─────────────────────────

def get_org_usage(org_id: str, db: Session) -> dict:
    """Return current resource usage counts for an org."""
    from datetime import datetime
    from app.models.project_config import ProjectConfig

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    projects = db.query(Project).filter(
        Project.org_id == org_id,
        Project.status.notin_(["suspended", "deleted"])
    ).count()

    agents = (
        db.query(ProjectConfig)
        .join(Project, ProjectConfig.project_id == Project.id)
        .filter(Project.org_id == org_id, Project.status.notin_(["suspended", "deleted"]))
        .count()
    )

    integrations = db.query(ApiIntegration).filter(
        ApiIntegration.org_id == org_id,
        ApiIntegration.is_enabled == True
    ).count()

    knowledge_docs = db.query(KnowledgeDoc).filter(
        KnowledgeDoc.org_id == org_id,
        KnowledgeDoc.status == "indexed"
    ).count()

    conversations_this_month = db.query(Conversation).filter(
        Conversation.org_id == org_id,
        Conversation.created_at >= month_start
    ).count()

    return {
        "projects": projects,
        "agents": agents,
        "api_integrations": integrations,
        "knowledge_docs": knowledge_docs,
        "conversations_this_month": conversations_this_month,
    }
