import React, { useState, useEffect } from 'react';
import { adminApi } from './services/api';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bfsi_admin_token'));
  const [email, setEmail] = useState('admin@bfsi.com');
  const [password, setPassword] = useState('admin123');

  // App State
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'orgs' | 'projects' | 'config' | 'integrations' | 'kb' | 'playground'>('orgs');

  // Form states
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDomain, setNewProjDomain] = useState('banking');

  // User Onboarding State
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState('lead');

  // Config State
  const [configPrompt, setConfigPrompt] = useState('');
  const [blockedTopics, setBlockedTopics] = useState('');
  const [disclaimers, setDisclaimers] = useState('');

  // Integrations State
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integName, setIntegName] = useState('');
  const [integBaseUrl, setIntegBaseUrl] = useState('');
  const [integAuthType, setIntegAuthType] = useState('bearer');
  const [integSecret, setIntegSecret] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  // KB State
  const [kbDocs, setKbDocs] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Agent Playground State
  const [playgroundQuery, setPlaygroundQuery] = useState('');
  const [playgroundLogs, setPlaygroundLogs] = useState<any[]>([]);
  const [isPlaygroundTesting, setIsPlaygroundTesting] = useState(false);

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      loadOrgs();
    }
  }, [token]);

  useEffect(() => {
    if (selectedOrgId) {
      loadProjects(selectedOrgId);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectConfig(selectedProjectId);
      loadIntegrations(selectedProjectId);
      loadKbDocs(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await adminApi.login(email, password);
      localStorage.setItem('bfsi_admin_token', data.access_token);
      setToken(data.access_token);
      setMessage('Login successful!');
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Login failed');
    }
  };

  const loadOrgs = async () => {
    try {
      const data = await adminApi.getOrgs();
      setOrgs(data);
      if (data.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data[0].id);
      }
    } catch (err) {}
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createOrg(newOrgName, newOrgSlug);
      setNewOrgName('');
      setNewOrgSlug('');
      loadOrgs();
      setMessage('Organization created successfully');
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to create org');
    }
  };

  const handleCreateOrgUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    try {
      await adminApi.createOrgUser(selectedOrgId, {
        email: userEmail,
        password: userPassword,
        full_name: userFullName,
        role: userRole,
      });
      setUserEmail('');
      setUserPassword('');
      setUserFullName('');
      setMessage(`Client user created successfully for Org (${userRole})!`);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to create org user');
    }
  };

  const handlePlaygroundSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !playgroundQuery.trim()) return;
    setIsPlaygroundTesting(true);
    try {
      const res = await adminApi.testPlaygroundChat(selectedProjectId, playgroundQuery);
      setPlaygroundLogs((prev) => [
        ...prev,
        { role: 'user', content: playgroundQuery },
        {
          role: 'assistant',
          content: res.answer,
          intent: res.intent,
          should_escalate: res.should_escalate,
          latency_ms: res.latency_ms,
        },
      ]);
      setPlaygroundQuery('');
    } catch (err: any) {
      setMessage('Playground test execution failed');
    } finally {
      setIsPlaygroundTesting(false);
    }
  };

  const loadProjects = async (orgId: string) => {
    try {
      const data = await adminApi.getProjects(orgId);
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      } else {
        setSelectedProjectId('');
      }
    } catch (err) {}
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    try {
      await adminApi.createProject(selectedOrgId, newProjName, newProjDomain, newProjDomain);
      setNewProjName('');
      loadProjects(selectedOrgId);
      setMessage('Project created with template pre-fill!');
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to create project');
    }
  };

  const loadProjectConfig = async (projId: string) => {
    try {
      const data = await adminApi.getConfig(projId);
      setConfigPrompt(data.system_prompt || '');
      setBlockedTopics((data.guardrails?.blocked_topics || []).join(', '));
      setDisclaimers((data.guardrails?.required_disclaimers || []).join(', '));
    } catch (err) {}
  };

  const handleSaveConfig = async () => {
    if (!selectedProjectId) return;
    try {
      await adminApi.updateConfig(selectedProjectId, {
        system_prompt: configPrompt,
        guardrails: {
          blocked_topics: blockedTopics.split(',').map((s) => s.trim()).filter(Boolean),
          required_disclaimers: disclaimers.split(',').map((s) => s.trim()).filter(Boolean),
          pii_masking: true,
        },
      });
      setMessage('Project configuration saved!');
    } catch (err: any) {
      setMessage('Failed to save config');
    }
  };

  const loadIntegrations = async (projId: string) => {
    try {
      const data = await adminApi.getIntegrations(projId);
      setIntegrations(data);
    } catch (err) {}
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      await adminApi.createIntegration(selectedProjectId, {
        name: integName,
        base_url: integBaseUrl,
        auth_type: integAuthType,
        secret_key: integSecret,
        endpoints: [{ name: 'default_get', method: 'GET', path: '/get' }],
      });
      setIntegName('');
      setIntegBaseUrl('');
      setIntegSecret('');
      loadIntegrations(selectedProjectId);
      setMessage('API Integration created with Fernet encryption vault!');
    } catch (err: any) {
      setMessage('Failed to create integration');
    }
  };

  const handleTestCall = async (integId: string) => {
    try {
      const res = await adminApi.testCall(integId, 'default_get');
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: 'Test call failed' });
    }
  };

  const loadKbDocs = async (projId: string) => {
    try {
      const data = await adminApi.getKbDocs(projId);
      setKbDocs(data);
    } catch (err) {}
  };

  const handleUploadKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedFile) return;
    try {
      await adminApi.uploadKbDoc(selectedProjectId, selectedFile);
      setSelectedFile(null);
      loadKbDocs(selectedProjectId);
      setMessage('Document uploaded & indexed into vector store collection!');
    } catch (err: any) {
      setMessage('Upload failed');
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 p-8 rounded-xl w-full max-w-md space-y-6">
          <h2 className="text-2xl font-bold text-blue-400 text-center">BFSI Super Admin Portal</h2>
          {message && <div className="p-3 bg-blue-900/50 border border-blue-700 text-blue-200 rounded text-sm">{message}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Super Admin Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2 rounded transition">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">B</div>
          <h1 className="text-xl font-bold text-white">BFSI SaaS Platform — Super Admin</h1>
        </div>
        <button onClick={() => { localStorage.removeItem('bfsi_admin_token'); setToken(null); }} className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded">Sign Out</button>
      </header>

      {/* Main Container */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {message && <div className="p-3 bg-blue-900/50 border border-blue-700 text-blue-200 rounded text-sm">{message}</div>}

        {/* Top Context Bar */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-wrap items-center gap-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Select Organization</label>
            <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
              {orgs.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Select Project</label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.domain})</option>))}
            </select>
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="flex space-x-2 border-b border-gray-800">
          {(['orgs', 'projects', 'config', 'integrations', 'kb', 'playground'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              {tab === 'orgs' && 'Organizations & Client Onboarding'}
              {tab === 'projects' && 'Projects & BFSI Templates'}
              {tab === 'config' && 'Prompt & Guardrails'}
              {tab === 'integrations' && 'API Integrations & Vault'}
              {tab === 'kb' && 'Knowledge Base (RAG)'}
              {tab === 'playground' && '🎮 Agent Playground'}
            </button>
          ))}
        </div>

        {/* TAB 1: ORGANIZATIONS & CLIENT ONBOARDING */}
        {activeTab === 'orgs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleCreateOrg} className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-bold text-blue-400">Create New Organization</h3>
              <input type="text" placeholder="Org Name (e.g. Acme Bank)" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
              <input type="text" placeholder="Org Slug (e.g. acme-bank)" value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold">Create Org</button>
            </form>

            <form onSubmit={handleCreateOrgUser} className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-bold text-green-400">Onboard Client User for Active Org</h3>
              <input type="email" placeholder="Client User Email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" required />
              <input type="password" placeholder="Temporary Password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" required />
              <input type="text" placeholder="Full Name" value={userFullName} onChange={(e) => setUserFullName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" required />
              <div>
                <label className="block text-xs text-gray-400 mb-1">User Access Role</label>
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white">
                  <option value="lead">Lead Agent / Operator (Assigned projects only)</option>
                  <option value="supervisor">Supervisor / Org Admin (All Org projects & analytics)</option>
                  <option value="org_admin">Organization Administrator</option>
                </select>
              </div>
              <button type="submit" className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-semibold">Create Client User Credentials</button>
            </form>
          </div>
        )}

        {/* TAB 2: PROJECTS & TEMPLATES */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateProject} className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4 max-w-lg">
              <h3 className="text-lg font-bold text-blue-400">Create Project under Active Org</h3>
              <input type="text" placeholder="Project Name" value={newProjName} onChange={(e) => setNewProjName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
              <div>
                <label className="block text-xs text-gray-400 mb-1">BFSI Domain Template</label>
                <select value={newProjDomain} onChange={(e) => setNewProjDomain(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white">
                  <option value="banking">Banking Operations</option>
                  <option value="finance">Wealth & Financial Services</option>
                  <option value="insurance">Insurance Claims & Policies</option>
                </select>
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold">Create Project with Template</button>
            </form>
          </div>
        )}

        {/* TAB 3: CONFIG & GUARDRAILS */}
        {activeTab === 'config' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-6 max-w-2xl">
            <h3 className="text-lg font-bold text-blue-400">System Prompt & Domain Guardrails</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">System Prompt</label>
              <textarea rows={4} value={configPrompt} onChange={(e) => setConfigPrompt(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Blocked Topics (Comma-separated)</label>
              <input type="text" value={blockedTopics} onChange={(e) => setBlockedTopics(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Required Disclaimers (Comma-separated)</label>
              <input type="text" value={disclaimers} onChange={(e) => setDisclaimers(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
            </div>
            <button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded font-semibold text-sm">Save Config</button>
          </div>
        )}

        {/* TAB 4: API INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateIntegration} className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4 max-w-xl">
              <h3 className="text-lg font-bold text-blue-400">Configure External API Integration</h3>
              <input type="text" placeholder="Integration Name (e.g. Core Banking API)" value={integName} onChange={(e) => setIntegName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
              <input type="text" placeholder="Base URL (e.g. https://api.bank.com)" value={integBaseUrl} onChange={(e) => setIntegBaseUrl(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
              <input type="password" placeholder="API Secret / Token (Fernet Encrypted)" value={integSecret} onChange={(e) => setIntegSecret(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold">Save Integration to Vault</button>
            </form>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <h4 className="font-bold text-gray-200">Configured Integrations</h4>
              {integrations.map((item) => (
                <div key={item.id} className="bg-gray-800 p-4 rounded flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white">{item.name}</h5>
                    <p className="text-xs text-gray-400">{item.base_url} | Secret: {item.has_secret ? '🔒 Encrypted Vault' : 'None'}</p>
                  </div>
                  <button onClick={() => handleTestCall(item.id)} className="bg-green-600 hover:bg-green-500 text-xs px-3 py-1.5 rounded font-semibold">Test Call</button>
                </div>
              ))}
              {testResult && <pre className="p-4 bg-black rounded text-xs text-green-400 overflow-x-auto">{JSON.stringify(testResult, null, 2)}</pre>}
            </div>
          </div>
        )}

        {/* TAB 5: KNOWLEDGE BASE */}
        {activeTab === 'kb' && (
          <div className="space-y-6">
            <form onSubmit={handleUploadKb} className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4 max-w-lg">
              <h3 className="text-lg font-bold text-blue-400">Upload Knowledge Base Document</h3>
              <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="block text-sm text-gray-400" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold">Upload & Index</button>
            </form>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-3">
              <h4 className="font-bold text-gray-200">Indexed Project Documents</h4>
              {kbDocs.map((doc) => (
                <div key={doc.id} className="bg-gray-800 p-3 rounded flex items-center justify-between text-sm">
                  <span>{doc.filename} ({doc.collection_name})</span>
                  <span className="bg-blue-900 text-blue-300 text-xs px-2 py-0.5 rounded font-bold">{doc.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AGENT PLAYGROUND */}
        {activeTab === 'playground' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-blue-400">🎮 Interactive Agent Playground</h3>
                <p className="text-xs text-gray-400">Test agent system prompt, guardrails, API tool execution, and vector RAG retrieval in real time.</p>
              </div>
              <button onClick={() => setPlaygroundLogs([])} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded">Clear Simulator Chat</button>
            </div>

            {/* Chat Transcript Window */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 h-96 overflow-y-auto space-y-3 font-mono text-sm">
              {playgroundLogs.length === 0 ? (
                <div className="text-center text-gray-600 py-16 text-xs">Enter a query below to test the dynamic orchestrator graph for the active project.</div>
              ) : (
                playgroundLogs.map((log, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${log.role === 'user' ? 'bg-blue-950/60 border border-blue-900 text-blue-100 ml-12' : 'bg-gray-900 border border-gray-800 text-gray-100 mr-12'}`}>
                    <div className="text-xs text-gray-500 font-sans mb-1">{log.role === 'user' ? '👤 Admin Test Query' : '🤖 Agent Response'}</div>
                    <div className="whitespace-pre-wrap">{log.content}</div>
                    {log.intent && (
                      <div className="mt-2 pt-2 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between font-sans">
                        <span>Intent: <strong className="text-blue-400">{log.intent}</strong></span>
                        <span>Escalate: <strong className={log.should_escalate ? 'text-red-400' : 'text-green-400'}>{log.should_escalate ? 'Yes' : 'No'}</strong></span>
                        <span>Latency: <strong>{log.latency_ms}ms</strong></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Query Form */}
            <form onSubmit={handlePlaygroundSend} className="flex gap-3">
              <input
                type="text"
                placeholder="Enter test user prompt (e.g. What is account balance requirement? or Blocked topic test)"
                value={playgroundQuery}
                onChange={(e) => setPlaygroundQuery(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isPlaygroundTesting}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold px-6 py-2 rounded-lg text-sm"
              >
                {isPlaygroundTesting ? 'Testing...' : 'Test Run'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
