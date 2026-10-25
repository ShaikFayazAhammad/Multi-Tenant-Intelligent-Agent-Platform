import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { ApiIntegration, Project, CurlParseResult, ToolAssignment } from '../types';

interface ApiVaultViewProps {
  selectedProject: Project | undefined;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

type ActiveTab = 'manual' | 'curl' | 'marketplace' | 'assignments';

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'rgba(99,102,241,0.15)', rose: 'rgba(244,63,94,0.15)',
    emerald: 'rgba(16,185,129,0.15)', amber: 'rgba(251,191,36,0.15)',
    sky: 'rgba(14,165,233,0.15)', violet: 'rgba(139,92,246,0.15)',
    slate: 'rgba(148,163,184,0.1)',
  };
  const textColors: Record<string, string> = {
    indigo: '#a5b4fc', rose: '#fb7185', emerald: '#34d399',
    amber: '#fbbf24', sky: '#38bdf8', violet: '#c4b5fd', slate: '#94a3b8',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
      background: colors[color] || colors.indigo,
      color: textColors[color] || textColors.indigo,
      border: `1px solid ${textColors[color] || textColors.indigo}30`,
    }}>
      {children}
    </span>
  );
}

// ─── cURL Import Panel ─────────────────────────────────────────────────────────

function CurlImportPanel({
  projectId, onParsed, onMessage,
}: {
  projectId: string;
  onParsed: (result: CurlParseResult, secret: string) => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [curlText, setCurlText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<CurlParseResult | null>(null);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const handleParse = async () => {
    if (!curlText.trim()) return;
    setParsing(true);
    try {
      const result = await adminApi.parseCurl(curlText.trim());
      setParsed(result);
      if (result.auth_value_present) {
        onMessage(`🔍 Parsed — ${result.auth_type.toUpperCase()} auth detected. Paste your secret below to encrypt it.`, 'success');
      } else {
        onMessage(`🔍 Parsed — ${result.method} ${result.url}`, 'success');
      }
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to parse cURL command', 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleUseParsed = () => {
    if (parsed) onParsed(parsed, secret);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
        Paste any <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>curl</code> command below.
        Auth credentials are <strong style={{ color: '#fb7185' }}>redacted</strong> from the response — only the auth type is detected. Paste your secret separately for Fernet encryption.
      </div>

      <textarea
        className="form-input"
        style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, minHeight: 120, resize: 'vertical', lineHeight: 1.8 }}
        placeholder={`curl -X POST 'https://api.example.com/v1/accounts/balance' \\
  -H 'Authorization: Bearer sk-your-token-here' \\
  -H 'Content-Type: application/json' \\
  -d '{"account_id": "ACC123"}'`}
        value={curlText}
        onChange={(e) => { setCurlText(e.target.value); setParsed(null); }}
      />

      <button
        className="btn"
        style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: 'white' }}
        disabled={!curlText.trim() || parsing}
        onClick={handleParse}
      >
        {parsing ? <><div className="spinner" /> Parsing…</> : '🔍 Parse cURL'}
      </button>

      {parsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>
            ✅ Parse Result
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
            {[
              { label: 'Method', value: <Badge color="sky">{parsed.method}</Badge> },
              { label: 'Auth Type', value: <Badge color={parsed.auth_type === 'none' ? 'slate' : 'rose'}>{parsed.auth_type.toUpperCase()}</Badge> },
              { label: 'Base URL', value: <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>{parsed.base_url}</span> },
              { label: 'Path', value: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{parsed.path}</span> },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                <div>{value}</div>
              </div>
            ))}
          </div>

          {Object.keys(parsed.query_params).length > 0 && (
            <div style={{ fontSize: 11 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Query Params</div>
              <code style={{ fontSize: 10, background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 6, display: 'block' }}>
                {JSON.stringify(parsed.query_params, null, 2)}
              </code>
            </div>
          )}

          {parsed.body_raw && (
            <div style={{ fontSize: 11 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Request Body</div>
              <code style={{ fontSize: 10, background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 6, display: 'block', whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto' }}>
                {parsed.body_raw}
              </code>
            </div>
          )}

          {parsed.auth_value_present && (
            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label">
                🔐 Secret / Token — <span style={{ color: '#fb7185' }}>will be Fernet encrypted at rest</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showSecret ? 'text' : 'password'}
                  placeholder={`Your ${parsed.auth_type} credential (detected from cURL)`}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowSecret(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                  {showSecret ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <button
            className="btn"
            style={{ background: 'linear-gradient(135deg,#be185d,#f43f5e)', color: 'white', marginTop: 4 }}
            onClick={handleUseParsed}
          >
            ✨ Use Parsed Values → Fill Registration Form
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tool Assignments Panel ────────────────────────────────────────────────────

function ToolAssignmentsPanel({
  projectId, integrations, onMessage, onRefresh,
}: {
  projectId: string;
  integrations: ApiIntegration[];
  onMessage: (msg: string, type?: 'success' | 'error') => void;
  onRefresh: () => void;
}) {
  const [assignments, setAssignments] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    integrations.forEach(i => { map[i.id] = i.is_enabled; });
    setAssignments(map);
  }, [integrations]);

  const handleToggle = (id: string) => {
    setAssignments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(assignments).map(([integration_id, is_enabled]) => ({ integration_id, is_enabled }));
      const result = await adminApi.updateToolAssignments(projectId, payload);
      onMessage(`✅ Tool assignments saved — ${result.updated} integration(s) updated`, 'success');
      onRefresh();
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to save assignments', 'error');
    } finally { setSaving(false); }
  };

  if (integrations.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔧</div>
        <div className="empty-state-title">No integrations to assign</div>
        <div className="empty-state-desc">Add API integrations first, then assign them to this agent here.</div>
      </div>
    );
  }

  const enabledCount = Object.values(assignments).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Toggle which tools are active for this agent. Only <strong style={{ color: '#34d399' }}>enabled</strong> tools are loaded into the orchestrator at runtime.
        </div>
        <Badge color="emerald">{enabledCount} / {integrations.length} active</Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {integrations.map((item) => {
          const enabled = assignments[item.id] ?? item.is_enabled;
          const isMock = item.name.includes('[MOCK]');
          const isHubSpot = item.name.includes('HubSpot');
          return (
            <div key={item.id} style={{
              padding: '12px 16px', borderRadius: 12,
              background: enabled ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${enabled ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>
                {isMock ? '🏦' : isHubSpot ? '🟠' : '🔗'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.name}</span>
                  {isMock && <Badge color="amber">MOCK</Badge>}
                  {isHubSpot && <Badge color="violet">CRM</Badge>}
                  {!item.has_secret && item.auth_type !== 'none' && <Badge color="rose">⚠ No Token</Badge>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                  {item.endpoints.length} endpoints · {item.auth_type}
                </div>
              </div>
              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle(item.id)}
                style={{
                  position: 'relative', width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                  background: enabled ? '#10b981' : 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: enabled ? 22 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: enabled ? '#34d399' : 'var(--color-text-muted)', minWidth: 52, textAlign: 'right' }}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          );
        })}
      </div>

      <button
        className="btn"
        style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', marginTop: 4 }}
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? <><div className="spinner" /> Saving…</> : '💾 Save Tool Assignments'}
      </button>
    </div>
  );
}

// ─── Marketplace Panel ─────────────────────────────────────────────────────────

function MarketplacePanel({
  projectId, onMessage, onRefresh,
}: {
  projectId: string;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
  onRefresh: () => void;
}) {
  const [installingMock, setInstallingMock] = useState(false);
  const [installingHubSpot, setInstallingHubSpot] = useState(false);
  const [hubspotToken, setHubspotToken] = useState('');
  const [showHubSpotForm, setShowHubSpotForm] = useState(false);
  const [connectingHubSpot, setConnectingHubSpot] = useState(false);
  const [hubspotStatus, setHubspotStatus] = useState<'connected' | 'unconfigured' | null>(null);

  useEffect(() => {
    adminApi.getHubSpotStatus(projectId)
      .then(s => setHubspotStatus(s.status))
      .catch(() => setHubspotStatus('unconfigured'));
  }, [projectId]);

  const handleInstallMock = async () => {
    setInstallingMock(true);
    try {
      const result = await adminApi.installMockIntegrations(projectId);
      onMessage(`✅ ${result.message}`, 'success');
      onRefresh();
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Installation failed', 'error');
    } finally { setInstallingMock(false); }
  };

  const handleInstallHubSpot = async () => {
    setInstallingHubSpot(true);
    try {
      const result = await adminApi.installHubSpotIntegration(projectId);
      onMessage(`✅ ${result.message}`, 'success');
      onRefresh();
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'HubSpot install failed', 'error');
    } finally { setInstallingHubSpot(false); }
  };

  const handleConnectHubSpot = async () => {
    if (!hubspotToken.trim()) return;
    setConnectingHubSpot(true);
    try {
      const result = await adminApi.connectHubSpot(projectId, hubspotToken.trim());
      setHubspotStatus('connected');
      setShowHubSpotForm(false);
      setHubspotToken('');
      onMessage(`✅ ${result.message}`, 'success');
      onRefresh();
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'HubSpot connection failed', 'error');
    } finally { setConnectingHubSpot(false); }
  };

  const cards = [
    {
      id: 'mock-bfsi',
      icon: '🏦',
      label: '[MOCK] BFSI Demo Suite',
      badge: 'HTTPS MOCK',
      badgeColor: 'amber',
      description: 'Banking · Insurance · Finance (via public HTTPS)',
      tools: ['Get Account Balance', 'Get Transactions', 'Check Loan Status', 'Get Loan Schedule', 'Create Service Request', 'Get Policy Details', 'Check Claim Status', 'File Claim', 'Calculate EMI', 'Repayment History'],
      note: 'Uses public HTTPS (https://httpbin.org/anything/mock) with deterministic synthetic BFSI data. Zero domain or SSL setup required.',
      status: 'ready',
      action: (
        <button
          className="btn"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', width: '100%' }}
          disabled={installingMock}
          onClick={handleInstallMock}
        >
          {installingMock ? <><div className="spinner" /> Installing…</> : '⚡ Install Mock Suite'}
        </button>
      ),
    },
    {
      id: 'hubspot',
      icon: '🟠',
      label: 'HubSpot CRM',
      badge: hubspotStatus === 'connected' ? 'LIVE' : 'UNCONFIGURED',
      badgeColor: hubspotStatus === 'connected' ? 'emerald' : 'rose',
      description: 'Contacts · Tasks · Search',
      tools: ['Search Contacts', 'Get Contact by ID', 'Create Contact', 'Create Follow-up Task'],
      note: hubspotStatus === 'connected'
        ? '🟢 Connected via Private App Token (PAT)'
        : 'Requires a HubSpot Private App Token. Real API calls — no mock data.',
      status: hubspotStatus,
      action: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn"
            style={{
              background: hubspotStatus === 'connected' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ff7a59,#c05200)',
              color: 'white', width: '100%',
            }}
            disabled={installingHubSpot}
            onClick={handleInstallHubSpot}
          >
            {installingHubSpot ? <><div className="spinner" /> Registering…</> : '📦 Register HubSpot Tools'}
          </button>
          {hubspotStatus !== 'connected' && (
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setShowHubSpotForm(v => !v)}
            >
              {showHubSpotForm ? '✕ Cancel' : '🔑 Connect with Token'}
            </button>
          )}
          {showHubSpotForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Create a <strong>Private App</strong> in HubSpot Settings → Integrations → Private Apps. Copy the token below.
              </div>
              <input
                className="form-input"
                type="password"
                placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={hubspotToken}
                onChange={e => setHubspotToken(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)' }}
                  onClick={() => setHubspotToken('pat-demo-hubspot-sandbox')}
                >
                  ⚡ Use Demo Sandbox Token
                </button>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  (Instant connection without HubSpot Super Admin)
                </span>
              </div>
              <button
                className="btn"
                style={{ background: 'linear-gradient(135deg,#ff7a59,#c05200)', color: 'white' }}
                disabled={!hubspotToken.trim() || connectingHubSpot}
                onClick={handleConnectHubSpot}
              >
                {connectingHubSpot ? <><div className="spinner" /> Validating &amp; Connecting…</> : '🔗 Validate &amp; Connect'}
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
        One-click integrations for your BFSI agent. Installed tools appear in the <strong>Vault</strong> and can be assigned from the <strong>Assignments</strong> tab.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cards.map((card) => (
          <div key={card.id} style={{
            padding: 20, borderRadius: 14,
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${card.badgeColor === 'emerald' ? 'rgba(16,185,129,0.25)' : card.badgeColor === 'amber' ? 'rgba(251,191,36,0.2)' : 'rgba(244,63,94,0.15)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>{card.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{card.label}</span>
                  <Badge color={card.badgeColor as any}>{card.badge}</Badge>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{card.description}</div>
              </div>
            </div>

            {/* Tool list */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {card.tools.map(t => (
                <span key={t} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>{t}</span>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              ℹ️ {card.note}
            </div>

            {card.action}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main API Vault View ───────────────────────────────────────────────────────

export default function ApiVaultView({ selectedProject, onMessage }: ApiVaultViewProps) {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, any> | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('marketplace');

  // Manual form state
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState('bearer');
  const [secretKey, setSecretKey] = useState('');
  const [endpointPath, setEndpointPath] = useState('/get');
  const [endpointMethod, setEndpointMethod] = useState('GET');
  const [endpointName, setEndpointName] = useState('default_get');
  const [creating, setCreating] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (selectedProject?.id) loadIntegrations(selectedProject.id);
  }, [selectedProject?.id]);

  const loadIntegrations = async (projId: string) => {
    setLoading(true);
    try {
      const data = await adminApi.getIntegrations(projId);
      setIntegrations(data);
    } catch { }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.id) return;
    setCreating(true);
    try {
      await adminApi.createIntegration(selectedProject.id, {
        name: name.trim(),
        base_url: baseUrl.trim(),
        auth_type: authType,
        secret_key: secretKey || undefined,
        endpoints: [{ name: endpointName, method: endpointMethod, path: endpointPath }],
        is_enabled: true,
      });
      setName(''); setBaseUrl(''); setSecretKey(''); setEndpointPath('/get');
      loadIntegrations(selectedProject.id);
      onMessage(`✅ API Integration "${name}" added to vault with Fernet encryption`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to create integration', 'error');
    } finally { setCreating(false); }
  };

  // Pre-fill manual form from cURL parse result
  const handleCurlParsed = (result: CurlParseResult, secret: string) => {
    setName(result.suggested_name);
    setBaseUrl(result.base_url);
    setAuthType(result.auth_type);
    setSecretKey(secret || '');
    setEndpointPath(result.path);
    setEndpointMethod(result.method);
    setEndpointName(result.suggested_endpoint_name);
    setActiveTab('manual');
    onMessage('✨ Form pre-filled from cURL. Review and click Save to encrypt & register.', 'success');
  };

  const handleTestCall = async (integId: string, integName: string) => {
    setTestingId(integId);
    setTestResult(null);
    const integration = integrations.find(i => i.id === integId);
    const endpointToTest = integration?.endpoints?.[0]?.name || 'default_get';
    try {
      const res = await adminApi.testCall(integId, endpointToTest);
      setTestResult({ _integration: integName, ...res });
      onMessage(res.success ? `✅ API call succeeded (${res.status_code}) — ${res.latency_ms}ms` : `⚠️ API call returned ${res.status_code}`, res.success ? 'success' : 'error');
    } catch {
      setTestResult({ error: 'Connection failed' });
    } finally { setTestingId(null); }
  };

  if (!selectedProject) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon">🔐</div>
        <div className="empty-state-title">No agent selected</div>
        <div className="empty-state-desc">Select an agent to manage its API vault</div>
      </div>
    );
  }

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'marketplace', label: 'Marketplace', icon: '🛒' },
    { id: 'manual', label: 'Manual / REST', icon: '📝' },
    { id: 'curl', label: 'Import cURL', icon: '⬇️' },
    { id: 'assignments', label: `Assignments (${integrations.filter(i => i.is_enabled).length}/${integrations.length})`, icon: '🔧' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">API Vault</div>
          <div className="section-subtitle">
            Encrypted API tools for: <strong style={{ color: 'var(--color-text-accent)' }}>{selectedProject.name}</strong>
            {' '}— Fernet AES-256 · Tool-to-Agent Assignment
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge color="rose">{integrations.length} Integrations</Badge>
          <Badge color="emerald">{integrations.filter(i => i.is_enabled).length} Active</Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === tab.id ? '#a5b4fc' : 'var(--color-text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 12, transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid-2">
        {/* Left Panel — Tab Content */}
        <div className="card" style={{ borderColor: activeTab === 'curl' ? 'rgba(99,102,241,0.2)' : activeTab === 'marketplace' ? 'rgba(251,191,36,0.2)' : 'rgba(244,63,94,0.2)' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeTab === 'marketplace' && <><span>🛒</span> Integration Marketplace</>}
              {activeTab === 'manual' && <><span>📝</span> Manual REST Registration</>}
              {activeTab === 'curl' && <><span>⬇️</span> Import from cURL</>}
              {activeTab === 'assignments' && <><span>🔧</span> Tool Assignments</>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {activeTab === 'marketplace' && 'One-click install mock BFSI suite or HubSpot CRM'}
              {activeTab === 'manual' && 'Configure a REST API integration manually'}
              {activeTab === 'curl' && 'Paste any cURL command to auto-fill the registration form'}
              {activeTab === 'assignments' && 'Enable/disable tools for this agent\'s orchestrator'}
            </div>
          </div>

          {/* Marketplace */}
          {activeTab === 'marketplace' && (
            <MarketplacePanel
              projectId={selectedProject.id}
              onMessage={onMessage}
              onRefresh={() => loadIntegrations(selectedProject.id)}
            />
          )}

          {/* cURL Import */}
          {activeTab === 'curl' && (
            <CurlImportPanel
              projectId={selectedProject.id}
              onParsed={handleCurlParsed}
              onMessage={onMessage}
            />
          )}

          {/* Manual Form */}
          {activeTab === 'manual' && (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 6, padding: '6px 10px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, fontSize: 11, color: '#818cf8' }}>
                💡 Or use the <button type="button" onClick={() => setActiveTab('curl')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontWeight: 700, padding: 0, textDecoration: 'underline' }}>cURL importer</button> to auto-fill this form
              </div>
              <div className="form-group">
                <label className="form-label">Integration Name</label>
                <input className="form-input" type="text" placeholder="e.g. Core Banking Ledger API" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Base URL</label>
                <input className="form-input" type="text" placeholder="https://api.bankingcore.internal" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Authentication Type</label>
                <select className="form-select" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                  <option value="none">None (Open endpoint)</option>
                  <option value="bearer">Bearer Token (Authorization: Bearer …)</option>
                  <option value="api_key">API Key (X-API-Key: …)</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
              {authType !== 'none' && (
                <div className="form-group">
                  <label className="form-label">Secret / Token (Vault Encrypted)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showSecret ? 'text' : 'password'}
                      placeholder="sk-… or API token (Fernet AES-256 encrypted at rest)"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-text-muted)' }}
                    >
                      {showSecret ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 10 }}>Default Endpoint</div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, marginBottom: 8 }}>
                  <select className="form-select" value={endpointMethod} onChange={(e) => setEndpointMethod(e.target.value)}>
                    <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                  </select>
                  <input className="form-input" type="text" placeholder="/accounts/{id}/balance" value={endpointPath} onChange={(e) => setEndpointPath(e.target.value)} />
                </div>
                <input className="form-input" type="text" placeholder="Endpoint name (e.g. get_balance)" value={endpointName} onChange={(e) => setEndpointName(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-full" style={{ background: 'linear-gradient(135deg, #be185d, #f43f5e)', color: 'white', boxShadow: '0 4px 16px rgba(244,63,94,0.3)' }} disabled={creating}>
                {creating ? <><div className="spinner" /> Encrypting &amp; Saving…</> : '🔐 Save to Secret Vault'}
              </button>
            </form>
          )}

          {/* Assignments */}
          {activeTab === 'assignments' && (
            <ToolAssignmentsPanel
              projectId={selectedProject.id}
              integrations={integrations}
              onMessage={onMessage}
              onRefresh={() => loadIntegrations(selectedProject.id)}
            />
          )}
        </div>

        {/* Right Panel — Integrations List */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Configured API Tools</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Active tool integrations for this agent
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : integrations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔐</div>
              <div className="empty-state-title">No API tools configured</div>
              <div className="empty-state-desc">Install from Marketplace or add manually using the tabs on the left</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {integrations.map((item) => {
                const isMock = item.name.includes('[MOCK]');
                const isHubSpot = item.name.includes('HubSpot');
                return (
                  <div key={item.id} style={{
                    padding: '14px', borderRadius: 12,
                    background: item.is_enabled ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${item.is_enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {isMock ? '🏦' : isHubSpot ? '🟠' : '🔗'} {item.name}
                          {item.is_enabled ? <Badge color="emerald">Active</Badge> : <Badge color="amber">Disabled</Badge>}
                          {isMock && <Badge color="amber">MOCK</Badge>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
                          {item.base_url}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <Badge color="indigo">{item.auth_type}</Badge>
                      {item.has_secret && <Badge color="rose">🔐 Secret Stored</Badge>}
                      <Badge color="sky">{item.endpoints.length} endpoint{item.endpoints.length !== 1 ? 's' : ''}</Badge>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-success btn-sm"
                        disabled={testingId === item.id}
                        onClick={() => handleTestCall(item.id, item.name)}
                      >
                        {testingId === item.id ? <><div className="spinner" /> Testing…</> : '⚡ Live Test'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveTab('assignments')}
                      >
                        🔧 Assign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Test Result Panel */}
      {testResult && (
        <div className="card" style={{ borderColor: testResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              🔬 API Test Result — {testResult._integration}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {testResult.status_code && <Badge color="sky">HTTP {testResult.status_code}</Badge>}
              {testResult.latency_ms && <Badge color="amber">⚡ {testResult.latency_ms}ms</Badge>}
              {testResult.success !== undefined && (
                <Badge color={testResult.success ? 'emerald' : 'rose'}>
                  {testResult.success ? '✓ Success' : '✗ Failed'}
                </Badge>
              )}
            </div>
          </div>
          <pre style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '14px 16px', fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace', color: '#a5b4fc',
            overflowX: 'auto', maxHeight: 280, lineHeight: 1.8,
          }}>
            {JSON.stringify(testResult.response_body || testResult.error || testResult, null, 2)}
          </pre>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setTestResult(null)}
          >
            ✕ Clear Result
          </button>
        </div>
      )}
    </div>
  );
}
