import React from 'react';
import type { NavItem } from '../../types';

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (item: NavItem) => void;
}

const navItems: { id: NavItem; icon: string; label: string; section?: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard', section: 'OVERVIEW' },
  { id: 'visual-builder', icon: '🧩', label: 'Visual Builder', section: 'WORKFLOW STUDIO' },
  { id: 'organizations', icon: '🏢', label: 'Orgs & Credentials', section: 'MANAGEMENT' },
  { id: 'agents', icon: '🤖', label: 'Projects & Agents' },
  { id: 'prompt-config', icon: '✍️', label: 'Configure Prompt', section: 'CONFIGURATION' },
  { id: 'knowledge-base', icon: '📚', label: 'Knowledge Base' },
  { id: 'api-vault', icon: '🔐', label: 'API Vault' },
  { id: 'playground', icon: '🎮', label: 'Playground', section: 'TESTING' },
];

export default function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">AI</div>
        <div className="sidebar-logo-text">
          <h1>BFSI Platform</h1>
          <p>Super Admin Console</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <React.Fragment key={item.id}>
            {item.section && (
              <div className="sidebar-section-label">{item.section}</div>
            )}
            <button
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => onNavChange(item.id)}
              title={collapsed ? item.label : undefined}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <span className="nav-icon" style={{ fontSize: 16 }}>{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* Footer - Collapse Toggle & User */}
      <div className="sidebar-footer">
        <button
          className="nav-item"
          onClick={() => setCollapsed((c) => !c)}
          style={{ width: '100%', textAlign: 'left', marginBottom: 8 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="nav-icon" style={{ fontSize: 14 }}>
            {collapsed ? '→' : '←'}
          </span>
          <span className="nav-label" style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            Collapse
          </span>
        </button>

        <div className="sidebar-user">
          <div className="sidebar-avatar">SA</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Super Admin</div>
            <div className="sidebar-user-role">admin@bfsi.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
