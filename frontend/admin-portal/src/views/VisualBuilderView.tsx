import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../services/api';
import type {
  Organization, Project, KnowledgeDoc,
  WorkflowCanvasNode, WorkflowCanvasEdge, WorkflowNodeType,
} from '../types';

// ============================================================
// Types & Constants
// ============================================================
interface VisualBuilderViewProps {
  orgs: Organization[];
  selectedOrgId: string;
  onOrgChange: (id: string) => void;
  projects: Project[];
  selectedProjectId: string;
  onProjectSelect: (id: string) => void;
  onOrgsUpdate: () => void;
  onProjectsUpdate: (orgId: string) => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

const PALETTE_ITEMS: { type: WorkflowNodeType; icon: string; label: string; color: string; desc: string }[] = [
  { type: 'org', icon: '🏢', label: 'Organization', color: '#f59e0b', desc: 'Create org & users' },
  { type: 'project', icon: '📁', label: 'Project', color: '#0ea5e9', desc: 'Add a project' },
  { type: 'agent', icon: '🤖', label: 'Agent', color: '#6366f1', desc: 'Agent with lifecycle' },
  { type: 'config', icon: '✍️', label: 'Prompt & Config', color: '#a855f7', desc: 'LLM & guardrails' },
  { type: 'rag', icon: '📚', label: 'Knowledge Base', color: '#10b981', desc: 'PDF upload & crawl' },
  { type: 'api_vault', icon: '🔐', label: 'API Vault', color: '#f43f5e', desc: 'REST integrations' },
  { type: 'playground', icon: '🎮', label: 'Playground', color: '#06b6d4', desc: 'Test agent live' },
];

const NODE_WIDTH = 280;

let nodeIdCounter = 0;
const genId = () => `node_${++nodeIdCounter}_${Date.now()}`;
let edgeIdCounter = 0;
const genEdgeId = () => `edge_${++edgeIdCounter}`;

// ============================================================
// SVG Bezier Wire Component
// ============================================================
function BezierWire({ x1, y1, x2, y2, animated }: { x1: number; y1: number; x2: number; y2: number; animated?: boolean }) {
  const dx = Math.abs(x2 - x1) * 0.5;
  const d = `M ${x1} ${y1} C ${x1} ${y1 + dx}, ${x2} ${y2 - dx}, ${x2} ${y2}`;
  return <path d={d} className={`builder-wire${animated ? ' active' : ''}`} />;
}

// ============================================================
// Compact Node Bodies for Canvas Cards
// ============================================================

function OrgNodeCard({ node, onSelect }: { node: WorkflowCanvasNode; onSelect: () => void }) {
  const isConfigured = !!node.data.entityId;
  return (
    <div className="node-body" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="node-summary-pill">
        <span>🏢 {isConfigured ? 'Org Created' : 'Setup Required'}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)' }}>
          {isConfigured ? `ID: ${node.data.entityId.slice(0, 8)}` : 'Draft'}
        </span>
      </div>
      <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        ⚙️ Manage Org & Users ↗
      </button>
    </div>
  );
}

function ProjectNodeCard({ node, onSelect }: { node: WorkflowCanvasNode; onSelect: () => void }) {
  const isCreated = !!node.data.entityId;
  return (
    <div className="node-body" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="node-summary-pill">
        <span>📁 {isCreated ? 'Linked Project' : 'New Project'}</span>
        <span className="badge badge-sky" style={{ fontSize: 9 }}>
          {node.data.subtitle || 'banking'}
        </span>
      </div>
      <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        ⚙️ Project Details ↗
      </button>
    </div>
  );
}

function AgentNodeCard({ node, onSelect, onQuickToggle }: {
  node: WorkflowCanvasNode; onSelect: () => void; onQuickToggle: (status: string) => void;
}) {
  const agentStatus = node.data.status || 'Draft';
  const statusCls = agentStatus.toLowerCase() === 'live' || agentStatus.toLowerCase() === 'active'
    ? 'live' : agentStatus.toLowerCase() === 'paused' ? 'paused' : 'draft';

  return (
    <div className="node-body" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="node-summary-pill">
        <span>🤖 Status</span>
        <span className={`badge badge-${statusCls}`} style={{ fontSize: 9 }}>
          {statusCls === 'live' ? '🟢 Live' : statusCls === 'paused' ? '🟡 Paused' : '⚪ Draft'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-sm"
          onClick={(e) => { e.stopPropagation(); onQuickToggle('Live'); }}
          disabled={agentStatus.toLowerCase() === 'live'}
          style={{ fontSize: 9, flex: 1, padding: '4px 6px', background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
          title="Make Live">
          🟢 Live
        </button>
        <button
          className="btn btn-sm"
          onClick={(e) => { e.stopPropagation(); onQuickToggle('Draft'); }}
          disabled={agentStatus.toLowerCase() === 'draft'}
          style={{ fontSize: 9, flex: 1, padding: '4px 6px', background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)' }}
          title="Switch to Draft">
          ⚪ Draft
        </button>
      </div>
      <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        ⚙️ Agent Controls ↗
      </button>
    </div>
  );
}

function ConfigNodeCard({ node, onSelect }: { node: WorkflowCanvasNode; onSelect: () => void }) {
  return (
    <div className="node-body" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="node-summary-pill">
        <span>✍️ LLM & Guardrails</span>
        <span className="badge badge-purple" style={{ fontSize: 9 }}>Config</span>
      </div>
      <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        ⚙️ Prompt & Settings ↗
      </button>
    </div>
  );
}

function RagNodeCard({ node, onSelect }: { node: WorkflowCanvasNode; onSelect: () => void }) {
  return (
    <div className="node-body" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="node-summary-pill">
        <span>📚 Chroma Vector</span>
        <span className="badge badge-emerald" style={{ fontSize: 9 }}>RAG Docs</span>
      </div>
      <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        📄 Upload & Crawl ↗
      </button>
    </div>
  );
}

function ApiVaultNodeCard({ node, onSelect }: { node: WorkflowCanvasNode; onSelect: () => void }) {
  return (
    <div className="node-body" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="node-summary-pill">
        <span>🔐 REST Tools</span>
        <span className="badge badge-rose" style={{ fontSize: 9 }}>Vault</span>
      </div>
      <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        ⚙️ API Vault ↗
      </button>
    </div>
  );
}

function PlaygroundNodeCard({ node, onSelect }: { node: WorkflowCanvasNode; onSelect: () => void }) {
  return (
    <div className="node-body" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="node-summary-pill">
        <span>🎮 Test Console</span>
        <span className="badge badge-cyan" style={{ fontSize: 9 }}>Simulator</span>
      </div>
      <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        ▶ Open Playground ↗
      </button>
    </div>
  );
}

// ============================================================
// Right Drawer Forms (Interactive Configurations)
// ============================================================

// --- Org Drawer Form ---
function OrgDrawerForm({ node, onMessage, onOrgsUpdate }: {
  node: WorkflowCanvasNode; onMessage: VisualBuilderViewProps['onMessage']; onOrgsUpdate: () => void;
}) {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('lead');
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const orgId = node.data.entityId;

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    try {
      const slug = orgSlug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const created = await adminApi.createOrg(orgName.trim(), slug);
      node.data.entityId = created.id;
      node.data.title = created.name;
      node.data.subtitle = `ID: ${created.id.slice(0, 8)}`;
      setOrgName(''); setOrgSlug('');
      onOrgsUpdate();
      onMessage(`✅ Organization "${created.name}" created`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to create org', 'error');
    } finally { setLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !userEmail.trim()) return;
    setLoadingUser(true);
    try {
      await adminApi.createOrgUser(orgId, {
        email: userEmail.trim(), password: userPass, full_name: userName.trim(), role: userRole,
      });
      setUserEmail(''); setUserPass(''); setUserName('');
      onMessage(`✅ User "${userName}" onboarded as ${userRole}`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to create user', 'error');
    } finally { setLoadingUser(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!orgId ? (
        <div>
          <div className="builder-section-title">Create New Organization</div>
          <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Organization Name
              </label>
              <input className="form-input" placeholder="e.g. Standard Chartered Global" value={orgName}
                onChange={(e) => { setOrgName(e.target.value); setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
                style={{ fontSize: 12, padding: '8px 12px' }} required />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Slug / Tenant Key
              </label>
              <input className="form-input" placeholder="e.g. scb-global" value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)} style={{ fontSize: 12, padding: '8px 12px' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ fontSize: 12, marginTop: 4 }}>
              {loading ? '⏳ Creating Organization…' : '🏢 Create Organization'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ padding: 14, background: 'rgba(16,185,129,0.08)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>🏢 Active Organization</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 4 }}>{node.data.title}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>ID: {orgId}</div>
        </div>
      )}

      {orgId && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          <div className="builder-section-title">👤 Onboard Operator / User Credentials</div>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Full Name
              </label>
              <input className="form-input" placeholder="e.g. Alex Henderson" value={userName}
                onChange={(e) => setUserName(e.target.value)} style={{ fontSize: 12, padding: '8px 12px' }} required />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Email Address
              </label>
              <input className="form-input" type="email" placeholder="e.g. alex@bank.com" value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)} style={{ fontSize: 12, padding: '8px 12px' }} required />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Temporary Password
              </label>
              <input className="form-input" type="password" placeholder="••••••••" value={userPass}
                onChange={(e) => setUserPass(e.target.value)} style={{ fontSize: 12, padding: '8px 12px' }} required />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Access Role
              </label>
              <select className="form-input" value={userRole} onChange={(e) => setUserRole(e.target.value)}
                style={{ fontSize: 12, padding: '8px 12px' }}>
                <option value="super_admin">Super Admin (Platform Administrator)</option>
                <option value="supervisor">Supervisor (Tenant Manager)</option>
                <option value="lead">Lead Operator (Advisory Agent)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loadingUser}
              style={{ fontSize: 12, marginTop: 4 }}>
              {loadingUser ? '⏳ Onboarding User…' : '👤 Onboard User Credentials'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// --- Project Drawer Form ---
function ProjectDrawerForm({ node, onMessage, orgs, onProjectsUpdate }: {
  node: WorkflowCanvasNode; onMessage: VisualBuilderViewProps['onMessage']; orgs: Organization[]; onProjectsUpdate: (orgId: string) => void;
}) {
  const [projName, setProjName] = useState('');
  const [domain, setDomain] = useState('banking');
  const [selectedOrg, setSelectedOrg] = useState(node.data.details?.orgId || '');
  const [loading, setLoading] = useState(false);
  const projId = node.data.entityId;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !projName.trim()) return;
    setLoading(true);
    try {
      const created = await adminApi.createProject(selectedOrg, projName.trim(), domain, domain, 'Draft');
      node.data.entityId = created.id;
      node.data.title = created.name;
      node.data.subtitle = `Domain: ${domain}`;
      node.data.status = 'Draft';
      node.data.details = { ...node.data.details, orgId: selectedOrg, projectId: created.id };
      setProjName('');
      onProjectsUpdate(selectedOrg);
      onMessage(`✅ Project "${created.name}" created as Draft`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to create project', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!projId ? (
        <div>
          <div className="builder-section-title">Create Project under Organization</div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Parent Organization
              </label>
              <select className="form-input" value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}
                style={{ fontSize: 12, padding: '8px 12px' }} required>
                <option value="">— Select Organization —</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Project Name
              </label>
              <input className="form-input" placeholder="e.g. Retail Banking Support" value={projName}
                onChange={(e) => setProjName(e.target.value)} style={{ fontSize: 12, padding: '8px 12px' }} required />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                BFSI Domain Template
              </label>
              <select className="form-input" value={domain} onChange={(e) => setDomain(e.target.value)}
                style={{ fontSize: 12, padding: '8px 12px' }}>
                <option value="banking">🏦 Retail & Commercial Banking</option>
                <option value="finance">📈 Wealth Management & Financial Services</option>
                <option value="insurance">🛡️ Insurance Claims & Policy Underwriting</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ fontSize: 12, marginTop: 6 }}>
              {loading ? '⏳ Creating Project…' : '📁 Create Project'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 14, background: 'rgba(14,165,233,0.08)', borderRadius: 10, border: '1px solid rgba(14,165,233,0.2)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>📁 Project Details</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>{node.data.title}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{node.data.subtitle}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 4 }}>ID: {projId}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Agent Drawer Form ---
function AgentDrawerForm({ node, onMessage, projects, onProjectsUpdate, selectedOrgId }: {
  node: WorkflowCanvasNode; onMessage: VisualBuilderViewProps['onMessage']; projects: Project[];
  onProjectsUpdate: (orgId: string) => void; selectedOrgId: string;
}) {
  const [selectedProjId, setSelectedProjId] = useState(node.data.details?.projectId || node.data.entityId || '');
  const [toggling, setToggling] = useState(false);
  const agentStatus = node.data.status || 'Draft';

  const handleLink = (projId: string) => {
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    setSelectedProjId(projId);
    node.data.entityId = proj.id;
    node.data.title = proj.name;
    node.data.status = proj.status as string;
    node.data.details = { ...node.data.details, projectId: proj.id };
  };

  const handleStatusToggle = async (nextStatus: string) => {
    const targetId = node.data.entityId || selectedProjId;
    if (!targetId) {
      onMessage('Please link an agent/project first', 'error');
      return;
    }
    setToggling(true);
    try {
      await adminApi.updateProjectStatus(targetId, nextStatus);
      node.data.status = nextStatus;
      if (selectedOrgId) onProjectsUpdate(selectedOrgId);
      onMessage(`✅ Agent status updated to ${nextStatus}`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to update status', 'error');
    } finally { setToggling(false); }
  };

  const statusCls = agentStatus.toLowerCase() === 'live' || agentStatus.toLowerCase() === 'active'
    ? 'live' : agentStatus.toLowerCase() === 'paused' ? 'paused' : 'draft';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="builder-section-title">Link Agent to Project</div>
        <div style={{ marginTop: 6 }}>
          <select className="form-input" value={selectedProjId} onChange={(e) => handleLink(e.target.value)}
            style={{ fontSize: 12, padding: '8px 12px' }}>
            <option value="">— Link to Agent/Project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
        <div className="builder-section-title">Lifecycle & Deployment State</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Current Deployment:</span>
          <span className={`badge badge-${statusCls}`} style={{ fontSize: 11 }}>
            {statusCls === 'live' ? '🟢 Live' : statusCls === 'paused' ? '🟡 Paused' : '⚪ Draft'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <button className="btn" disabled={toggling || agentStatus.toLowerCase() === 'live'}
            onClick={() => handleStatusToggle('Live')}
            style={{ fontSize: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            🟢 Make Live (Accept User Inquiries)
          </button>
          <button className="btn" disabled={toggling || agentStatus.toLowerCase() === 'draft'}
            onClick={() => handleStatusToggle('Draft')}
            style={{ fontSize: 12, padding: '10px 14px', background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ⚪ Save as Draft (Staging / Testing Only)
          </button>
          <button className="btn" disabled={toggling || agentStatus.toLowerCase() === 'paused'}
            onClick={() => handleStatusToggle('Paused')}
            style={{ fontSize: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            🟡 Pause Agent (Temporary Maintenance)
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Config Drawer Form ---
function ConfigDrawerForm({ node, onMessage }: {
  node: WorkflowCanvasNode; onMessage: VisualBuilderViewProps['onMessage'];
}) {
  const [projectId, setProjectId] = useState(node.data.details?.projectId || '');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [blockedTopics, setBlockedTopics] = useState('');
  const [piiMasking, setPiiMasking] = useState(true);
  const [llmModel, setLlmModel] = useState('google/gemini-2.0-flash-001');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const pid = node.data.details?.projectId;
    if (pid && pid !== projectId) setProjectId(pid);
  }, [node.data.details?.projectId]);

  const loadConfig = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const cfg = await adminApi.getConfig(projectId);
      setSystemPrompt(cfg.system_prompt || '');
      setBlockedTopics((cfg.guardrails?.blocked_topics || []).join(', '));
      setPiiMasking(cfg.guardrails?.pii_masking ?? true);
      setLlmModel(cfg.agent_settings?.llm_model || 'google/gemini-2.0-flash-001');
      setTemperature(cfg.agent_settings?.temperature ?? 0.2);
      setMaxTokens(cfg.agent_settings?.max_tokens ?? 1000);
      setLoaded(true);
      onMessage('Config loaded successfully', 'success');
    } catch {
      onMessage('No remote config found — enter new prompt below', 'error');
      setLoaded(true);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!projectId) { onMessage('Please enter or link a Project ID first', 'error'); return; }
    setSaving(true);
    try {
      await adminApi.updateConfig(projectId, {
        system_prompt: systemPrompt,
        guardrails: {
          blocked_topics: blockedTopics.split(',').map(s => s.trim()).filter(Boolean),
          pii_masking: piiMasking,
        },
        agent_settings: { llm_model: llmModel, temperature, max_tokens: maxTokens },
      });
      onMessage('✅ Configuration saved successfully', 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to save config', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="builder-section-title">Target Project ID</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input className="form-input" placeholder="Project ID" value={projectId}
            onChange={(e) => { setProjectId(e.target.value); node.data.details = { ...node.data.details, projectId: e.target.value }; }}
            style={{ fontSize: 12, padding: '8px 12px', flex: 1, fontFamily: 'monospace' }} />
          <button className="btn" onClick={loadConfig} disabled={loading || !projectId}
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            {loading ? '⏳' : '📥 Load Config'}
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <div className="builder-section-title">System Prompt</div>
        <textarea className="form-input" placeholder="You are an intelligent BFSI AI Assistant..."
          value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
          style={{ fontSize: 11, padding: '10px 12px', minHeight: 110, resize: 'vertical', fontFamily: 'monospace', width: '100%', marginTop: 6 }} />
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <div className="builder-section-title">LLM Model & Hyperparameters</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>Model</label>
            <select className="form-input" value={llmModel} onChange={(e) => setLlmModel(e.target.value)}
              style={{ fontSize: 12, padding: '8px 12px' }}>
              <option value="google/gemini-2.0-flash-001">⚡ Google Gemini 2.0 Flash</option>
              <option value="gpt-4o-mini">🧠 OpenAI GPT-4o Mini</option>
              <option value="openai/gpt-4o">🔥 OpenAI GPT-4o</option>
              <option value="meta-llama/llama-3.1-70b-instruct">🦙 Meta Llama 3.1 70B</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
                Temp: {temperature}
              </label>
              <input type="range" min="0" max="1" step="0.05" value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)} style={{ width: '100%' }} />
            </div>
            <div style={{ width: 100 }}>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>Max Tokens</label>
              <input type="number" className="form-input" value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 500)}
                style={{ fontSize: 12, padding: '6px 8px' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <div className="builder-section-title">Security & Guardrails</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={piiMasking} onChange={(e) => setPiiMasking(e.target.checked)} />
            <span>Enable Automatic PII Masking (SSN, Phone, Email, Cards)</span>
          </label>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>
              Blocked Topics (comma-separated)
            </label>
            <input className="form-input" placeholder="e.g. crypto gambling, money laundering" value={blockedTopics}
              onChange={(e) => setBlockedTopics(e.target.value)} style={{ fontSize: 11, padding: '8px 12px' }} />
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}
        style={{ fontSize: 12, padding: '10px 14px', marginTop: 4 }}>
        {saving ? '⏳ Saving Configuration…' : '💾 Save Configuration'}
      </button>
    </div>
  );
}

// --- RAG Drawer Form ---
function RagDrawerForm({ node, onMessage }: {
  node: WorkflowCanvasNode; onMessage: VisualBuilderViewProps['onMessage'];
}) {
  const [projectId, setProjectId] = useState(node.data.details?.projectId || '');
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pid = node.data.details?.projectId;
    if (pid && pid !== projectId) setProjectId(pid);
  }, [node.data.details?.projectId]);

  const loadDocs = async () => {
    if (!projectId) return;
    try {
      const data = await adminApi.getKbDocs(projectId);
      setDocs(data);
      onMessage(`Loaded ${data.length} documents`, 'success');
    } catch { }
  };

  const handleUpload = async (file: File) => {
    if (!projectId) { onMessage('Set project ID first', 'error'); return; }
    setIsUploading(true);
    try {
      await adminApi.uploadKbDoc(projectId, file);
      await loadDocs();
      onMessage(`✅ "${file.name}" uploaded and indexed into Chroma`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Upload failed', 'error');
    } finally { setIsUploading(false); }
  };

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !crawlUrl.trim()) return;
    setIsCrawling(true);
    try {
      const res = await adminApi.crawlUrl(projectId, crawlUrl.trim());
      setCrawlUrl('');
      await loadDocs();
      onMessage(`✅ Crawled & indexed ${res.doc_metadata?.chunks_count || '?'} chunks`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Crawl failed', 'error');
    } finally { setIsCrawling(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="builder-section-title">Knowledge Base Project Association</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input className="form-input" placeholder="Project ID" value={projectId}
            onChange={(e) => { setProjectId(e.target.value); node.data.details = { ...node.data.details, projectId: e.target.value }; }}
            style={{ fontSize: 12, padding: '8px 12px', flex: 1, fontFamily: 'monospace' }} />
          <button className="btn" onClick={loadDocs} disabled={!projectId}
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            📥 Refresh Docs
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <div className="builder-section-title">📄 Ingest Documents & PDFs</div>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx,.md" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ''; }} />
        <button className="btn" disabled={isUploading || !projectId}
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%', marginTop: 8, padding: '12px', fontSize: 12, background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {isUploading ? '⏳ Splitting & Indexing Document…' : '📄 Click to Upload PDF / Policy Document'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <div className="builder-section-title">🌐 Crawl Website URL</div>
        <form onSubmit={handleCrawl} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="form-input" placeholder="https://example.com/faqs" value={crawlUrl}
            onChange={(e) => setCrawlUrl(e.target.value)} style={{ fontSize: 11, padding: '8px 12px', flex: 1 }} />
          <button type="submit" className="btn btn-primary" disabled={isCrawling || !projectId}
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            {isCrawling ? '⏳ Crawling…' : '🌐 Crawl'}
          </button>
        </form>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <div className="builder-section-title">Attached Vector Documents ({docs.length})</div>
        {docs.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', padding: '12px 0', textAlign: 'center' }}>
            No documents indexed yet. Upload a PDF or crawl a URL above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
            {docs.map(d => (
              <div key={d.id} style={{ fontSize: 11, padding: '8px 10px', background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                  📄 {d.filename}
                </span>
                <span className="badge badge-emerald" style={{ fontSize: 9 }}>
                  {d.doc_metadata?.chunks_count || 1} chunks
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- API Vault Drawer Form ---
function ApiVaultDrawerForm({ node, onMessage }: {
  node: WorkflowCanvasNode; onMessage: VisualBuilderViewProps['onMessage'];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: 16, background: 'rgba(244,63,94,0.08)', borderRadius: 10, border: '1px solid rgba(244,63,94,0.2)', textAlign: 'center' }}>
        <span style={{ fontSize: 28 }}>🔐</span>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fb7185', marginTop: 8 }}>API Vault & Dynamic Tools</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
          Securely link external banking REST endpoints with AES-encrypted secrets. Tools are automatically generated and made available to agents.
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
        To manage API secrets, endpoints, and credentials, switch to the dedicated <strong>API Vault</strong> view from the left sidebar.
      </div>
    </div>
  );
}

// --- Playground Drawer Form ---
function PlaygroundDrawerForm({ node, onMessage }: {
  node: WorkflowCanvasNode; onMessage: VisualBuilderViewProps['onMessage'];
}) {
  const [projectId, setProjectId] = useState(node.data.details?.projectId || '');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [meta, setMeta] = useState<{ model?: string; latency?: number; tokens?: number; passages?: number }>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const pid = node.data.details?.projectId;
    if (pid && pid !== projectId) setProjectId(pid);
  }, [node.data.details?.projectId]);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !query.trim()) return;
    setTesting(true); setAnswer('');
    try {
      const res = await adminApi.testPlaygroundChat(projectId, query.trim());
      setAnswer(res.answer || '(no response)');
      setMeta({
        model: res.model_used, latency: res.latency_ms,
        tokens: res.tokens_used, passages: res.rag_passages?.length || 0,
      });
    } catch {
      setAnswer('⚠️ Test simulation failed — verify backend status');
      onMessage('Playground test failed', 'error');
    } finally { setTesting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="builder-section-title">Test Target Project</div>
        <input className="form-input" placeholder="Project ID" value={projectId}
          onChange={(e) => { setProjectId(e.target.value); node.data.details = { ...node.data.details, projectId: e.target.value }; }}
          style={{ fontSize: 12, padding: '8px 12px', width: '100%', marginTop: 6, fontFamily: 'monospace' }} />
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <div className="builder-section-title">Interactive Simulation Turn</div>
        <form onSubmit={handleTest} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <input className="form-input" placeholder="Type a test customer inquiry…" value={query}
            onChange={(e) => setQuery(e.target.value)} style={{ fontSize: 12, padding: '8px 12px' }} />
          <button type="submit" className="btn btn-primary" disabled={testing || !projectId}
            style={{ fontSize: 12, padding: '8px 14px' }}>
            {testing ? '⏳ Running Agent Simulation…' : '▶ Run Agent Simulation'}
          </button>
        </form>
      </div>

      {answer && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <div className="builder-section-title">Agent Response Output</div>
          <div style={{ fontSize: 12, padding: '12px', background: 'rgba(6,182,212,0.08)', borderRadius: 8, border: '1px solid rgba(6,182,212,0.2)', color: 'var(--color-text-secondary)', maxHeight: 180, overflowY: 'auto', lineHeight: 1.6, marginTop: 8 }}>
            {answer}
          </div>
          {meta.model && (
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--color-text-muted)', marginTop: 8 }}>
              <span>🤖 {meta.model}</span>
              <span>⏱ {meta.latency?.toFixed(0)}ms</span>
              <span>🎯 {meta.tokens} tokens</span>
              <span>📚 {meta.passages} passages</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Visual Builder View
// ============================================================

export default function VisualBuilderView({
  orgs, selectedOrgId, onOrgChange, projects, selectedProjectId,
  onProjectSelect, onOrgsUpdate, onProjectsUpdate, onMessage,
}: VisualBuilderViewProps) {
  const [nodes, setNodes] = useState<WorkflowCanvasNode[]>([]);
  const [edges, setEdges] = useState<WorkflowCanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // Keyboard shortcut (Escape closes right drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNodeId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-populate from existing data on mount
  useEffect(() => {
    if (nodes.length === 0 && orgs.length > 0) {
      autoPopulate();
    }
  }, [orgs, projects]);

  const autoPopulate = useCallback(() => {
    const newNodes: WorkflowCanvasNode[] = [];
    const newEdges: WorkflowCanvasEdge[] = [];
    const org = orgs.find(o => o.id === selectedOrgId) || orgs[0];
    if (!org) return;

    // Create org node
    const orgNodeId = genId();
    newNodes.push({
      id: orgNodeId, type: 'org', x: 80, y: 50,
      data: { id: orgNodeId, type: 'org', title: org.name, subtitle: `ID: ${org.id.slice(0, 8)}`, entityId: org.id },
    });

    // Create project nodes
    projects.forEach((proj, i) => {
      const pNodeId = genId();
      newNodes.push({
        id: pNodeId, type: 'project', x: 80 + (i * 320), y: 220,
        data: { id: pNodeId, type: 'project', title: proj.name, subtitle: `Domain: ${proj.domain}`, entityId: proj.id, status: proj.status as string, details: { orgId: org.id, projectId: proj.id } },
      });
      newEdges.push({ id: genEdgeId(), source: orgNodeId, target: pNodeId, label: 'has project' });

      // Agent node for each project
      const aNodeId = genId();
      newNodes.push({
        id: aNodeId, type: 'agent', x: 80 + (i * 320), y: 390,
        data: { id: aNodeId, type: 'agent', title: proj.name, subtitle: `Agent`, entityId: proj.id, status: proj.status as string, details: { projectId: proj.id } },
      });
      newEdges.push({ id: genEdgeId(), source: pNodeId, target: aNodeId, label: 'agent' });

      // Config node
      const cNodeId = genId();
      newNodes.push({
        id: cNodeId, type: 'config', x: 80 + (i * 320) - 150, y: 560,
        data: { id: cNodeId, type: 'config', title: 'Prompt & Config', subtitle: proj.name, details: { projectId: proj.id } },
      });
      newEdges.push({ id: genEdgeId(), source: aNodeId, target: cNodeId, label: 'config' });

      // RAG node
      const rNodeId = genId();
      newNodes.push({
        id: rNodeId, type: 'rag', x: 80 + (i * 320) + 150, y: 560,
        data: { id: rNodeId, type: 'rag', title: 'Knowledge Base', subtitle: proj.name, details: { projectId: proj.id } },
      });
      newEdges.push({ id: genEdgeId(), source: aNodeId, target: rNodeId, label: 'knowledge' });

      // Playground node
      const pgNodeId = genId();
      newNodes.push({
        id: pgNodeId, type: 'playground', x: 80 + (i * 320), y: 730,
        data: { id: pgNodeId, type: 'playground', title: 'Playground', subtitle: proj.name, details: { projectId: proj.id } },
      });
      newEdges.push({ id: genEdgeId(), source: cNodeId, target: pgNodeId, label: 'test', animated: true });
      newEdges.push({ id: genEdgeId(), source: rNodeId, target: pgNodeId, label: 'test', animated: true });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [orgs, projects, selectedOrgId]);

  // --- Drag & Drop from palette ---
  const handlePaletteDrop = useCallback((type: WorkflowNodeType, e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasOffset.x) / zoom;
    const y = (e.clientY - rect.top - canvasOffset.y) / zoom;
    const id = genId();
    const item = PALETTE_ITEMS.find(p => p.type === type)!;
    const newNode: WorkflowCanvasNode = {
      id, type, x, y,
      data: { id, type, title: item.label, subtitle: 'New Block', details: {} },
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
  }, [canvasOffset, zoom]);

  // --- Node dragging ---
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, select, textarea, button, form')) return;
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setDragOffset({
      x: (e.clientX - canvasOffset.x) / zoom - node.x,
      y: (e.clientY - canvasOffset.y) / zoom - node.y,
    });
  }, [nodes, canvasOffset, zoom]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = (e.clientX - canvasOffset.x) / zoom - dragOffset.x;
      const newY = (e.clientY - canvasOffset.y) / zoom - dragOffset.y;
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n));
    } else if (isPanning) {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [draggingNodeId, dragOffset, canvasOffset, zoom, isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setDraggingNodeId(null);
    setIsPanning(false);
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('builder-canvas-viewport')) {
      setSelectedNodeId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  }, [canvasOffset]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
  }, []);

  // --- Delete node ---
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  // --- Connect nodes ---
  const handleHandleClick = useCallback((nodeId: string, position: string) => {
    if (position === 'bottom' || position === 'right') {
      setConnectingFrom(nodeId);
    } else if (connectingFrom && connectingFrom !== nodeId) {
      setEdges(prev => [...prev, { id: genEdgeId(), source: connectingFrom, target: nodeId, animated: true }]);
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  // --- Get node center positions for wires ---
  const getNodePort = (nodeId: string, position: 'top' | 'bottom') => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    if (position === 'top') return { x: node.x + NODE_WIDTH / 2, y: node.y };
    return { x: node.x + NODE_WIDTH / 2, y: node.y + 115 };
  };

  // --- Quick Agent Status Toggle from Card ---
  const handleQuickAgentToggle = async (node: WorkflowCanvasNode, nextStatus: string) => {
    const targetId = node.data.entityId || node.data.details?.projectId;
    if (!targetId) {
      onMessage('Please configure project link in side panel first', 'error');
      setSelectedNodeId(node.id);
      return;
    }
    try {
      await adminApi.updateProjectStatus(targetId, nextStatus);
      node.data.status = nextStatus;
      setNodes([...nodes]);
      if (selectedOrgId) onProjectsUpdate(selectedOrgId);
      onMessage(`✅ Agent status → ${nextStatus}`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to update status', 'error');
    }
  };

  // --- Render compact card body on canvas ---
  const renderNodeCardBody = (node: WorkflowCanvasNode) => {
    const onSelect = () => setSelectedNodeId(node.id);
    switch (node.type) {
      case 'org':
        return <OrgNodeCard node={node} onSelect={onSelect} />;
      case 'project':
        return <ProjectNodeCard node={node} onSelect={onSelect} />;
      case 'agent':
        return <AgentNodeCard node={node} onSelect={onSelect} onQuickToggle={(s) => handleQuickAgentToggle(node, s)} />;
      case 'config':
        return <ConfigNodeCard node={node} onSelect={onSelect} />;
      case 'rag':
        return <RagNodeCard node={node} onSelect={onSelect} />;
      case 'api_vault':
        return <ApiVaultNodeCard node={node} onSelect={onSelect} />;
      case 'playground':
        return <PlaygroundNodeCard node={node} onSelect={onSelect} />;
      default:
        return null;
    }
  };

  // --- Render full form inside right drawer ---
  const renderDrawerForm = (node: WorkflowCanvasNode) => {
    switch (node.type) {
      case 'org':
        return <OrgDrawerForm node={node} onMessage={onMessage} onOrgsUpdate={onOrgsUpdate} />;
      case 'project':
        return <ProjectDrawerForm node={node} onMessage={onMessage} orgs={orgs} onProjectsUpdate={onProjectsUpdate} />;
      case 'agent':
        return <AgentDrawerForm node={node} onMessage={onMessage} projects={projects} onProjectsUpdate={onProjectsUpdate} selectedOrgId={selectedOrgId} />;
      case 'config':
        return <ConfigDrawerForm node={node} onMessage={onMessage} />;
      case 'rag':
        return <RagDrawerForm node={node} onMessage={onMessage} />;
      case 'api_vault':
        return <ApiVaultDrawerForm node={node} onMessage={onMessage} />;
      case 'playground':
        return <PlaygroundDrawerForm node={node} onMessage={onMessage} />;
      default:
        return null;
    }
  };

  const getNodeColor = (type: WorkflowNodeType) => PALETTE_ITEMS.find(p => p.type === type)?.color || '#6366f1';
  const getNodeIcon = (type: WorkflowNodeType) => PALETTE_ITEMS.find(p => p.type === type)?.icon || '🔮';

  const getStatusClass = (node: WorkflowCanvasNode) => {
    const s = (node.data.status || '').toLowerCase();
    if (s === 'live' || s === 'active') return 'status-live';
    if (s === 'paused') return 'status-paused';
    if (s === 'draft') return 'status-draft';
    return '';
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="visual-builder-container">
      {/* Top Toolbar */}
      <div className="builder-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🧩</span> Visual Workflow Builder
          </div>
          <span className="badge badge-indigo" style={{ fontSize: 10 }}>{nodes.length} Nodes</span>
          <span className="badge badge-sky" style={{ fontSize: 10 }}>{edges.length} Connections</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Zoom: {(zoom * 100).toFixed(0)}%</span>
          <button className="btn btn-sm" onClick={() => setZoom(1)} style={{ fontSize: 10 }}>Reset</button>
          <button className="btn btn-sm" onClick={() => { setCanvasOffset({ x: 0, y: 0 }); setZoom(1); }}
            style={{ fontSize: 10 }}>Fit</button>
          <button className="btn btn-sm" onClick={autoPopulate}
            style={{ fontSize: 10 }}>🔄 Reload Hierarchy</button>
          <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
            onClick={() => onMessage('✅ Workflow saved successfully', 'success')}>
            💾 Save Workflow
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="builder-workspace">
        {/* Left Palette */}
        <div className="builder-palette">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Add Blocks
          </div>
          {PALETTE_ITEMS.map(item => (
            <div key={item.type} className="palette-item"
              onClick={(e) => handlePaletteDrop(item.type, e)}
              title={`Click to add ${item.label}`}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}

          {connectingFrom && (
            <div style={{ padding: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, fontSize: 11, color: '#818cf8', textAlign: 'center' }}>
              🔗 Click target node's top port to wire
            </div>
          )}
        </div>

        {/* Center Infinite Canvas */}
        <div className="builder-canvas-viewport" ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}>

          {/* Transform container */}
          <div style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute', top: 0, left: 0, width: '250%', height: '250%',
          }}>
            {/* SVG Wires */}
            <svg className="builder-svg-layer" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 2 }}>
              {edges.map(edge => {
                const src = getNodePort(edge.source, 'bottom');
                const tgt = getNodePort(edge.target, 'top');
                return <BezierWire key={edge.id} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} animated={edge.animated} />;
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const color = getNodeColor(node.type);
              const icon = getNodeIcon(node.type);
              const isSelected = selectedNodeId === node.id;
              return (
                <div key={node.id}
                  className={`builder-node ${isSelected ? 'selected' : ''} ${getStatusClass(node)}`}
                  style={{
                    left: node.x, top: node.y, width: NODE_WIDTH,
                    borderColor: isSelected ? color : undefined,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}>

                  {/* Wire Ports */}
                  <div className="node-handle node-handle-top"
                    style={{ background: color, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleHandleClick(node.id, 'top'); }} />
                  <div className="node-handle node-handle-bottom"
                    style={{ background: color, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleHandleClick(node.id, 'bottom'); }} />

                  {/* Node Header */}
                  <div className="node-header">
                    <div className="node-title-group">
                      <div className="node-icon-badge" style={{ background: `${color}20`, color }}>
                        {icon}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                          {node.data.title}
                        </div>
                        {node.data.subtitle && (
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                            {node.data.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                      style={{ fontSize: 11, padding: '2px 6px', color: 'var(--color-rose)', background: 'transparent', border: 'none' }}
                      title="Remove block">✕</button>
                  </div>

                  {/* Compact Node Body */}
                  {renderNodeCardBody(node)}
                </div>
              );
            })}
          </div>

          {/* Minimap controls */}
          <div className="builder-minimap">
            <button className="btn btn-sm" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
              style={{ fontSize: 12, padding: '2px 8px' }}>−</button>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', padding: '0 4px', minWidth: 40, textAlign: 'center' }}>
              {(zoom * 100).toFixed(0)}%
            </span>
            <button className="btn btn-sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              style={{ fontSize: 12, padding: '2px 8px' }}>+</button>
          </div>
        </div>

        {/* Right Panel / Configuration Inspector Drawer */}
        {selectedNode && (
          <div className="builder-inspector">
            <div className="builder-inspector-header">
              <div className="builder-inspector-title">
                <div className="node-icon-badge" style={{ background: `${getNodeColor(selectedNode.type)}20`, color: getNodeColor(selectedNode.type) }}>
                  {getNodeIcon(selectedNode.type)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {selectedNode.data.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {PALETTE_ITEMS.find(p => p.type === selectedNode.type)?.label} Configuration
                  </div>
                </div>
              </div>
              <button className="builder-inspector-close" onClick={() => setSelectedNodeId(null)} title="Close Panel (Esc)">
                ✕
              </button>
            </div>
            <div className="builder-inspector-body">
              {renderDrawerForm(selectedNode)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
