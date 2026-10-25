// ============================================================
// BFSI Admin Portal — Core Type Definitions
// Hierarchy: Organization → Projects → Agents
// ============================================================

export type AgentStatus = 'Live' | 'Paused' | 'Draft';
export type OrgStatus = 'active' | 'inactive';
export type Domain = 'banking' | 'finance' | 'insurance';
export type UserRole = 'super_admin' | 'supervisor' | 'lead';
export type NavItem =
  | 'dashboard'
  | 'visual-builder'
  | 'organizations'
  | 'agents'
  | 'prompt-config'
  | 'knowledge-base'
  | 'api-vault'
  | 'playground';

// --- Organization ---
export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  user_count?: number;
  project_count?: number;
}

// --- Project ---
export interface Project {
  id: string;
  org_id: string;
  name: string;
  domain: Domain;
  status: AgentStatus | string;
}

// --- Project Config ---
export interface ProjectConfig {
  id: string;
  project_id: string;
  system_prompt: string;
  guardrails: {
    blocked_topics?: string[];
    required_disclaimers?: string[];
    pii_masking?: boolean;
    escalation_rules?: Record<string, any>;
  };
  agent_settings: {
    llm_model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  voice_settings: {
    tts_vendor?: string;
    voice_id?: string;
    speed?: number;
    stability?: number;
  };
}

// --- Knowledge Document ---
export interface KnowledgeDoc {
  id: string;
  org_id: string;
  project_id: string;
  filename: string;
  file_size: number;
  collection_name: string;
  status: string;
  doc_metadata: {
    chunks_count?: number;
    source?: string;
    url?: string;
    title?: string;
    content_type?: string;
    uploaded_by?: string;
    crawled_by?: string;
    snippet?: string;
  };
}

// --- API Integration ---
export interface ApiIntegration {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  base_url: string;
  auth_type: string;
  has_secret: boolean;
  endpoints: EndpointSpec[];
  is_enabled: boolean;
}

export interface EndpointSpec {
  name: string;
  method: string;
  path: string;
  description?: string;
  parameters?: Record<string, any>;
}

// --- Analytics ---
export interface AnalyticsDashboard {
  total_conversations: number;
  chat_vs_voice: { chat: number; voice: number };
  resolution_rate: number;
  escalated_conversations: number;
  top_intents: { intent: string; count: number }[];
  avg_response_time_ms: number;
  failed_api_calls: number;
  feedback_score: number;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  details: Record<string, any>;
  created_at: string;
}

// --- Playground ---
export interface PlaygroundToolCall {
  tool: string;
  description?: string;
  endpoint?: string;
  method?: string;
  status?: string;
  status_code?: number;
  latency_ms?: number;
  result?: any;
  error?: string;
}

export interface PlaygroundLog {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  rag_passages?: { filename?: string; text: string; score: number }[];
  tool_calls?: PlaygroundToolCall[];
  should_escalate?: boolean;
  is_flagged?: boolean;
  latency_ms?: number;
  tokens_used?: number;
  model_used?: string;
}

// --- cURL Parse Result ---
export interface CurlParseResult {
  method: string;
  url: string;
  base_url: string;
  path: string;
  headers: { key: string; value: string }[];
  auth_type: string;
  auth_value_present: boolean;
  query_params: Record<string, string>;
  body_json?: Record<string, any> | null;
  body_raw?: string | null;
  content_type?: string | null;
  suggested_name: string;
  suggested_endpoint_name: string;
}

// --- Tool Assignment ---
export interface ToolAssignment {
  integration_id: string;
  name: string;
  is_enabled: boolean;
}

// --- Mock Install Result ---
export interface MockInstallResult {
  status: string;
  installed: string[];
  integration_ids: string[];
  message: string;
}

// --- HubSpot Status ---
export interface HubSpotStatus {
  status: 'connected' | 'unconfigured';
  message: string;
  project_id: string;
  integration_id?: string;
  is_sandbox?: boolean;
  mode?: 'sandbox' | 'live' | 'unconfigured';
}

// --- User ---
export interface OrgUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

// --- Domain Template ---
export interface DomainTemplate {
  domain: string;
  name: string;
  description: string;
  default_prompt: string;
  default_guardrails: Record<string, any>;
  default_agent_settings: Record<string, any>;
  default_voice_settings: Record<string, any>;
}

// --- Visual Workflow Studio ---
export type WorkflowNodeType =
  | 'org'
  | 'project'
  | 'agent'
  | 'config'
  | 'rag'
  | 'api_vault'
  | 'playground';

export interface WorkflowNodeData {
  id: string;
  type: WorkflowNodeType;
  title: string;
  subtitle?: string;
  entityId?: string;
  status?: string;
  details?: Record<string, any>;
  collapsed?: boolean;
}

export interface WorkflowCanvasNode {
  id: string;
  type: WorkflowNodeType;
  x: number;
  y: number;
  data: WorkflowNodeData;
}

export interface WorkflowCanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}
