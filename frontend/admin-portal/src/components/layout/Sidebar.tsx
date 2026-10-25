import React from 'react';
import {
  LayoutDashboard,
  Workflow,
  Building2,
  Bot,
  Sparkles,
  BookOpen,
  KeyRound,
  PlaySquare,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { NavItem } from '../../types';

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (item: NavItem) => void;
}

const navItems: {
  id: NavItem;
  icon: LucideIcon;
  label: string;
  section?: string;
  badge?: string;
}[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'OVERVIEW' },
  { id: 'visual-builder', icon: Workflow, label: 'Visual Builder', section: 'WORKFLOW STUDIO', badge: 'PRO' },
  { id: 'organizations', icon: Building2, label: 'Orgs & Credentials', section: 'MANAGEMENT' },
  { id: 'agents', icon: Bot, label: 'Projects & Agents' },
  { id: 'prompt-config', icon: Sparkles, label: 'Configure Prompt', section: 'INTELLIGENCE' },
  { id: 'knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { id: 'api-vault', icon: KeyRound, label: 'API Vault' },
  { id: 'playground', icon: PlaySquare, label: 'Playground', section: 'TESTING' },
];

export default function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <ShieldCheck size={22} color="#ffffff" strokeWidth={2.2} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title-row">
            <h1>BFSI Platform</h1>
            <span className="sidebar-badge">v2.2</span>
          </div>
          <p>Multi-Tenant Agent Console</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <React.Fragment key={item.id}>
              {item.section && (
                <div className="sidebar-section-label">{item.section}</div>
              )}
              <button
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavChange(item.id)}
                title={collapsed ? item.label : undefined}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <span className="nav-icon">
                  <Icon size={18} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.badge && !collapsed && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer - Collapse Toggle & Super Admin Profile */}
      <div className="sidebar-footer">
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', display: collapsed ? 'none' : 'inline' }}>
            Collapse Sidebar
          </span>
        </button>

        <div className="sidebar-user" title="Super Admin Account">
          <div className="sidebar-avatar">
            SA
            <span className="sidebar-avatar-status" />
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Super Admin</div>
            <div className="sidebar-user-role">admin@bfsi.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
