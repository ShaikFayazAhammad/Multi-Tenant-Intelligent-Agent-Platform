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
export interface PlaygroundLog {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  rag_passages?: { filename?: string; text: string; score: number }[];
  tool_calls?: { tool: string }[];
  should_escalate?: boolean;
  is_flagged?: boolean;
  latency_ms?: number;
  tokens_used?: number;
  model_used?: string;
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
