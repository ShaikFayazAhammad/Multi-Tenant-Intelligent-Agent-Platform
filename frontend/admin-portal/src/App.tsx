import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import { adminApi } from './services/api';
import type { Organization, Project, NavItem } from './types';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardView from './views/DashboardView';
import OrganizationsView from './views/OrganizationsView';
import AgentsView from './views/AgentsView';
import PromptConfigView from './views/PromptConfigView';
import KnowledgeBaseView from './views/KnowledgeBaseView';
import ApiVaultView from './views/ApiVaultView';
import PlaygroundView from './views/PlaygroundView';

// --- Toast Types ---
type ToastType = 'success' | 'error' | 'info' | 'warn';
interface Toast { id: number; message: string; type: ToastType; }

// --- Toast Component ---
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} style={{ cursor: 'pointer' }} onClick={() => onRemove(t.id)}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>✕</span>
        </div>
      ))}
    </div>
  );
}

// --- Login Screen ---
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@bfsi.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.login(email, password);
      localStorage.setItem('bfsi_admin_token', data.access_token);
      onLogin(data.access_token);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #0ea5e9 100%)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: 'white', boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
          }}>AI</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: -0.5 }}>
            BFSI Admin Portal
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Multi-Tenant Intelligent Agent Platform
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="toast toast-error" style={{ marginBottom: 20 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Super Admin Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><div className="spinner" /> Authenticating…</> : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Super Admin', email: 'admin@bfsi.com', pass: 'admin123', color: '#6366f1' },
            { label: 'Lead Operator', email: 'lead@bfsi.com', pass: 'lead123', color: '#10b981' },
          ].map((u) => (
            <button
              key={u.email}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', gap: 10 }}
              onClick={() => { setEmail(u.email); setPassword(u.pass); }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Fill:</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{u.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--color-text-muted)' }}>{u.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bfsi_admin_token'));
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');

  // Global data
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = React.useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleMessage = useCallback((msg: string, type?: 'success' | 'error') => {
    addToast(msg, type || 'info');
  }, [addToast]);

  // Load orgs on login
  const loadOrgs = useCallback(async () => {
    try {
      const data = await adminApi.getOrgs();
      setOrgs(data);
      if (data.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data[0].id);
      }
    } catch { }
  }, [selectedOrgId]);

  // Load projects when org changes
  const loadProjects = useCallback(async (orgId: string) => {
    if (!orgId) return;
    try {
      const data = await adminApi.getProjects(orgId);
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId((prev) =>
          data.some((p) => p.id === prev) ? prev : data[0].id
        );
      } else {
        setSelectedProjectId('');
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (token) { loadOrgs(); }
  }, [token]);

  useEffect(() => {
    if (selectedOrgId) loadProjects(selectedOrgId);
  }, [selectedOrgId]);

  const handleOrgChange = (id: string) => {
    setSelectedOrgId(id);
    setProjects([]);
    setSelectedProjectId('');
  };

  const handleSignOut = () => {
    localStorage.removeItem('bfsi_admin_token');
    setToken(null);
    setOrgs([]);
    setProjects([]);
  };

  // Not logged in → show Login
  if (!token) {
    return <LoginScreen onLogin={setToken} />;
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Content renderer
  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        return (
          <DashboardView
            orgs={orgs}
            projects={projects}
            selectedProjectId={selectedProjectId}
          />
        );
      case 'organizations':
        return (
          <OrganizationsView
            orgs={orgs}
            selectedOrgId={selectedOrgId}
            onOrgsUpdate={loadOrgs}
            onMessage={handleMessage}
          />
        );
      case 'agents':
        return (
          <AgentsView
            orgs={orgs}
            selectedOrgId={selectedOrgId}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
            onProjectsUpdate={loadProjects}
            onMessage={handleMessage}
          />
        );
      case 'prompt-config':
        return (
          <PromptConfigView
            selectedProject={selectedProject}
            onMessage={handleMessage}
          />
        );
      case 'knowledge-base':
        return (
          <KnowledgeBaseView
            selectedProject={selectedProject}
            onMessage={handleMessage}
          />
        );
      case 'api-vault':
        return (
          <ApiVaultView
            selectedProject={selectedProject}
            onMessage={handleMessage}
          />
        );
      case 'playground':
        return (
          <PlaygroundView
            selectedProject={selectedProject}
            onMessage={handleMessage}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="app-layout">
        {/* Left Sidebar */}
        <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

        {/* Main Workspace */}
        <div className="main-workspace">
          {/* Top Header */}
          <Header
            orgs={orgs}
            selectedOrgId={selectedOrgId}
            onOrgChange={handleOrgChange}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            onSignOut={handleSignOut}
          />

          {/* Content */}
          <div className="content-area">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
