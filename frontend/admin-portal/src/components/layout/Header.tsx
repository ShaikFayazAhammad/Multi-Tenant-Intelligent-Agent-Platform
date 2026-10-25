import React from 'react';
import { Building, Bot, Activity, LogOut, ChevronRight, ChevronDown, ShieldCheck } from 'lucide-react';
import type { Organization, Project } from '../../types';

interface HeaderProps {
  orgs: Organization[];
  selectedOrgId: string;
  onOrgChange: (id: string) => void;
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  onSignOut: () => void;
  isSuperAdmin?: boolean;   // true = platform admin (can switch orgs), false = tenant admin (locked to 1 org)
}

function getStatusClass(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'live' || s === 'active') return 'live';
  if (s === 'paused') return 'paused';
  return 'draft';
}

function getStatusLabel(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'live' || s === 'active') return 'Live';
  if (s === 'paused') return 'Paused';
  return 'Draft';
}

export default function Header({
  orgs, selectedOrgId, onOrgChange,
  projects, selectedProjectId, onProjectChange,
  onSignOut,
  isSuperAdmin = false,
}: HeaderProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const statusClass = getStatusClass(selectedProject?.status);

  return (
    <header className="top-header">
      {/* Context Selectors */}
      <div className="header-selectors">

        {/* Organization — dropdown for super admin, badge for tenant admin */}
        <div className="context-select-wrapper">
          <div className="context-select-label">
            <Building size={11} style={{ display: 'inline', marginRight: 4, opacity: 0.7 }} />
            Organization
          </div>

          {isSuperAdmin ? (
            /* Platform Super Admin — switchable dropdown */
            <select
              className="context-select"
              value={selectedOrgId}
              onChange={(e) => onOrgChange(e.target.value)}
            >
              {orgs.length === 0 && <option value="">No orgs</option>}
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          ) : (
            /* Tenant Admin — locked to their own org, show as a readonly badge */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 12px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                maxWidth: 220,
                textOverflow: 'ellipsis',
              }}
              title={selectedOrg?.name}
            >
              <ShieldCheck size={13} color="#818cf8" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOrg?.name || 'Your Organization'}
              </span>
              <span
                style={{
                  fontSize: 9,
                  background: 'rgba(99,102,241,0.18)',
                  color: '#818cf8',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  flexShrink: 0,
                }}
              >
                YOUR ORG
              </span>
            </div>
          )}
        </div>

        <div className="context-separator" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={14} />
        </div>

        {/* Project selector — available for all roles */}
        <div className="context-select-wrapper">
          <div className="context-select-label">
            <Bot size={11} style={{ display: 'inline', marginRight: 4, opacity: 0.7 }} />
            Active Project
          </div>
          <select
            className="context-select"
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
          >
            {projects.length === 0 && <option value="">No projects yet</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.domain.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Actions */}
      <div className="header-actions">
        {selectedProject && (
          <div className={`status-indicator ${statusClass}`}>
            <span className={`status-dot ${statusClass === 'live' ? 'pulse' : ''}`} />
            {getStatusLabel(selectedProject.status)}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '4px 10px',
          borderRadius: 6,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <Activity size={12} color="#10b981" />
          <span>OpenRouter 99.9%</span>
        </div>

        <button className="btn-signout" onClick={onSignOut} title="Sign Out">
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
