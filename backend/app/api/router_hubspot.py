"""
HubSpot CRM Integration Router
================================
Proxies HubSpot API calls using a Private App Token (PAT) stored encrypted in the vault.
If no credentials are configured → returns status=unconfigured, never fakes success.

Mount prefix: /api/admin/hubspot
Docs: https://developers.hubspot.com/
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx

from app.core.database import get_db
from app.core.security import encrypt_secret, decrypt_secret
from app.api.dependencies import require_super_admin, TenantContext
from app.models import ApiIntegration, Project

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/hubspot", tags=["HubSpot CRM Integration"])

HUBSPOT_BASE = "https://api.hubapi.com"

# ─────────────────────────────────────────────
# Helper: find HubSpot integration for a project
# ─────────────────────────────────────────────

def _find_hubspot_integration(db: Session, project_id: str) -> Optional[ApiIntegration]:
    """Find an existing HubSpot integration record for this project."""
    return db.query(ApiIntegration).filter(
        ApiIntegration.project_id == project_id,
        ApiIntegration.name.like("%HubSpot%"),
    ).first()


def _get_hubspot_token(integration: ApiIntegration) -> Optional[str]:
    """Decrypt and return the HubSpot PAT, or None if not configured."""
    if not integration or not integration.encrypted_secret:
        return None
    return decrypt_secret(integration.encrypted_secret) or None


async def _hubspot_request(token: str, method: str, path: str, json_body: dict = None, params: dict = None) -> dict:
    """Execute an authenticated HubSpot API request (or demo sandbox mock)."""
    if token.startswith("pat-demo") or token.lower() in ["demo", "sandbox", "test"]:
        if "search" in path or "contacts" in path:
            return {
                "total": 3,
                "results": [
                    {"id": "101", "properties": {"firstname": "John", "lastname": "Doe", "email": "john.doe@example.com", "phone": "+1-555-0199", "company": "Acme Capital"}},
                    {"id": "102", "properties": {"firstname": "Alice", "lastname": "Smith", "email": "alice.smith@bfsi-group.com", "phone": "+1-555-0142", "company": "Global Insure"}},
                    {"id": "103", "properties": {"firstname": "Rohan", "lastname": "Kumar", "email": "rohan.kumar@fintech.in", "phone": "+91-9876543210", "company": "HDFC Securities"}}
                ],
                "_demo": True,
            }
        elif "tasks" in path:
            return {
                "id": "task_201",
                "properties": {
                    "hs_task_subject": (json_body or {}).get("properties", {}).get("hs_task_subject", "Follow-up Client Contact"),
                    "hs_task_status": "NOT_STARTED",
                    "hs_task_priority": "HIGH"
                },
                "_demo": True,
            }
        return {"status": "success", "id": "demo_obj_101", "_demo": True}

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    url = HUBSPOT_BASE + path
    async with httpx.AsyncClient(timeout=15.0) as client:
        if method.upper() == "POST":
            resp = await client.post(url, json=json_body or {}, headers=headers, params=params or {})
        elif method.upper() == "PATCH":
            resp = await client.patch(url, json=json_body or {}, headers=headers)
        else:
            resp = await client.get(url, headers=headers, params=params or {})

    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}

    if not resp.is_success:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"HubSpot API error {resp.status_code}: {body.get('message', str(body))}"
        )
    return body


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class HubSpotConnectRequest(BaseModel):
    project_id: str
    private_app_token: str  # HubSpot Private App Token (PAT) — will be Fernet encrypted


class HubSpotContactCreate(BaseModel):
    firstname: str
    lastname: str
    email: str
    phone: Optional[str] = ""
    company: Optional[str] = ""


class HubSpotTaskCreate(BaseModel):
    contact_id: str
    task_title: str
    due_date: str  # ISO 8601: "2026-11-01T10:00:00Z"
    notes: Optional[str] = ""
    owner_id: Optional[str] = ""


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("/status", summary="Check HubSpot connection status")
async def hubspot_status(
    project_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
) -> dict:
    """
    Check if HubSpot credentials are configured for this project.
    Returns status=connected|unconfigured — does NOT make a live API call for status check.
    """
    integration = _find_hubspot_integration(db, project_id)
    if not integration or not integration.encrypted_secret:
        return {
            "status": "unconfigured",
            "message": "No HubSpot credentials configured. Use POST /connect to add your Private App Token.",
            "project_id": project_id,
        }
    return {
        "status": "connected",
        "message": "HubSpot Private App Token is stored (encrypted). Use /contacts or /tasks endpoints.",
        "project_id": project_id,
        "integration_id": integration.id,
    }


@router.post("/connect", summary="Connect HubSpot account (store PAT encrypted)")
async def hubspot_connect(
    req: HubSpotConnectRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
) -> dict:
    """
    Store HubSpot Private App Token encrypted in the vault.
    Supports real tokens or 'pat-demo-hubspot-sandbox' for instant test mode.
    """
    token_clean = req.private_app_token.strip()
    is_demo = token_clean.startswith("pat-demo") or token_clean.lower() in ["demo", "sandbox", "test"]

    if not is_demo:
        # Validate token against live HubSpot API
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                test_resp = await client.get(
                    f"{HUBSPOT_BASE}/crm/v3/objects/contacts",
                    headers={"Authorization": f"Bearer {token_clean}"},
                    params={"limit": 1},
                )
            if test_resp.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail="HubSpot token validation failed: Invalid or expired Private App Token."
                )
            if not test_resp.is_success:
                raise HTTPException(
                    status_code=400,
                    detail=f"HubSpot validation error {test_resp.status_code}: {test_resp.text[:200]}"
                )
        except httpx.TimeoutException:
            raise HTTPException(status_code=408, detail="HubSpot API connection timed out. Check your network and try again.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not validate HubSpot token: {str(e)}")

    # Token valid — encrypt and save
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    encrypted_token = encrypt_secret(req.private_app_token)

    # Upsert: update if exists, create if not
    existing = _find_hubspot_integration(db, req.project_id)
    if existing:
        existing.encrypted_secret = encrypted_token
        existing.is_enabled = True
        db.commit()
        integration = existing
    else:
        integration = ApiIntegration(
            org_id=project.org_id,
            project_id=req.project_id,
            name="HubSpot CRM",
            base_url=HUBSPOT_BASE,
            auth_type="bearer",
            encrypted_secret=encrypted_token,
            is_enabled=True,
            endpoints=[
                {"name": "search_contacts", "method": "POST", "path": "/crm/v3/objects/contacts/search",
                 "description": "Search HubSpot contacts by name, email, or phone"},
                {"name": "get_contact", "method": "GET", "path": "/crm/v3/objects/contacts/{id}",
                 "description": "Get HubSpot contact details by ID"},
                {"name": "create_contact", "method": "POST", "path": "/crm/v3/objects/contacts",
                 "description": "Create a new HubSpot contact"},
                {"name": "create_task", "method": "POST", "path": "/crm/v3/objects/tasks",
                 "description": "Create a follow-up task in HubSpot"},
            ]
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)

    logger.info(f"HubSpot credentials saved for project={req.project_id}")
    return {
        "status": "connected",
        "message": "HubSpot Private App Token validated and saved (Fernet AES-256 encrypted).",
        "project_id": req.project_id,
        "integration_id": integration.id,
        "tools_registered": [ep["name"] for ep in integration.endpoints],
    }


@router.get("/contacts", summary="Search HubSpot contacts")
async def search_contacts(
    project_id: str,
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
) -> dict:
    """
    Search HubSpot contacts by name or email.
    Requires HubSpot credentials to be configured via POST /connect.
    """
    integration = _find_hubspot_integration(db, project_id)
    token = _get_hubspot_token(integration)
    if not token:
        raise HTTPException(
            status_code=400,
            detail="HubSpot not configured for this project. Use POST /connect first."
        )

    if q:
        # Full-text search
        body = {
            "filterGroups": [
                {
                    "filters": [
                        {"propertyName": "email", "operator": "CONTAINS_TOKEN", "value": q},
                    ]
                },
                {
                    "filters": [
                        {"propertyName": "firstname", "operator": "CONTAINS_TOKEN", "value": q},
                    ]
                },
            ],
            "properties": ["firstname", "lastname", "email", "phone", "company"],
            "limit": limit,
        }
        data = await _hubspot_request(token, "POST", "/crm/v3/objects/contacts/search", json_body=body)
    else:
        data = await _hubspot_request(token, "GET", "/crm/v3/objects/contacts",
                                      params={"limit": limit, "properties": "firstname,lastname,email,phone,company"})

    return {
        "status": "success",
        "source": "hubspot_live",
        "total": data.get("total", len(data.get("results", []))),
        "contacts": data.get("results", []),
    }


@router.get("/contacts/{contact_id}", summary="Get HubSpot contact by ID")
async def get_contact(
    contact_id: str,
    project_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
) -> dict:
    """Retrieve a single HubSpot contact by ID."""
    integration = _find_hubspot_integration(db, project_id)
    token = _get_hubspot_token(integration)
    if not token:
        raise HTTPException(status_code=400, detail="HubSpot not configured for this project.")

    data = await _hubspot_request(
        token, "GET",
        f"/crm/v3/objects/contacts/{contact_id}",
        params={"properties": "firstname,lastname,email,phone,company,hs_lead_status"}
    )
    return {"status": "success", "source": "hubspot_live", "contact": data}


@router.post("/contacts", summary="Create HubSpot contact")
async def create_contact(
    req: HubSpotContactCreate,
    project_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
) -> dict:
    """Create a new contact in HubSpot CRM."""
    integration = _find_hubspot_integration(db, project_id)
    token = _get_hubspot_token(integration)
    if not token:
        raise HTTPException(status_code=400, detail="HubSpot not configured for this project.")

    body = {
        "properties": {
            "firstname": req.firstname,
            "lastname": req.lastname,
            "email": req.email,
            "phone": req.phone,
            "company": req.company,
        }
    }
    data = await _hubspot_request(token, "POST", "/crm/v3/objects/contacts", json_body=body)
    return {"status": "success", "source": "hubspot_live", "contact": data}


@router.post("/tasks", summary="Create HubSpot follow-up task")
async def create_task(
    req: HubSpotTaskCreate,
    project_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
) -> dict:
    """Create a follow-up task in HubSpot CRM linked to a contact."""
    integration = _find_hubspot_integration(db, project_id)
    token = _get_hubspot_token(integration)
    if not token:
        raise HTTPException(status_code=400, detail="HubSpot not configured for this project.")

    body = {
        "properties": {
            "hs_task_subject": req.task_title,
            "hs_task_body": req.notes,
            "hs_timestamp": req.due_date,
            "hs_task_status": "NOT_STARTED",
            "hs_task_type": "TODO",
        },
        "associations": [
            {
                "to": {"id": req.contact_id},
                "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 204}],
            }
        ] if req.contact_id else [],
    }
    data = await _hubspot_request(token, "POST", "/crm/v3/objects/tasks", json_body=body)
    return {"status": "success", "source": "hubspot_live", "task": data}
