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
import VisualBuilderView from './views/VisualBuilderView';
import BillingView from './views/BillingView';
import UpgradePlanModal from './components/modals/UpgradePlanModal';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// --- Toast Types ---
type ToastType = 'success' | 'error' | 'info' | 'warn';
interface Toast { id: number; message: string; type: ToastType; }

// --- Toast Component ---
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 420,
      width: 'calc(100vw - 48px)',
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const Icon = t.type === 'success'
          ? CheckCircle2
          : t.type === 'error'
          ? AlertCircle
          : t.type === 'warn'
          ? AlertTriangle
          : Info;

        const borderColor = t.type === 'success'
          ? 'rgba(16, 185, 129, 0.4)'
          : t.type === 'error'
          ? 'rgba(244, 63, 94, 0.4)'
          : t.type === 'warn'
          ? 'rgba(245, 158, 11, 0.4)'
          : 'rgba(99, 102, 241, 0.4)';

        const progressBg = t.type === 'success'
          ? '#10b981'
          : t.type === 'error'
          ? '#f43f5e'
          : t.type === 'warn'
          ? '#f59e0b'
          : '#6366f1';

        return (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(17, 22, 37, 0.95)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0,0,0,0.3)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
            onClick={() => onRemove(t.id)}
          >
            <Icon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.45, color: '#f8fafc' }}>
              {t.message}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(t.id); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 2,
                background: progressBg,
                width: '100%',
                animation: 'toast-timer 5s linear forwards',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// --- Login Screen ---
function LoginScreen({ onLogin }: { onLogin: (token: string, user?: any) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('admin@bfsi.com');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (mode === 'signin') {
        const data = await adminApi.login(email.trim(), password);
        localStorage.setItem('bfsi_admin_token', data.access_token);
        if ((data as any).user) {
          localStorage.setItem('bfsi_admin_user', JSON.stringify((data as any).user));
        }
        onLogin(data.access_token, (data as any).user);
      } else {
        // Create new isolated tenant organization on Free Tier
        const data = await adminApi.signup({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          org_name: orgName.trim() || `${fullName.trim()}'s Org`,
          role: 'super_admin',
        });
        localStorage.setItem('bfsi_admin_token', data.access_token);
        if ((data as any).user) {
          localStorage.setItem('bfsi_admin_user', JSON.stringify((data as any).user));
        }
        setSuccessMsg(`Welcome, ${fullName.trim()}! Free tier workspace provisioned.`);
        setTimeout(() => {
          onLogin(data.access_token, (data as any).user);
        }, 600);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          (mode === 'signin'
            ? 'Invalid credentials. Please try again.'
            : 'Failed to create account. Email may already exist.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 58,
              height: 58,
              margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #0ea5e9 100%)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 900,
              color: 'white',
              boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
            }}
          >
            AI
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: -0.5 }}>
            BFSI Admin Portal
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Multi-Tenant Intelligent Agent Platform
          </p>
        </div>

        {/* Tab switcher: Sign In vs Create Login */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setEmail('admin@bfsi.com');
              setPassword('admin123');
              setError('');
              setSuccessMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'signin' ? '#6366f1' : 'transparent',
              color: mode === 'signin' ? '#ffffff' : 'var(--color-text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setEmail('');
              setPassword('');
              setFullName('');
              setOrgName('');
              setError('');
              setSuccessMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'signup' ? '#6366f1' : 'transparent',
              color: mode === 'signup' ? '#ffffff' : 'var(--color-text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Create Login / Register
          </button>
        </div>

        {/* Error / Success Toast */}
        {error && (
          <div className="toast toast-error" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div className="toast toast-success" style={{ marginBottom: 18 }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Organization / Company Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Acme Financial Services"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">{mode === 'signup' ? 'Work Email' : 'Admin Email'}</label>
            <input
              className="form-input"
              type="email"
              value={email}
              placeholder={mode === 'signup' ? 'admin@company.com' : 'admin@bfsi.com'}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {mode === 'signup' && (
            <div
              style={{
                fontSize: 11,
                color: '#818cf8',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                padding: '8px 12px',
                borderRadius: 8,
              }}
            >
              ✨ <strong>Free Tier Included:</strong> Fresh isolated organization with 1 Active Project, 1 Agent config, 5 Knowledge docs, and 500 conversations/mo.
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? (
              <>
                <div className="spinner" /> {mode === 'signin' ? 'Authenticating…' : 'Creating Free Workspace…'}
              </>
            ) : mode === 'signin' ? (
              'Sign In to Dashboard'
            ) : (
              'Create Free Workspace & Continue'
            )}
          </button>
        </form>

        {mode === 'signin' && (
          <>
            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Quick Demo Login:</div>
              {[
                { label: 'Super Admin', email: 'admin@bfsi.com', pass: 'admin123', color: '#6366f1' },
                { label: 'Lead Operator', email: 'lead@bfsi.com', pass: 'lead123', color: '#10b981' },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.pass);
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>Fill:</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{u.label}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {u.email}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bfsi_admin_token'));
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('bfsi_admin_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');

  // Global data
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Toast & Modals
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const toastCounter = React.useRef(0);

  const addToast = useCallback((message: any, type: ToastType = 'info') => {
    let msgStr = '';
    if (typeof message === 'string') {
      msgStr = message;
    } else if (message && typeof message === 'object') {
      msgStr = message.message || message.detail || JSON.stringify(message);
    } else {
      msgStr = String(message || '');
    }
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message: msgStr, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleMessage = useCallback((msg: any, type?: ToastType) => {
    const isLimit =
      (typeof msg === 'object' && (msg?.error === 'plan_limit_reached' || msg?.detail?.error === 'plan_limit_reached')) ||
      (typeof msg === 'string' && (msg.toLowerCase().includes('limit reached') || msg.toLowerCase().includes('upgrade to add more') || msg.toLowerCase().includes('plan limit')));

    if (isLimit) {
      setUpgradeModalOpen(true);
      return;
    }
    addToast(msg, type || 'info');
  }, [addToast]);

  // Load orgs on login or token refresh
  const loadOrgs = useCallback(async () => {
    try {
      const data = await adminApi.getOrgs();
      setOrgs(data);
      if (data.length > 0) {
        setSelectedOrgId((prev) => (data.some((o) => o.id === prev) ? prev : data[0].id));
      } else {
        setSelectedOrgId('');
        setProjects([]);
        setSelectedProjectId('');
      }
    } catch { }
  }, []);

  // Load projects when org changes
  const loadProjects = useCallback(async (orgId: string) => {
    if (!orgId) {
      setProjects([]);
      setSelectedProjectId('');
      return;
    }
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
    } catch {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, []);

  const handleLogin = (newToken: string, user?: any) => {
    setToken(newToken);
    if (user) {
      setCurrentUser(user);
    }
    adminApi.getMe()
      .then((u) => {
        setCurrentUser(u);
        localStorage.setItem('bfsi_admin_user', JSON.stringify(u));
      })
      .catch(() => {});
  };

  const handleSignOut = () => {
    localStorage.removeItem('bfsi_admin_token');
    localStorage.removeItem('bfsi_admin_user');
    setToken(null);
    setCurrentUser(null);
    setOrgs([]);
    setSelectedOrgId('');
    setProjects([]);
    setSelectedProjectId('');
  };

  useEffect(() => {
    if (token) {
      adminApi.getMe()
        .then((u) => {
          setCurrentUser(u);
          localStorage.setItem('bfsi_admin_user', JSON.stringify(u));
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            handleSignOut();
          }
        });
      loadOrgs();
    }
  }, [token, loadOrgs]);

  useEffect(() => {
    if (selectedOrgId) {
      loadProjects(selectedOrgId);
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedOrgId, loadProjects]);

  const handleOrgChange = (id: string) => {
    setSelectedOrgId(id);
    setProjects([]);
    setSelectedProjectId('');
  };

  // Not logged in → show Login
  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
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
      case 'visual-builder':
        return (
          <VisualBuilderView
            orgs={orgs}
            selectedOrgId={selectedOrgId}
            onOrgChange={handleOrgChange}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
            onOrgsUpdate={loadOrgs}
            onProjectsUpdate={loadProjects}
            onMessage={handleMessage}
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
            onNavigateBilling={() => setActiveNav('billing')}
            onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
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
      case 'billing':
        return (
          <BillingView
            orgs={orgs}
            selectedOrgId={selectedOrgId}
            onOrgChange={handleOrgChange}
            onMessage={handleMessage}
            currentUser={currentUser}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="app-layout">
        {/* Left Sidebar with dynamic current user */}
        <Sidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
          currentUser={currentUser}
        />

        {/* Main Workspace */}
        <div className="main-workspace">
          {/* Top Header - hide for visual builder (it has its own toolbar) */}
          {activeNav !== 'visual-builder' && (
            <Header
              orgs={orgs}
              selectedOrgId={selectedOrgId}
              onOrgChange={handleOrgChange}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              onSignOut={handleSignOut}
            />
          )}

          {/* Content — visual builder fills the full area without padding */}
          {activeNav === 'visual-builder' ? (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {renderContent()}
            </div>
          ) : (
            <div className="content-area">
              {renderContent()}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onSelectPlan={(plan) => {
          setUpgradeModalOpen(false);
          setActiveNav('billing');
        }}
        currentCount={projects.length}
        limitCount={1}
      />
    </>
  );
}
