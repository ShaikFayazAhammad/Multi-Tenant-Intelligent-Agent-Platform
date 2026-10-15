import React from 'react';
import type { Organization, Project } from '../../types';

interface HeaderProps {
  orgs: Organization[];
  selectedOrgId: string;
  onOrgChange: (id: string) => void;
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  onSignOut: () => void;
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
}: HeaderProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const statusClass = getStatusClass(selectedProject?.status);

  return (
    <header className="top-header">
      {/* Context Selectors */}
      <div className="header-selectors">
        <div className="context-select-wrapper">
          <div className="context-select-label">Organization</div>
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
        </div>

        <div className="context-separator">›</div>

        <div className="context-select-wrapper">
          <div className="context-select-label">Active Agent / Project</div>
          <select
            className="context-select"
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
          >
            {projects.length === 0 && <option value="">No agents yet</option>}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />
          OpenRouter LLM
        </div>

        <button className="btn-signout" onClick={onSignOut}>
          <span>⏻</span> Sign Out
        </button>
      </div>
    </header>
  );
}
