import React, { useState } from 'react';
import { Sparkles, Zap, FolderPlus, Bot, CheckCircle2, PauseCircle, FileEdit, ArrowRight, Layers, Sliders, BookOpen, PlaySquare } from 'lucide-react';
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
  { value: 'banking', label: '🏦 Retail & Commercial Banking', desc: 'Account inquiries, loan EMI, card management' },
  { value: 'finance', label: '📈 Wealth Management & Advisory', desc: 'Mutual funds, portfolios, investment advice' },
  { value: 'insurance', label: '🛡️ Insurance Claims & Policies', desc: 'Policy renewal, claims, health & motor coverage' },
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
  // Tab switcher: Projects Management vs Agents Management
  const [activeTab, setActiveTab] = useState<'projects' | 'agents'>('projects');

  // New Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectDomain, setProjectDomain] = useState<Domain>('banking');
  const [projectStatus, setProjectStatus] = useState<AgentStatus>('Live');
  const [creatingProject, setCreatingProject] = useState(false);

  // Status Toggling State
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Active (Live) Project Count vs Paused/Draft
  const liveProjects = projects.filter((p) => ['live', 'active'].includes((p.status || '').toLowerCase()));
  const pausedProjects = projects.filter((p) => (p.status || '').toLowerCase() === 'paused');
  const draftProjects = projects.filter((p) => (p.status || '').toLowerCase() === 'draft');

  // Free tier quota limit is 1 active project
  const isActiveLimitReached = liveProjects.length >= 1;

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Handle Project Creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !projectName.trim()) return;

    // If attempting to create directly as Live when active quota is already reached:
    if (projectStatus === 'Live' && isActiveLimitReached) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal();
      } else if (onNavigateBilling) {
        onNavigateBilling();
      } else {
        onMessage('Active project limit reached (1/1 Live). You can create it as Paused/Draft or upgrade your plan.', 'warn');
      }
      return;
    }

    setCreatingProject(true);
    try {
      const created = await adminApi.createProject(
        selectedOrgId,
        projectName.trim(),
        projectDomain,
        projectDomain,
        projectStatus
      );
      setProjectName('');
      onProjectsUpdate(selectedOrgId);
      onProjectSelect(created.id);
      onMessage(`✅ Project "${created.name}" created successfully as ${projectStatus}!`, 'success');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const isLimit =
        status === 402 ||
        detail?.error === 'plan_limit_reached' ||
        (typeof detail === 'string' && detail.toLowerCase().includes('limit')) ||
        (typeof detail?.message === 'string' && detail.message.toLowerCase().includes('limit'));

      if (isLimit) {
        if (onOpenUpgradeModal) onOpenUpgradeModal();
        else if (onNavigateBilling) onNavigateBilling();
        else onMessage('Plan active project limit reached. Upgrade to Pro for 5 active projects.', 'warn');
      } else {
        const errorText = typeof detail === 'string' ? detail : detail?.message || 'Failed to create project';
        onMessage(errorText, 'error');
      }
    } finally {
      setCreatingProject(false);
    }
  };

  // Handle Project / Agent Status Toggle
  const handleStatusToggle = async (projId: string, nextStatus: AgentStatus) => {
    // If activating to Live while already at active limit:
    if (nextStatus === 'Live' && isActiveLimitReached) {
      const target = projects.find((p) => p.id === projId);
      const isAlreadyLive = target && ['live', 'active'].includes((target.status || '').toLowerCase());
      if (!isAlreadyLive) {
        if (onOpenUpgradeModal) {
          onOpenUpgradeModal();
        } else if (onNavigateBilling) {
          onNavigateBilling();
        } else {
          onMessage('Active project quota reached (1/1 Live). Pause your other project first or upgrade to Pro.', 'warn');
        }
        return;
      }
    }

    setTogglingId(projId);
    try {
      await adminApi.updateProjectStatus(projId, nextStatus);
      onProjectsUpdate(selectedOrgId);
      onMessage(`✅ Status updated to ${nextStatus}`, 'success');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const isLimit =
        status === 402 ||
        detail?.error === 'plan_limit_reached' ||
        (typeof detail === 'string' && detail.toLowerCase().includes('limit'));

      if (isLimit) {
        if (onOpenUpgradeModal) onOpenUpgradeModal();
        else if (onNavigateBilling) onNavigateBilling();
      } else {
        const errorText = typeof detail === 'string' ? detail : detail?.message || 'Failed to update status';
        onMessage(errorText, 'error');
      }
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Section Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Projects & Intelligent Agents</div>
          <div className="section-subtitle">
            Organization ➔ Multiple Projects ➔ Intelligent Agent Personas with Lifecycle Control
          </div>
        </div>

        {/* Tab Switcher & Live Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: 10,
              padding: 3,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: 'none',
                background: activeTab === 'projects' ? '#6366f1' : 'transparent',
                color: activeTab === 'projects' ? '#ffffff' : 'var(--color-text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              <FolderPlus size={14} /> Projects ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agents')}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: 'none',
                background: activeTab === 'agents' ? '#6366f1' : 'transparent',
                color: activeTab === 'agents' ? '#ffffff' : 'var(--color-text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              <Bot size={14} /> Agents ({projects.length})
            </button>
          </div>

          <div className="badge badge-emerald">
            {liveProjects.length} Active / 1 Free Quota
          </div>
        </div>
      </div>

      {/* Quota Notice Banner when Active Limit is reached */}
      {isActiveLimitReached && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 12,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Zap size={20} color="#818cf8" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Active Quota Limit Reached ({liveProjects.length}/1 Live Project on Free Tier)
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                💡 <strong>Pause-to-Swap Enabled:</strong> You can pause any active project and activate another, or create new projects in <em>Draft</em> / <em>Paused</em> mode for free.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => onOpenUpgradeModal ? onOpenUpgradeModal() : onNavigateBilling ? onNavigateBilling() : null}
          >
            <Sparkles size={13} /> Upgrade to Pro (5 Active)
          </button>
        </div>
      )}

      {/* TAB 1: PROJECTS MANAGEMENT */}
      {activeTab === 'projects' && (
        <div className="grid-2">
          {/* Create Project Form */}
          <div className="card" style={{ borderColor: 'rgba(99,102,241,0.25)' }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📁</span> Create New Project
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Under organization:{' '}
                <strong style={{ color: 'var(--color-text-accent)' }}>
                  {selectedOrg?.name || 'Current Organization'}
                </strong>
              </div>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Retail Banking Suite or Wealth Desk"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">BFSI Domain Specialization</label>
                <select
                  className="form-select"
                  value={projectDomain}
                  onChange={(e) => setProjectDomain(e.target.value as Domain)}
                >
                  {DOMAINS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {DOMAINS.find(d => d.value === projectDomain)?.desc}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Lifecycle Status</label>
                <div className="status-toggles">
                  {(['Live', 'Paused', 'Draft'] as AgentStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`status-toggle ${projectStatus === s ? `active-${s.toLowerCase()}` : ''}`}
                      onClick={() => setProjectStatus(s)}
                    >
                      {s === 'Live' ? '🟢' : s === 'Paused' ? '🟡' : '⚪'} {s}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {projectStatus === 'Live' && (isActiveLimitReached ? '⚠️ Active limit full — creating Live will prompt upgrade' : 'Project is live and ready for production queries')}
                  {projectStatus === 'Paused' && 'Project is paused (does not consume Free tier active quota)'}
                  {projectStatus === 'Draft' && 'Project in development (does not consume Free tier active quota)'}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={creatingProject || !selectedOrgId}
              >
                {creatingProject ? (
                  <><div className="spinner" /> Creating Project…</>
                ) : projectStatus === 'Live' && isActiveLimitReached ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Sparkles size={15} /> Upgrade Plan to Deploy Live Project
                  </span>
                ) : (
                  '📁 Create Project'
                )}
              </button>
            </form>
          </div>

          {/* Projects List & Selection */}
          <div className="card">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Organization Projects ({projects.length})
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Click to select project and configure its agents
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="badge badge-emerald">{liveProjects.length} Live</span>
                <span className="badge badge-amber">{pausedProjects.length} Paused</span>
                <span className="badge badge-draft">{draftProjects.length} Draft</span>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <div className="empty-state-title">No projects created yet</div>
                <div className="empty-state-desc">Create your first project under {selectedOrg?.name || 'this organization'} using the form.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projects.map((proj) => {
                  const isSelected = proj.id === selectedProjectId;
                  const st = (proj.status || '').toLowerCase();
                  const isLive = st === 'live' || st === 'active';
                  const isToggling = togglingId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => onProjectSelect(proj.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>📁</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {proj.name}
                              {isSelected && (
                                <span style={{ fontSize: 10, color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                                  SELECTED
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                              <span className="badge badge-sky" style={{ fontSize: 9 }}>{proj.domain.toUpperCase()}</span>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono' }}>
                                ID: {proj.id.substring(0, 8)}…
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          {isToggling ? (
                            <div className="spinner" />
                          ) : (
                            <div className="status-toggles" style={{ padding: 3, gap: 2 }}>
                              {(['Live', 'Paused', 'Draft'] as AgentStatus[]).map((s) => {
                                const isCurrent = proj.status === s || (s === 'Live' && isLive);
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    className={`status-toggle ${isCurrent ? `active-${s.toLowerCase()}` : ''}`}
                                    style={{ padding: '3px 8px', fontSize: 10 }}
                                    onClick={() => handleStatusToggle(proj.id, s)}
                                    disabled={isCurrent}
                                    title={`Set project to ${s}`}
                                  >
                                    {s === 'Live' ? '🟢' : s === 'Paused' ? '🟡' : '⚪'} {s}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick link to agents */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: 11, gap: 6 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectSelect(proj.id);
                            setActiveTab('agents');
                          }}
                        >
                          Manage Project Agents <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AGENTS UNDER SELECTED PROJECT */}
      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Active Project Context Header */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 12,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>📁</span>
              <div>
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, textTransform: 'uppercase' }}>
                  Managing Agents for Project:
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {selectedProject?.name || 'No project selected'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('projects')}
                style={{ fontSize: 11 }}
              >
                Switch Project
              </button>
            </div>
          </div>

          {/* Configured Agent Profile Card */}
          {selectedProject ? (
            <div className="card" style={{ borderColor: 'rgba(99, 102, 241, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(16,185,129,0.2) 100%)',
                      border: '1px solid rgba(99,102,241,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    🤖
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {selectedProject.name} Agent Persona
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Domain: <strong style={{ color: 'var(--color-text-accent)' }}>{selectedProject.domain.toUpperCase()}</strong> • Mode: {selectedProject.status}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={selectedProject.status} />
                  <div className="status-toggles" style={{ padding: 3 }}>
                    {(['Live', 'Paused', 'Draft'] as AgentStatus[]).map((s) => {
                      const isCurrent = selectedProject.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`status-toggle ${isCurrent ? `active-${s.toLowerCase()}` : ''}`}
                          style={{ padding: '4px 10px', fontSize: 10 }}
                          onClick={() => handleStatusToggle(selectedProject.id, s)}
                          disabled={isCurrent}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Agent Quick Actions Toolbar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Sliders size={14} color="#6366f1" /> Prompt & Guardrails
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Tune LLM temperature, system prompt, and financial compliance rules in Intelligence tab.
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <BookOpen size={14} color="#10b981" /> RAG Knowledge Base
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Attach domain policy documents, brochures, and rate charts for grounded responses.
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <PlaySquare size={14} color="#0ea5e9" /> Live Playground
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Simulate real customer inquiries, verify tool executions, and audit LLM outputs.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🤖</div>
              <div className="empty-state-title">No project selected</div>
              <div className="empty-state-desc">Select or create a project from the Projects tab to inspect and configure its intelligent agents.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

