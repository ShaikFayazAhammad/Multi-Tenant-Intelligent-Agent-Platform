import React from 'react';
import { Building, Bot, Activity, LogOut, ChevronRight } from 'lucide-react';
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
          <div className="context-select-label">
            <Building size={11} style={{ display: 'inline', marginRight: 4, opacity: 0.7 }} />
            Organization
          </div>
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

        <div className="context-separator" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={14} />
        </div>

        <div className="context-select-wrapper">
          <div className="context-select-label">
            <Bot size={11} style={{ display: 'inline', marginRight: 4, opacity: 0.7 }} />
            Active Agent / Project
          </div>
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
