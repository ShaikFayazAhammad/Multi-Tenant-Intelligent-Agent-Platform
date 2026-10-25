from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Organizations ---
class OrgCreate(BaseModel):
    name: str
    slug: str

class OrgUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    status: str
    user_count: Optional[int] = 0
    project_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Org Users ---
class AdminUserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "lead" # supervisor, lead

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# --- Projects & Templates ---
class ProjectCreate(BaseModel):
    name: str
    domain: str = Field(..., description="banking | finance | insurance")
    template_domain: Optional[str] = None # Optional pre-fill template
    status: Optional[str] = "Live" # Live | Paused | Draft

class ProjectStatusUpdate(BaseModel):
    status: str = Field(..., description="Live | Paused | Draft")

class ProjectResponse(BaseModel):
    id: str
    org_id: str
    name: str
    domain: str
    status: str

    class Config:
        from_attributes = True


class DomainTemplate(BaseModel):
    domain: str
    name: str
    description: str
    default_prompt: str
    default_guardrails: Dict[str, Any]
    default_agent_settings: Dict[str, Any]
    default_voice_settings: Dict[str, Any]

# --- Project Config ---
class ProjectConfigUpdate(BaseModel):
    system_prompt: Optional[str] = None
    guardrails: Optional[Dict[str, Any]] = None
    agent_settings: Optional[Dict[str, Any]] = None
    voice_settings: Optional[Dict[str, Any]] = None

class ProjectConfigResponse(BaseModel):
    id: str
    project_id: str
    system_prompt: str
    guardrails: Dict[str, Any]
    agent_settings: Dict[str, Any]
    voice_settings: Dict[str, Any]

    class Config:
        from_attributes = True

# --- API Integrations ---
class EndpointSpec(BaseModel):
    name: str
    method: str = "GET" # GET, POST, PUT, DELETE
    path: str
    description: Optional[str] = ""
    parameters: Optional[Dict[str, Any]] = None

class ApiIntegrationCreate(BaseModel):
    name: str
    base_url: str
    auth_type: str = "none" # none, bearer, api_key, basic
    secret_key: Optional[str] = None # Will be encrypted before DB persist
    endpoints: List[EndpointSpec] = []
    is_enabled: bool = True

class ApiIntegrationUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    auth_type: Optional[str] = None
    secret_key: Optional[str] = None
    endpoints: Optional[List[EndpointSpec]] = None
    is_enabled: Optional[bool] = None

class ApiIntegrationResponse(BaseModel):
    id: str
    org_id: str
    project_id: str
    name: str
    base_url: str
    auth_type: str
    has_secret: bool # Secret is NEVER returned to frontend
    endpoints: List[Dict[str, Any]]
    is_enabled: bool

    class Config:
        from_attributes = True

class TestApiCallRequest(BaseModel):
    endpoint_name: str
    query_params: Optional[Dict[str, Any]] = {}
    body_json: Optional[Dict[str, Any]] = {}

class TestApiCallResponse(BaseModel):
    status_code: int
    success: bool
    response_body: Any
    latency_ms: float

# --- Knowledge Base Docs & Crawler ---
class CrawlUrlRequest(BaseModel):
    url: str

class KnowledgeDocResponse(BaseModel):
    id: str
    org_id: str
    project_id: str
    filename: str
    file_size: int
    collection_name: str
    status: str
    doc_metadata: Dict[str, Any]

    class Config:
        from_attributes = True

# --- Agent Playground ---
class PlaygroundTestRequest(BaseModel):
    query: str

class PlaygroundTestResponse(BaseModel):
    answer: str
    intent: str
    rag_passages: List[Dict[str, Any]] = []
    tool_calls: List[Dict[str, Any]] = []
    latency_ms: float
    tokens_used: int = 0
    model_used: str = ""
    is_flagged: bool = False
    should_escalate: bool = False

# ─────────────────────────────────────────────
# NEW: cURL Import Parser
# ─────────────────────────────────────────────

class CurlParseRequest(BaseModel):
    curl_command: str = Field(..., description="Raw cURL command string to parse")

class ParsedHeader(BaseModel):
    key: str
    value: str

class CurlParseResponse(BaseModel):
    method: str
    url: str
    base_url: str
    path: str
    headers: List[ParsedHeader]
    auth_type: str          # none, bearer, api_key, basic
    auth_value_present: bool  # True if an auth credential was found (value NEVER returned)
    query_params: Dict[str, str]
    body_json: Optional[Dict[str, Any]]
    body_raw: Optional[str]
    content_type: Optional[str]
    suggested_name: str
    suggested_endpoint_name: str

# ─────────────────────────────────────────────
# NEW: Tool Assignments (per-project enable/disable)
# ─────────────────────────────────────────────

class ToolAssignmentItem(BaseModel):
    integration_id: str
    is_enabled: bool

class ToolAssignmentsRequest(BaseModel):
    assignments: List[ToolAssignmentItem]

class ToolAssignmentsResponse(BaseModel):
    updated: int
    assignments: List[Dict[str, Any]]

# ─────────────────────────────────────────────
# NEW: Mock Integration Install
# ─────────────────────────────────────────────

class MockInstallResponse(BaseModel):
    status: str
    installed: List[str]
    integration_ids: List[str]
    message: str

# ─────────────────────────────────────────────
# NEW: HubSpot Install Response
# ─────────────────────────────────────────────

class HubSpotInstallResponse(BaseModel):
    status: str
    integration_id: Optional[str] = None
    message: str
