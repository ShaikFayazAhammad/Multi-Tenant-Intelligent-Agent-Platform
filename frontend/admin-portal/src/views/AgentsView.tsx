import React, { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { adminApi } from '../services/api';
import type { Organization, Project, AgentStatus } from '../types';

interface AgentsViewProps {
  orgs: Organization[];
  selectedOrgId: string;
  projects: Project[];
  selectedProjectId: string;
  onProjectSelect: (id: string) => void;
  onProjectsUpdate: (orgId: string) => void;
  onMessage: (msg: any, type?: 'success' | 'error' | 'warn' | 'info') => void;
  onNavigateBilling?: () => void;
  onOpenUpgradeModal?: () => void;
}

type Domain = 'banking' | 'finance' | 'insurance';

const DOMAINS = [
  { value: 'banking', label: '🏦 Retail & Commercial Banking', desc: 'Account services, loans, cards' },
  { value: 'finance', label: '📈 Wealth Management & Advisory', desc: 'Investments, mutual funds, portfolios' },
  { value: 'insurance', label: '🛡️ Insurance Claims & Underwriting', desc: 'Policies, claims, renewals' },
];

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const cls = s === 'live' || s === 'active' ? 'live' : s === 'paused' ? 'paused' : 'draft';
  const label = s === 'live' || s === 'active' ? '🟢 Live' : s === 'paused' ? '🟡 Paused' : '⚪ Draft';
  return <span className={`badge badge-${cls}`}>{label}</span>;
}

export default function AgentsView({
  orgs, selectedOrgId, projects, selectedProjectId,
  onProjectSelect, onProjectsUpdate, onMessage,
  onNavigateBilling, onOpenUpgradeModal,
}: AgentsViewProps) {
  const [agentName, setAgentName] = useState('');
  const [domain, setDomain] = useState<Domain>('banking');
  const [initialStatus, setInitialStatus] = useState<AgentStatus>('Live');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isAtLimit = projects.length >= 1;

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !agentName.trim()) return;

    // Direct check: if at free tier limit, cleanly pop up the upgrade plan modal
    if (isAtLimit) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal();
      } else if (onNavigateBilling) {
        onNavigateBilling();
      } else {
        onMessage('Free tier limit reached (1/1 Agent). Please upgrade your plan in Plans & Billing.', 'warn');
      }
      return;
    }

    setCreating(true);
    try {
      await adminApi.createProject(selectedOrgId, agentName.trim(), domain, domain, initialStatus);
      setAgentName('');
      onProjectsUpdate(selectedOrgId);
      onMessage(`✅ Agent "${agentName}" created as ${initialStatus}`, 'success');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const isLimit =
        status === 402 ||
        detail?.error === 'plan_limit_reached' ||
        (typeof detail === 'string' && detail.toLowerCase().includes('limit')) ||
        (typeof detail?.message === 'string' && detail.message.toLowerCase().includes('limit'));

      if (isLimit) {
        if (onOpenUpgradeModal) {
          onOpenUpgradeModal();
        } else if (onNavigateBilling) {
          onNavigateBilling();
        } else {
          onMessage('Plan quota limit reached. Please upgrade to Pro in Plans & Billing.', 'warn');
        }
      } else {
        const errorText = typeof detail === 'string' ? detail : detail?.message || 'Failed to create agent';
        onMessage(errorText, 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleStatusToggle = async (projId: string, nextStatus: AgentStatus) => {
    setTogglingId(projId);
    try {
      await adminApi.updateProjectStatus(projId, nextStatus);
      onProjectsUpdate(selectedOrgId);
      onMessage(`✅ Agent status updated to ${nextStatus}`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to update status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-header">
        <div>
          <div className="section-title">Projects & Agents</div>
          <div className="section-subtitle">
            1 Organization → Multiple Projects → Multiple Agents with lifecycle control
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="badge badge-sky">{projects.length} Agents</div>
          <div className="badge badge-emerald">
            {projects.filter((p) => ['live','active'].includes((p.status||'').toLowerCase())).length} Live
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Create Agent Form */}
        <div className="card" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🤖</span> Create New Intelligent Agent
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Under organization:{' '}
              <strong style={{ color: 'var(--color-text-accent)' }}>
                {selectedOrg?.name || '(select an org above)'}
              </strong>
            </div>
          </div>

          {isAtLimit && (
            <div
              style={{
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={18} color="#f87171" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>
                    Free Tier Quota Limit ({projects.length}/1 Active Agent)
                  </div>
                  <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 2 }}>
                    Upgrade to Pro tier to deploy up to 5 intelligent agents.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => (onOpenUpgradeModal ? onOpenUpgradeModal() : onNavigateBilling ? onNavigateBilling() : null)}
              >
                <Sparkles size={13} /> Upgrade Plan
              </button>
            </div>
          )}

          <form onSubmit={handleCreateAgent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Agent Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Mortgage Loan Underwriter"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">BFSI Domain Specialization</label>
              <select
                className="form-select"
                value={domain}
                onChange={(e) => setDomain(e.target.value as Domain)}
              >
                {DOMAINS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {DOMAINS.find(d => d.value === domain)?.desc}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Lifecycle Status</label>
              <div className="status-toggles">
                {(['Live', 'Paused', 'Draft'] as AgentStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`status-toggle ${initialStatus === s ? `active-${s.toLowerCase()}` : ''}`}
                    onClick={() => setInitialStatus(s)}
                  >
                    {s === 'Live' ? '🟢' : s === 'Paused' ? '🟡' : '⚪'} {s}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                {initialStatus === 'Live' && 'Agent immediately accepts client queries'}
                {initialStatus === 'Paused' && 'Agent is in maintenance mode — returns a notice'}
                {initialStatus === 'Draft' && 'Agent is in development — Playground only'}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={creating || !selectedOrgId}
              style={isAtLimit ? { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' } : undefined}
            >
              {creating ? (
                <><div className="spinner" /> Creating Agent…</>
              ) : isAtLimit ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Sparkles size={15} /> Upgrade Plan to Deploy More Agents
                </span>
              ) : (
                '🤖 Deploy Agent'
              )}
            </button>
          </form>
        </div>

        {/* Hierarchy Overview */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Platform Hierarchy
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Organization ➔ Projects ➔ Agents
            </div>
          </div>
          {orgs.map((org) => (
            <div key={org.id} style={{ marginBottom: 12 }}>
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: org.id === selectedOrgId ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${org.id === selectedOrgId ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>🏢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{org.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono' }}>/{org.slug}</div>
                </div>
                <div className={`badge badge-${org.status === 'active' ? 'emerald' : 'amber'}`}>{org.status}</div>
              </div>
              {org.id === selectedOrgId && projects.length > 0 && (
                <div style={{ marginLeft: 20, marginTop: 6, borderLeft: '2px solid rgba(99,102,241,0.2)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                        background: p.id === selectedProjectId ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${p.id === selectedProjectId ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => onProjectSelect(p.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>🤖</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{p.domain.toUpperCase()}</div>
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All Agents Table */}
      <div className="card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Configured Agents — Lifecycle Control</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Pause, activate, or set agents to draft mode instantly
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div className="badge badge-emerald">{projects.filter((p) => ['live','active'].includes((p.status||'').toLowerCase())).length} Live</div>
            <div className="badge badge-amber">{projects.filter((p) => (p.status||'').toLowerCase() === 'paused').length} Paused</div>
            <div className="badge badge-draft">{projects.filter((p) => (p.status||'').toLowerCase() === 'draft').length} Draft</div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤖</div>
            <div className="empty-state-title">No agents configured yet</div>
            <div className="empty-state-desc">Create your first intelligent agent using the form above. Each agent is provisioned with a full prompt config, RAG vector store, and API vault.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((proj) => {
              const st = (proj.status || '').toLowerCase();
              const isActive = st === 'live' || st === 'active';
              const isToggling = togglingId === proj.id;

              return (
                <div
                  key={proj.id}
                  className="agent-row"
                  style={{ borderColor: proj.id === selectedProjectId ? 'rgba(99,102,241,0.25)' : undefined }}
                  onClick={() => onProjectSelect(proj.id)}
                >
                  {/* Agent Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      🤖
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proj.name}
                        </div>
                        {proj.id === selectedProjectId && (
                          <span style={{ fontSize: 10, color: '#818cf8', fontWeight: 600 }}>● ACTIVE</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                        <span className="badge badge-sky" style={{ fontSize: 9 }}>{proj.domain.toUpperCase()}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono' }}>
                          ID: {proj.id.substring(0, 12)}…
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Toggles */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {isToggling ? (
                      <div className="spinner" />
                    ) : (
                      <div className="status-toggles" style={{ padding: 3, gap: 3 }}>
                        {(['Live', 'Paused', 'Draft'] as AgentStatus[]).map((s) => {
                          const isCurrent = proj.status === s || (s === 'Live' && (st === 'live' || st === 'active'));
                          return (
                            <button
                              key={s}
                              className={`status-toggle ${isCurrent ? `active-${s.toLowerCase()}` : ''}`}
                              style={{ padding: '4px 10px', fontSize: 10 }}
                              onClick={() => handleStatusToggle(proj.id, s)}
                              disabled={isCurrent}
                            >
                              {s === 'Live' ? '🟢' : s === 'Paused' ? '🟡' : '⚪'} {s}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
