import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { ApiIntegration, Project } from '../types';

interface ApiVaultViewProps {
  selectedProject: Project | undefined;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

export default function ApiVaultView({ selectedProject, onMessage }: ApiVaultViewProps) {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, any> | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state
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

  const handleTestCall = async (integId: string, integName: string) => {
    setTestingId(integId);
    setTestResult(null);
    try {
      const res = await adminApi.testCall(integId, 'default_get');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-header">
        <div>
          <div className="section-title">API Vault</div>
          <div className="section-subtitle">
            Encrypted external API tools for:{' '}
            <strong style={{ color: 'var(--color-text-accent)' }}>{selectedProject.name}</strong>
            {' '}— Fernet AES-256 encrypted secret storage
          </div>
        </div>
        <div className="badge badge-rose">{integrations.length} Integrations</div>
      </div>

      <div className="grid-2">
        {/* Create Integration Form */}
        <div className="card" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔐</span> Register API Integration
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Secrets are encrypted with Fernet AES-256 and never exposed to the browser
            </div>
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              {creating ? <><div className="spinner" /> Encrypting & Saving…</> : '🔐 Save to Secret Vault'}
            </button>
          </form>
        </div>

        {/* Integrations List */}
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
              <div className="empty-state-desc">Add external API integrations to enable live data lookup for your agent</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {integrations.map((item) => (
                <div key={item.id} style={{
                  padding: '14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🔗 {item.name}
                        {item.is_enabled ? <span className="badge badge-emerald">Enabled</span> : <span className="badge badge-amber">Disabled</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
                        {item.base_url}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span className="badge badge-indigo">{item.auth_type}</span>
                    {item.has_secret && <span className="badge badge-rose">🔐 Secret Stored</span>}
                    <span className="badge badge-sky">{item.endpoints.length} endpoint{item.endpoints.length !== 1 ? 's' : ''}</span>
                  </div>

                  <button
                    className="btn btn-success btn-sm"
                    disabled={testingId === item.id}
                    onClick={() => handleTestCall(item.id, item.name)}
                  >
                    {testingId === item.id ? <><div className="spinner" /> Testing…</> : '⚡ Live Test Call'}
                  </button>
                </div>
              ))}
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
              {testResult.status_code && <span className="badge badge-sky">HTTP {testResult.status_code}</span>}
              {testResult.latency_ms && <span className="badge badge-amber">⚡ {testResult.latency_ms}ms</span>}
              {testResult.success !== undefined && (
                <span className={`badge badge-${testResult.success ? 'emerald' : 'rose'}`}>
                  {testResult.success ? '✓ Success' : '✗ Failed'}
                </span>
              )}
            </div>
          </div>
          <pre style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '14px 16px', fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace', color: '#a5b4fc',
            overflowX: 'auto', maxHeight: 240, lineHeight: 1.8,
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
