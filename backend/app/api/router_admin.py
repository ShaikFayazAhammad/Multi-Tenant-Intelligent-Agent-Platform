import os
import time
import uuid
import httpx
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
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
    PlaygroundTestRequest, PlaygroundTestResponse
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

