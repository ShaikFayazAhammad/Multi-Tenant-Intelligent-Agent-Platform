import os
import re
import time
import uuid
import json
import logging
import httpx
from urllib.parse import urlparse, parse_qs, urlencode
from typing import List, Optional

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, encrypt_secret, decrypt_secret
from app.api.dependencies import require_super_admin, TenantContext
from app.models import Organization, User, Project, ProjectConfig, ApiIntegration, KnowledgeDoc
from app.schemas.admin import (
    OrgCreate, OrgUpdate, OrgResponse,
    AdminUserCreate, AdminUserUpdate,
    ProjectCreate, ProjectStatusUpdate, ProjectResponse, DomainTemplate,
    ProjectConfigUpdate, ProjectConfigResponse,
    ApiIntegrationCreate, ApiIntegrationUpdate, ApiIntegrationResponse,
    TestApiCallRequest, TestApiCallResponse,
    KnowledgeDocResponse, CrawlUrlRequest,
    PlaygroundTestRequest, PlaygroundTestResponse,
    CurlParseRequest, CurlParseResponse, ParsedHeader,
    ToolAssignmentsRequest, ToolAssignmentsResponse,
    MockInstallResponse, HubSpotInstallResponse,
)
from app.schemas.auth import UserResponse
from app.orchestrator.rag_service import PerProjectRAGService
from app.services.crawler_service import WebCrawlerService
from app.services.document_parser import DocumentParser, DocumentParseError
from app.orchestrator.dynamic_graph import DynamicOrchestrator


router = APIRouter(prefix="/api/admin", tags=["Super Admin Config API"])

# --- BFSI DOMAIN TEMPLATES ---
TEMPLATES = {
    "banking": DomainTemplate(
        domain="banking",
        name="Retail & Commercial Banking Template",
        description="Pre-configured template for retail banking operations, account inquiries, card services, and loan support.",
        default_prompt="You are an intelligent BFSI AI Assistant specializing in Banking Operations. Help customers check balances, request card blocks, inquire about loan EMIs, and locate nearby branches politely and accurately.",
        default_guardrails={
            "blocked_topics": ["crypto gambling", "unauthorized fund transfers", "money laundering"],
            "required_disclaimers": ["Responses are for informational purposes. Verify account details in your banking app."],
            "pii_masking": True,
            "escalation_rules": {"negative_sentiment_turns": 2, "failed_intent_attempts": 3}
        },
        default_agent_settings={"llm_model": "gpt-4o-mini", "temperature": 0.2, "max_tokens": 1000},
        default_voice_settings={"tts_vendor": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM", "speed": 1.0, "stability": 0.75}
    ),
    "finance": DomainTemplate(
        domain="finance",
        name="Wealth Management & Financial Services Template",
        description="Pre-configured template for investment advisory, portfolio management, mutual funds, and fixed deposits.",
        default_prompt="You are a Certified BFSI Financial Advisor Assistant. Provide structured advice on wealth management, mutual fund performance, fixed deposit returns, and market insights.",
        default_guardrails={
            "blocked_topics": ["insider trading tips", "guaranteed return promises", "tax evasion"],
            "required_disclaimers": ["Investments are subject to market risks. Read all scheme documents carefully."],
            "pii_masking": True,
            "escalation_rules": {"high_value_portfolio_threshold": 50000}
        },
        default_agent_settings={"llm_model": "gpt-4o-mini", "temperature": 0.1, "max_tokens": 1200},
        default_voice_settings={"tts_vendor": "elevenlabs", "voice_id": "AZnzlk1XvdvUeBnXmlld", "speed": 1.0, "stability": 0.8}
    ),
    "insurance": DomainTemplate(
        domain="insurance",
        name="Insurance Claims & Policy Underwriting Template",
        description="Pre-configured template for motor, health, and life insurance claims, policy renewals, and coverage checks.",
        default_prompt="You are a Helpful BFSI Insurance Assistant. Assist policyholders with policy coverage, claim status tracking, premium payment reminders, and cashless hospital networks.",
        default_guardrails={
            "blocked_topics": ["fraudulent claims assistance", "policy tampering"],
            "required_disclaimers": ["Claims approval is subject to policy terms and conditions and documentation verification."],
            "pii_masking": True,
            "escalation_rules": {"claim_rejection_inquiries": 1}
        },
        default_agent_settings={"llm_model": "gpt-4o-mini", "temperature": 0.2, "max_tokens": 1000},
        default_voice_settings={"tts_vendor": "elevenlabs", "voice_id": "EXAVITQu4vr4xnSDxMaL", "speed": 1.0, "stability": 0.7}
    )
}

@router.get("/templates", response_model=List[DomainTemplate])
def get_domain_templates(ctx: TenantContext = Depends(require_super_admin)):
    """List available BFSI domain templates (Banking, Finance, Insurance)"""
    return list(TEMPLATES.values())

# --- ORGANIZATIONS MANAGEMENT ---
@router.get("/orgs", response_model=List[OrgResponse])
def list_organizations(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    orgs = db.query(Organization).all()
    res = []
    for org in orgs:
        u_count = len(org.users)
        p_count = len(org.projects)
        res.append(OrgResponse(
            id=org.id, name=org.name, slug=org.slug, status=org.status,
            user_count=u_count, project_count=p_count
        ))
    return res

@router.post("/orgs", response_model=OrgResponse)
def create_organization(req: OrgCreate, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    existing = db.query(Organization).filter(Organization.slug == req.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Organization slug already exists")
    org = Organization(name=req.name, slug=req.slug)
    db.add(org)
    db.commit()
    db.refresh(org)
    return OrgResponse(id=org.id, name=org.name, slug=org.slug, status=org.status, user_count=0, project_count=0)

# --- ORGANIZATION USERS ---
@router.post("/orgs/{org_id}/users", response_model=UserResponse)
def create_org_user(org_id: str, req: AdminUserCreate, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already exists")
    
    user = User(
        org_id=org_id,
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

# --- PROJECTS MANAGEMENT ---
@router.get("/orgs/{org_id}/projects", response_model=List[ProjectResponse])
def list_org_projects(org_id: str, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    projects = db.query(Project).filter(Project.org_id == org_id).all()
    return [ProjectResponse.model_validate(p) for p in projects]

@router.post("/orgs/{org_id}/projects", response_model=ProjectResponse)
def create_project(org_id: str, req: ProjectCreate, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    initial_status = req.status if req.status in ["Live", "Paused", "Draft"] else "Live"
    project = Project(org_id=org_id, name=req.name, domain=req.domain, status=initial_status)
    db.add(project)
    db.commit()
    db.refresh(project)

    # Pre-fill project config using selected template or domain default
    template_key = req.template_domain or req.domain
    template = TEMPLATES.get(template_key, TEMPLATES["banking"])

    config = ProjectConfig(
        project_id=project.id,
        system_prompt=template.default_prompt,
        guardrails=template.default_guardrails,
        agent_settings=template.default_agent_settings,
        voice_settings=template.default_voice_settings
    )
    db.add(config)
    db.commit()

    return ProjectResponse.model_validate(project)

@router.patch("/projects/{project_id}/status", response_model=ProjectResponse)
def update_project_status(project_id: str, req: ProjectStatusUpdate, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    """Update Agent status state: Live, Paused, or Draft"""
    valid_states = ["Live", "Paused", "Draft"]
    if req.status not in valid_states:
        raise HTTPException(status_code=400, detail=f"Invalid status state. Must be one of: {valid_states}")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = req.status
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


# --- PROJECT CONFIG ---
@router.get("/projects/{project_id}/config", response_model=ProjectConfigResponse)
def get_project_config(project_id: str, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    config = db.query(ProjectConfig).filter(ProjectConfig.project_id == project_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Project configuration not found")
    return ProjectConfigResponse.model_validate(config)

@router.put("/projects/{project_id}/config", response_model=ProjectConfigResponse)
def update_project_config(project_id: str, req: ProjectConfigUpdate, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    config = db.query(ProjectConfig).filter(ProjectConfig.project_id == project_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Project configuration not found")
    
    if req.system_prompt is not None:
        config.system_prompt = req.system_prompt
    if req.guardrails is not None:
        config.guardrails = req.guardrails
    if req.agent_settings is not None:
        config.agent_settings = req.agent_settings
    if req.voice_settings is not None:
        config.voice_settings = req.voice_settings

    db.commit()
    db.refresh(config)
    return ProjectConfigResponse.model_validate(config)

# --- API INTEGRATIONS & SECRETS ---
@router.get("/projects/{project_id}/integrations", response_model=List[ApiIntegrationResponse])
def list_integrations(project_id: str, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    integrations = db.query(ApiIntegration).filter(ApiIntegration.project_id == project_id).all()
    res = []
    for item in integrations:
        res.append(ApiIntegrationResponse(
            id=item.id, org_id=item.org_id, project_id=item.project_id,
            name=item.name, base_url=item.base_url, auth_type=item.auth_type,
            has_secret=bool(item.encrypted_secret), endpoints=item.endpoints or [],
            is_enabled=item.is_enabled
        ))
    return res

@router.post("/projects/{project_id}/integrations", response_model=ApiIntegrationResponse)
def create_integration(project_id: str, req: ApiIntegrationCreate, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    encrypted = encrypt_secret(req.secret_key) if req.secret_key else None
    endpoints_json = [ep.model_dump() for ep in req.endpoints]

    integration = ApiIntegration(
        org_id=project.org_id,
        project_id=project_id,
        name=req.name,
        base_url=req.base_url,
        auth_type=req.auth_type,
        encrypted_secret=encrypted,
        endpoints=endpoints_json,
        is_enabled=req.is_enabled
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    return ApiIntegrationResponse(
        id=integration.id, org_id=integration.org_id, project_id=integration.project_id,
        name=integration.name, base_url=integration.base_url, auth_type=integration.auth_type,
        has_secret=bool(integration.encrypted_secret), endpoints=integration.endpoints,
        is_enabled=integration.is_enabled
    )

@router.post("/integrations/{integration_id}/test-call", response_model=TestApiCallResponse)
async def test_integration_call(integration_id: str, req: TestApiCallRequest, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    """Execute live HTTP test request to configured external API endpoint using decrypted secret"""
    integration = db.query(ApiIntegration).filter(ApiIntegration.id == integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="API Integration not found")

    # Locate endpoint spec
    endpoint_spec = None
    for ep in integration.endpoints:
        if ep.get("name") == req.endpoint_name or ep.get("path") == req.endpoint_name:
            endpoint_spec = ep
            break
    
    if not endpoint_spec:
        # Fallback to custom path execution
        endpoint_spec = {"method": "GET", "path": req.endpoint_name}

    url = integration.base_url.rstrip("/") + "/" + endpoint_spec.get("path", "").lstrip("/")
    method = endpoint_spec.get("method", "GET").upper()
    headers = {"User-Agent": "BFSI-Agent-Platform-Tester/1.0"}

    # Attach auth header securely from decrypted vault secret
    if integration.encrypted_secret:
        raw_secret = decrypt_secret(integration.encrypted_secret)
        if integration.auth_type == "bearer":
            headers["Authorization"] = f"Bearer {raw_secret}"
        elif integration.auth_type == "api_key":
            headers["X-API-Key"] = raw_secret

    start_t = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if method == "POST":
                resp = await client.post(url, json=req.body_json, params=req.query_params, headers=headers)
            else:
                resp = await client.get(url, params=req.query_params, headers=headers)
            
            latency = (time.time() - start_t) * 1000.0
            try:
                body = resp.json()
            except Exception:
                body = resp.text

            return TestApiCallResponse(
                status_code=resp.status_code,
                success=resp.is_success,
                response_body=body,
                latency_ms=round(latency, 2)
            )
    except Exception as e:
        latency = (time.time() - start_t) * 1000.0
        return TestApiCallResponse(
            status_code=500,
            success=False,
            response_body={"error": str(e)},
            latency_ms=round(latency, 2)
        )

# --- KNOWLEDGE BASE DOCUMENT INGESTION ---
@router.get("/projects/{project_id}/kb", response_model=List[KnowledgeDocResponse])
def list_knowledge_docs(project_id: str, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_super_admin)):
    docs = db.query(KnowledgeDoc).filter(KnowledgeDoc.project_id == project_id).all()
    return [KnowledgeDocResponse.model_validate(d) for d in docs]

@router.post("/projects/{project_id}/kb/upload", response_model=KnowledgeDocResponse)
async def upload_knowledge_doc(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin)
):
    """Upload document file (PDF, TXT, CSV, MD, JSON), extract text, chunk, and index into Chroma vector store"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    upload_dir = os.path.join(os.getcwd(), "uploads", f"project_{project_id}")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Extract clean text using DocumentParser (handles PDF, CSV, TXT, MD, etc.)
    try:
        parsed = DocumentParser.extract_text(
            content=content,
            filename=file.filename,
            content_type=file.content_type
        )
        text_content = parsed["text"]
    except DocumentParseError as pe:
        logger.error(f"Document parsing error for {file.filename}: {pe}")
        raise HTTPException(status_code=400, detail=str(pe))
    except Exception as e:
        logger.error(f"Unexpected document parsing failure for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

    # Remove existing chunks for this filename in this project's collection to avoid duplicate/stale vectors
    PerProjectRAGService.delete_document_chunks(project_id=project_id, filename=file.filename)

    chunks_count = 0
    if text_content and len(text_content.strip()) > 15:
        chunks_count = PerProjectRAGService.index_document_text(
            project_id=project_id,
            filename=file.filename,
            content=text_content,
            source="file_upload",
            extra_metadata={
                "uploaded_by": ctx.user.email,
                "file_type": parsed.get("file_type", "unknown"),
                "page_count": parsed.get("page_count", 1),
            }
        )

    # Upsert or create database KnowledgeDoc record
    existing_doc = db.query(KnowledgeDoc).filter(
        KnowledgeDoc.project_id == project_id,
        KnowledgeDoc.filename == file.filename
    ).first()

    doc_meta = {
        "content_type": file.content_type,
        "file_type": parsed.get("file_type", "unknown"),
        "page_count": parsed.get("page_count", 1),
        "char_count": parsed.get("char_count", len(text_content)),
        "uploaded_by": ctx.user.email,
        "chunks_count": chunks_count,
        "warnings": parsed.get("warnings", []),
    }

    if existing_doc:
        existing_doc.file_path = file_path
        existing_doc.file_size = len(content)
        existing_doc.status = "indexed" if chunks_count > 0 else "failed"
        existing_doc.doc_metadata = doc_meta
        doc = existing_doc
    else:
        doc = KnowledgeDoc(
            org_id=project.org_id,
            project_id=project_id,
            filename=file.filename,
            file_path=file_path,
            file_size=len(content),
            collection_name=f"proj_{project_id}",
            status="indexed" if chunks_count > 0 else "failed",
            doc_metadata=doc_meta
        )
        db.add(doc)

    db.commit()
    db.refresh(doc)
    return KnowledgeDocResponse.model_validate(doc)

@router.post("/projects/{project_id}/kb/{doc_id}/reindex", response_model=KnowledgeDocResponse)
def reindex_knowledge_doc(
    project_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin)
):
    """Re-extract and re-index an existing Knowledge Base document from its stored file on disk"""
    doc = db.query(KnowledgeDoc).filter(KnowledgeDoc.id == doc_id, KnowledgeDoc.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Knowledge doc not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail=f"File not found on disk at {doc.file_path}")

    with open(doc.file_path, "rb") as f:
        content = f.read()

    parsed = DocumentParser.extract_text(content=content, filename=doc.filename)
    text_content = parsed["text"]

    # Delete old chunks
    PerProjectRAGService.delete_document_chunks(project_id=project_id, filename=doc.filename)

    chunks_count = PerProjectRAGService.index_document_text(
        project_id=project_id,
        filename=doc.filename,
        content=text_content,
        source="file_upload",
        extra_metadata={
            "reindexed_by": ctx.user.email,
            "file_type": parsed.get("file_type", "unknown"),
            "page_count": parsed.get("page_count", 1),
        }
    )

    doc.status = "indexed" if chunks_count > 0 else "failed"
    current_meta = doc.doc_metadata or {}
    current_meta.update({
        "chunks_count": chunks_count,
        "char_count": parsed.get("char_count", len(text_content)),
        "page_count": parsed.get("page_count", 1),
        "file_type": parsed.get("file_type", "unknown"),
        "reindexed_at": str(time.time()),
    })
    doc.doc_metadata = current_meta
    db.commit()
    db.refresh(doc)
    return KnowledgeDocResponse.model_validate(doc)

# --- WEB CRAWLER ENDPOINT ---
@router.post("/projects/{project_id}/kb/crawl", response_model=KnowledgeDocResponse)
async def crawl_webpage_to_kb(
    project_id: str,
    req: CrawlUrlRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin)
):
    """Crawl a webpage URL, extract clean text, chunk, and index into project vector collection"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        crawl_res = await WebCrawlerService.crawl_and_index_url(project_id=project_id, url=req.url)
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"Web crawl failed: {str(err)}")

    doc = KnowledgeDoc(
        org_id=project.org_id,
        project_id=project_id,
        filename=f"Web: {crawl_res['title'] or crawl_res['filename']}",
        file_path=crawl_res["url"],
        file_size=crawl_res["char_count"],
        collection_name=f"proj_{project_id}",
        status="indexed",
        doc_metadata={
            "source": "web_crawler",
            "url": crawl_res["url"],
            "title": crawl_res["title"],
            "chunks_count": crawl_res["chunks_count"],
            "snippet": crawl_res["snippet"],
            "crawled_by": ctx.user.email,
        }
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return KnowledgeDocResponse.model_validate(doc)

# --- AGENT PLAYGROUND SIMULATOR ---
@router.post("/projects/{project_id}/playground-test", response_model=PlaygroundTestResponse)
async def test_agent_playground(
    project_id: str,
    req: PlaygroundTestRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin)
):
    """
    Execute real agent simulation turn with full observability:
    runs input guardrails, Chroma vector RAG query, tool triggers, OpenRouter LLM call,
    and output guardrails.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    orchestrator = DynamicOrchestrator(project_id=project_id, db=db)
    result = await orchestrator.process_turn(user_query=req.query, is_playground=True)

    return PlaygroundTestResponse(
        answer=result.get("answer", ""),
        intent=result.get("intent", "general_query"),
        rag_passages=result.get("rag_passages", []),
        tool_calls=result.get("tool_calls", []),
        latency_ms=result.get("latency_ms", 0.0),
        tokens_used=result.get("tokens_used", 0),
        model_used=result.get("model_used", ""),
        is_flagged=result.get("is_flagged", False),
        should_escalate=result.get("should_escalate", False),
    )


# ─────────────────────────────────────────────────────────────────────────────
# CURL IMPORT PARSER
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/parse-curl", response_model=CurlParseResponse)
def parse_curl_command(req: CurlParseRequest, ctx: TenantContext = Depends(require_super_admin)):
    """
    Parse a raw cURL command into structured API integration fields.
    Credentials found in the cURL are flagged but NEVER returned in the response —
    the frontend receives only auth_type and auth_value_present=True, then the user
    pastes/confirms their secret for Fernet encryption.
    """
    import shlex
    curl = req.curl_command.strip()
    cleaned = curl.replace("\\\r\n", " ").replace("\\\n", " ")

    method = None
    raw_url = ""
    raw_headers = []
    body_raw = None
    auth_user = None

    try:
        tokens = shlex.split(cleaned)
    except Exception:
        tokens = cleaned.split()

    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in ["-X", "--request"] and i + 1 < len(tokens):
            method = tokens[i + 1].upper()
            i += 2
        elif t in ["-H", "--header"] and i + 1 < len(tokens):
            h_str = tokens[i + 1]
            if ":" in h_str:
                k, _, v = h_str.partition(":")
                raw_headers.append({"key": k.strip(), "value": v.strip()})
            i += 2
        elif t in ["-d", "--data", "--data-raw", "--data-binary", "--data-urlencode"] and i + 1 < len(tokens):
            body_raw = tokens[i + 1]
            i += 2
        elif t in ["-u", "--user"] and i + 1 < len(tokens):
            auth_user = tokens[i + 1]
            i += 2
        elif t.startswith("http://") or t.startswith("https://"):
            if not raw_url:
                raw_url = t
            i += 1
        elif t != "curl" and not t.startswith("-") and not raw_url and ("/" in t or "." in t):
            raw_url = t
            i += 1
        else:
            i += 1

    # Fallback for method
    if not method:
        method = "POST" if body_raw is not None else "GET"

    # Fallback for URL if not captured
    if not raw_url:
        url_fallback = re.search(r"https?://[^\s'\"\\]+", curl)
        raw_url = url_fallback.group(0).strip("'\"") if url_fallback else ""

    parsed_url = urlparse(raw_url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}" if parsed_url.netloc else raw_url
    path = parsed_url.path or "/"
    query_string = parsed_url.query or ""
    query_params = {k: v[0] for k, v in parse_qs(query_string).items()}

    # Fallback headers regex if tokens missed any
    if not raw_headers:
        header_matches = re.findall(r"-H\s+['\"]([^'\"]+)['\"]", curl)
        for h in header_matches:
            if ":" in h:
                key, _, val = h.partition(":")
                raw_headers.append({"key": key.strip(), "value": val.strip()})

    # ---- Auth Detection ----
    auth_type = "none"
    auth_value_present = False

    # Check Authorization header
    auth_header = next((h for h in raw_headers if h["key"].lower() == "authorization"), None)
    if auth_header:
        val_lower = auth_header["value"].lower()
        if val_lower.startswith("bearer "):
            auth_type = "bearer"
            auth_value_present = bool(auth_header["value"].split(" ", 1)[-1].strip())
        elif val_lower.startswith("basic "):
            auth_type = "basic"
            auth_value_present = True
        auth_header["value"] = "[REDACTED — paste secret in vault]"

    # Check X-API-Key header
    api_key_header = next((h for h in raw_headers if h["key"].lower() in ["x-api-key", "api-key", "apikey"]), None)
    if api_key_header and auth_type == "none":
        auth_type = "api_key"
        auth_value_present = True
        api_key_header["value"] = "[REDACTED — paste secret in vault]"

    # Check -u / --user
    if (auth_user or re.search(r'(?:-u|--user)\s+[\'"]?([^\s\'"]+)[\'"]?', curl)) and auth_type == "none":
        auth_type = "basic"
        auth_value_present = True

    # Filter out auth headers from returned list
    safe_headers = [
        ParsedHeader(key=h["key"], value=h["value"])
        for h in raw_headers
        if h["key"].lower() not in ["authorization", "x-api-key", "api-key", "apikey"]
    ]

    # ---- Body ----
    content_type = next((h["value"] for h in raw_headers if h["key"].lower() == "content-type"), None)
    if not body_raw:
        body_match = re.search(r"(?:--data-raw|--data-binary|--data|-d)\s+['\"]([^'\"]*)['\"]", curl, re.DOTALL)
        if body_match:
            body_raw = body_match.group(1).strip()

    body_json = None
    if body_raw:
        try:
            body_json = json.loads(body_raw)
        except Exception:
            body_json = None

    # ---- Suggested Names ----
    host_part = parsed_url.netloc.replace("api.", "").split(".")[0]
    path_part = path.strip("/").split("/")[0] if path.strip("/") else "endpoint"
    suggested_name = f"{host_part.title()} {method} API" if host_part else "Imported API"
    suggested_endpoint_name = f"{method.lower()}_{path_part}".replace("-", "_")

    return CurlParseResponse(
        method=method,
        url=raw_url,
        base_url=base_url,
        path=path,
        headers=safe_headers,
        auth_type=auth_type,
        auth_value_present=auth_value_present,
        query_params=query_params,
        body_json=body_json,
        body_raw=body_raw,
        content_type=content_type,
        suggested_name=suggested_name,
        suggested_endpoint_name=suggested_endpoint_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# TOOL ASSIGNMENTS — Enable/disable integrations per project (agent-to-tool)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/tool-assignments", response_model=ToolAssignmentsResponse)
def get_tool_assignments(
    project_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
):
    """Get current tool assignment state (enabled/disabled) for all integrations in a project."""
    integrations = db.query(ApiIntegration).filter(ApiIntegration.project_id == project_id).all()
    assignments = [
        {"integration_id": i.id, "name": i.name, "is_enabled": i.is_enabled}
        for i in integrations
    ]
    return ToolAssignmentsResponse(updated=0, assignments=assignments)


@router.put("/projects/{project_id}/tool-assignments", response_model=ToolAssignmentsResponse)
def update_tool_assignments(
    project_id: str,
    req: ToolAssignmentsRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
):
    """
    Enable or disable specific API integrations (tools) for an agent/project.
    Only enabled tools are loaded into the DynamicOrchestrator at runtime.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updated = 0
    for item in req.assignments:
        integration = db.query(ApiIntegration).filter(
            ApiIntegration.id == item.integration_id,
            ApiIntegration.project_id == project_id,
        ).first()
        if integration:
            integration.is_enabled = item.is_enabled
            updated += 1

    db.commit()

    all_integrations = db.query(ApiIntegration).filter(ApiIntegration.project_id == project_id).all()
    return ToolAssignmentsResponse(
        updated=updated,
        assignments=[
            {"integration_id": i.id, "name": i.name, "is_enabled": i.is_enabled}
            for i in all_integrations
        ],
    )


# ─────────────────────────────────────────────────────────────────────────────
# MOCK BFSI INTEGRATION INSTALLER
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/install-mock-integrations", response_model=MockInstallResponse)
def install_mock_integrations(
    project_id: str,
    base_url: Optional[str] = Query(None, description="Custom base URL, e.g. https://chatbot.haloocom.in/mockapi1"),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
):
    """
    One-click install of BFSI Mock API integrations for Banking, Insurance, and Finance.
    Creates ApiIntegration records pointing to the internal or remote /api/mock/* endpoints.
    Updates base_url on existing mock integrations if specified.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine the mock API base URL (custom domain, env variable, or default localhost)
    mock_base = (base_url or os.environ.get("MOCK_API_BASE_URL") or "http://localhost:8000").rstrip("/")

    MOCK_SUITES = [
        {
            "name": "[MOCK] Banking APIs",
            "base_url": f"{mock_base}/api/mock/banking",
            "auth_type": "none",
            "endpoints": [
                {"name": "get_account_balance", "method": "GET", "path": "/accounts/{{account_id}}/balance",
                 "description": "Get account balance and details for a customer"},
                {"name": "get_account_details", "method": "GET", "path": "/accounts/{{account_id}}",
                 "description": "Get full account holder details"},
                {"name": "get_transactions", "method": "GET", "path": "/accounts/{{account_id}}/transactions",
                 "description": "Retrieve recent transaction history"},
                {"name": "get_loan_status", "method": "GET", "path": "/loans/{{loan_id}}/status",
                 "description": "Check loan status, outstanding amount, and next due date"},
                {"name": "get_loan_schedule", "method": "GET", "path": "/loans/{{loan_id}}/schedule",
                 "description": "Get upcoming EMI repayment schedule"},
                {"name": "create_service_request", "method": "POST", "path": "/service-requests",
                 "description": "Create a banking service request (card block, cheque book, etc.)"},
            ],
        },
        {
            "name": "[MOCK] Insurance APIs",
            "base_url": f"{mock_base}/api/mock/insurance",
            "auth_type": "none",
            "endpoints": [
                {"name": "get_policy_details", "method": "GET", "path": "/policies/{{policy_id}}",
                 "description": "Get insurance policy details, coverage, and premium"},
                {"name": "get_policy_status", "method": "GET", "path": "/policies/{{policy_id}}/status",
                 "description": "Check policy status and premium due date"},
                {"name": "get_claim_status", "method": "GET", "path": "/claims/{{claim_id}}/status",
                 "description": "Check insurance claim processing status"},
                {"name": "create_claim", "method": "POST", "path": "/claims",
                 "description": "File a new insurance claim"},
                {"name": "create_renewal", "method": "POST", "path": "/renewals",
                 "description": "Initiate a policy renewal request"},
            ],
        },
        {
            "name": "[MOCK] Finance APIs",
            "base_url": f"{mock_base}/api/mock/finance",
            "auth_type": "none",
            "endpoints": [
                {"name": "calculate_emi", "method": "GET", "path": "/emi",
                 "description": "Calculate EMI for a loan given principal, rate, and tenure"},
                {"name": "get_loan_application_status", "method": "GET", "path": "/loan-applications/{{app_id}}/status",
                 "description": "Check the status of a loan application"},
                {"name": "get_repayment_history", "method": "GET", "path": "/repayments/{{loan_id}}/history",
                 "description": "Retrieve loan repayment history"},
            ],
        },
    ]

    installed = []
    integration_ids = []

    for suite in MOCK_SUITES:
        # Check if already installed (idempotent, but update base_url if changed)
        existing = db.query(ApiIntegration).filter(
            ApiIntegration.project_id == project_id,
            ApiIntegration.name == suite["name"],
        ).first()

        if existing:
            existing.base_url = suite["base_url"]
            integration_ids.append(existing.id)
            installed.append(f"{suite['name']} (updated base_url to {suite['base_url']})")
            continue

        integration = ApiIntegration(
            org_id=project.org_id,
            project_id=project_id,
            name=suite["name"],
            base_url=suite["base_url"],
            auth_type=suite["auth_type"],
            encrypted_secret=None,
            endpoints=suite["endpoints"],
            is_enabled=True,
        )
        db.add(integration)
        db.flush()
        integration_ids.append(integration.id)
        installed.append(suite["name"])

    db.commit()

    return MockInstallResponse(
        status="success",
        installed=installed,
        integration_ids=integration_ids,
        message=f"Installed {len(MOCK_SUITES)} mock BFSI integration suites with {sum(len(s['endpoints']) for s in MOCK_SUITES)} total tool endpoints. Assign them to this agent using the tool assignments panel.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# HUBSPOT INTEGRATION INSTALLER
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/install-hubspot-integration", response_model=HubSpotInstallResponse)
def install_hubspot_integration(
    project_id: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_super_admin),
):
    """
    Register HubSpot CRM as an ApiIntegration entry for this project (without credentials).
    Credentials must be added via POST /api/admin/hubspot/connect.
    This is safe to call without a token — it creates the placeholder record only.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = db.query(ApiIntegration).filter(
        ApiIntegration.project_id == project_id,
        ApiIntegration.name.like("%HubSpot%"),
    ).first()

    if existing:
        return HubSpotInstallResponse(
            status="already_installed",
            integration_id=existing.id,
            message="HubSpot integration already registered. Use POST /api/admin/hubspot/connect to add or update credentials.",
        )

    integration = ApiIntegration(
        org_id=project.org_id,
        project_id=project_id,
        name="HubSpot CRM",
        base_url="https://api.hubapi.com",
        auth_type="bearer",
        encrypted_secret=None,  # Will be set via /connect
        is_enabled=False,  # Disabled until credentials are configured
        endpoints=[
            {"name": "search_contacts", "method": "POST",
             "path": "/crm/v3/objects/contacts/search",
             "description": "Search HubSpot contacts by name or email"},
            {"name": "get_contact", "method": "GET",
             "path": "/crm/v3/objects/contacts/{id}",
             "description": "Get a HubSpot contact by ID"},
            {"name": "create_contact", "method": "POST",
             "path": "/crm/v3/objects/contacts",
             "description": "Create a new contact in HubSpot CRM"},
            {"name": "create_task", "method": "POST",
             "path": "/crm/v3/objects/tasks",
             "description": "Create a follow-up task in HubSpot CRM"},
        ],
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    return HubSpotInstallResponse(
        status="installed",
        integration_id=integration.id,
        message="HubSpot CRM integration registered. It is disabled until you connect via POST /api/admin/hubspot/connect with your Private App Token.",
    )
