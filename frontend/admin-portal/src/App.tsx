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
  const [activeTab, setActiveTab] = useState<'orgs' | 'projects' | 'config' | 'integrations' | 'kb' | 'playground'>('projects');

  // Form states
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDomain, setNewProjDomain] = useState('banking');
  const [newProjStatus, setNewProjStatus] = useState<'Live' | 'Paused' | 'Draft'>('Live');

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
  const [crawlUrlInput, setCrawlUrlInput] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlSuccessInfo, setCrawlSuccessInfo] = useState<any>(null);

  // Agent Playground State
  const [playgroundQuery, setPlaygroundQuery] = useState('');
  const [playgroundLogs, setPlaygroundLogs] = useState<any[]>([]);
  const [isPlaygroundTesting, setIsPlaygroundTesting] = useState(false);
  const [expandedPassagesIdx, setExpandedPassagesIdx] = useState<number | null>(null);

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

  const loadProjects = async (orgId: string) => {
    try {
      const data = await adminApi.getProjects(orgId);
      setProjects(data);
      if (data.length > 0) {
        if (!selectedProjectId || !data.some((p: any) => p.id === selectedProjectId)) {
          setSelectedProjectId(data[0].id);
        }
      } else {
        setSelectedProjectId('');
      }
    } catch (err) {}
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !newProjName.trim()) return;
    try {
      await adminApi.createProject(selectedOrgId, newProjName, newProjDomain, newProjDomain, newProjStatus);
      setNewProjName('');
      loadProjects(selectedOrgId);
      setMessage(`Agent '${newProjName}' created with status '${newProjStatus}'!`);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to create project');
    }
  };

  const handleStatusToggle = async (projId: string, nextStatus: 'Live' | 'Paused' | 'Draft') => {
    try {
      await adminApi.updateProjectStatus(projId, nextStatus);
      if (selectedOrgId) {
        loadProjects(selectedOrgId);
      }
      setMessage(`Agent status updated to ${nextStatus}`);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to update agent status');
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
      setMessage('Document uploaded & indexed into Chroma vector store!');
    } catch (err: any) {
      setMessage('Upload failed');
    }
  };

  const handleCrawlUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !crawlUrlInput.trim()) return;
    setIsCrawling(true);
    setCrawlSuccessInfo(null);
    try {
      const res = await adminApi.crawlUrl(selectedProjectId, crawlUrlInput.trim());
      setCrawlSuccessInfo(res);
      setCrawlUrlInput('');
      loadKbDocs(selectedProjectId);
      setMessage(`Successfully crawled and indexed ${res.doc_metadata?.chunks_count || 1} chunks into vector store!`);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Web crawl indexing failed');
    } finally {
      setIsCrawling(false);
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
          rag_passages: res.rag_passages || [],
          tool_calls: res.tool_calls || [],
          should_escalate: res.should_escalate,
          is_flagged: res.is_flagged,
          latency_ms: res.latency_ms,
          tokens_used: res.tokens_used,
          model_used: res.model_used,
        },
      ]);
      setPlaygroundQuery('');
    } catch (err: any) {
      setMessage('Playground test execution failed');
    } finally {
      setIsPlaygroundTesting(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md space-y-6 shadow-2xl">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">B</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">BFSI Super Admin</h2>
          </div>
          <p className="text-xs text-slate-400 text-center">Multi-Tenant Intelligent Agent Platform Management</p>
          {message && <div className="p-3 bg-blue-950/60 border border-blue-800 text-blue-200 rounded-lg text-sm">{message}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Super Admin Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold py-2.5 rounded-lg text-white shadow-lg shadow-blue-500/20 transition">Sign In to Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center font-bold text-white shadow-md">B</div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">BFSI SaaS Platform</h1>
            <p className="text-xs text-slate-400">OpenRouter LLM & Multi-Agent Admin Portal</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">OpenRouter: <strong>gemini-2.0-flash / llama-3.1</strong></span>
          </div>
          <button onClick={() => { localStorage.removeItem('bfsi_admin_token'); setToken(null); }} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">Sign Out</button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {message && (
          <div className="p-3 bg-blue-950/70 border border-blue-800 text-blue-200 rounded-xl text-sm flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Organization & Active Agent Header Selector */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Organization</label>
              <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500">
                {orgs.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active Agent / Project</label>
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500">
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.domain.toUpperCase()} • {p.status || 'Live'})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedProject && (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400">Agent Status:</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center space-x-1.5 ${
                selectedProject.status === 'Live' || selectedProject.status === 'active'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700'
                  : selectedProject.status === 'Paused'
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-700'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  selectedProject.status === 'Live' || selectedProject.status === 'active' ? 'bg-emerald-400 animate-pulse' : selectedProject.status === 'Paused' ? 'bg-amber-400' : 'bg-slate-400'
                }`}></span>
                <span>{selectedProject.status || 'Live'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-b border-slate-800">
          {(['projects', 'playground', 'kb', 'config', 'integrations', 'orgs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              {tab === 'projects' && '🤖 Multi-Agent Management'}
              {tab === 'playground' && '🎮 Agent Playground'}
              {tab === 'kb' && '🌐 Knowledge Base & Web Crawler'}
              {tab === 'config' && '⚙️ Prompts & Guardrails'}
              {tab === 'integrations' && '🔒 API Integrations & Vault'}
              {tab === 'orgs' && '🏢 Orgs & Client Users'}
            </button>
          ))}
        </div>

        {/* TAB 1: MULTI-AGENT MANAGEMENT & STATUS LIFECYCLE */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Creator Form */}
              <form onSubmit={handleCreateProject} className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-blue-400">Create New Intelligent Agent</h3>
                  <span className="text-xs bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">Multi-Agent</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Agent Name</label>
                  <input type="text" placeholder="e.g. Mortgage Loan Underwriting Assistant" value={newProjName} onChange={(e) => setNewProjName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">BFSI Domain Specialization</label>
                  <select value={newProjDomain} onChange={(e) => setNewProjDomain(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white">
                    <option value="banking">Retail & Commercial Banking</option>
                    <option value="finance">Wealth Management & Financial Advisory</option>
                    <option value="insurance">Insurance Claims & Policy Underwriting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Initial Lifecycle Status</label>
                  <select value={newProjStatus} onChange={(e) => setNewProjStatus(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white">
                    <option value="Live">🟢 Live (Accepts client interactions immediately)</option>
                    <option value="Paused">🟡 Paused (Temporarily in maintenance)</option>
                    <option value="Draft">⚪ Draft (In development / playground testing only)</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-lg shadow-blue-500/20">Create Agent</button>
              </form>

              {/* Agent List & Lifecycle Status Switches */}
              <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Configured Organization Agents</h3>
                  <span className="text-xs text-slate-400">{projects.length} Agents Configured</span>
                </div>
                <div className="space-y-3">
                  {projects.map((proj) => {
                    const st = proj.status || 'Live';
                    return (
                      <div key={proj.id} className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-white text-sm">{proj.name}</h4>
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">{proj.domain}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">ID: {proj.id.slice(0, 16)}...</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400 mr-2">Lifecycle:</span>
                          {(['Live', 'Paused', 'Draft'] as const).map((statusOption) => (
                            <button
                              key={statusOption}
                              onClick={() => handleStatusToggle(proj.id, statusOption)}
                              className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${
                                (st === statusOption || (st === 'active' && statusOption === 'Live'))
                                  ? statusOption === 'Live'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                                    : statusOption === 'Paused'
                                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold'
                                    : 'bg-slate-600 text-white shadow-md font-bold'
                                  : 'bg-slate-700/70 text-slate-400 hover:text-white'
                              }`}
                            >
                              {statusOption}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AGENT PLAYGROUND SIMULATOR */}
        {activeTab === 'playground' && (
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-6 max-w-5xl mx-auto shadow-2xl">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div>
                <h3 className="text-lg font-bold text-blue-400 flex items-center space-x-2">
                  <span>🎮 Interactive Agent Playground</span>
                  <span className="text-xs bg-blue-950 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-800">Real LLM & RAG</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Testing agent: <strong>{selectedProject?.name || 'Selected Agent'}</strong> ({selectedProject?.status || 'Live'}) with Chroma Vector Store & OpenRouter LLM.
                </p>
              </div>
              <button onClick={() => setPlaygroundLogs([])} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">Clear Simulator</button>
            </div>

            {/* Chat Transcript Window */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 h-[420px] overflow-y-auto space-y-4 font-sans text-sm">
              {playgroundLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-24 text-xs space-y-2">
                  <p className="font-semibold text-slate-400">Ready to test agent execution</p>
                  <p>Type a test inquiry below to run two-pass guardrails, retrieve local Chroma passages, and generate real OpenRouter LLM replies.</p>
                </div>
              ) : (
                playgroundLogs.map((log, idx) => (
                  <div key={idx} className={`p-4 rounded-xl ${log.role === 'user' ? 'bg-blue-950/40 border border-blue-900/60 text-blue-100 ml-12' : 'bg-slate-900/90 border border-slate-800 text-slate-100 mr-8 shadow-lg'}`}>
                    <div className="text-xs font-semibold mb-1 flex items-center justify-between">
                      <span className={log.role === 'user' ? 'text-blue-400' : 'text-emerald-400'}>{log.role === 'user' ? '👤 Admin Test Query' : '🤖 OpenRouter Agent Response'}</span>
                      {log.model_used && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">{log.model_used}</span>}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{log.content}</div>

                    {/* Telemetry Bar & Context Inspector */}
                    {log.role === 'assistant' && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
                          <span>Intent: <strong className="text-blue-400">{log.intent}</strong></span>
                          <span>Latency: <strong className="text-purple-400">{log.latency_ms}ms</strong></span>
                          <span>Tokens: <strong className="text-amber-400">{log.tokens_used}</strong></span>
                          <span>Escalation: <strong className={log.should_escalate ? 'text-red-400' : 'text-emerald-400'}>{log.should_escalate ? 'Triggered' : 'Normal'}</strong></span>
                        </div>

                        {/* RAG Context Badges */}
                        {log.rag_passages && log.rag_passages.length > 0 && (
                          <div className="mt-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs font-sans">
                            <div className="flex items-center justify-between mb-1.5 cursor-pointer" onClick={() => setExpandedPassagesIdx(expandedPassagesIdx === idx ? null : idx)}>
                              <span className="text-indigo-400 font-semibold flex items-center space-x-1.5">
                                <span>📚 RAG Vector Context:</span>
                                <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full text-[10px] border border-indigo-800">{log.rag_passages.length} passages retrieved</span>
                              </span>
                              <span className="text-slate-500 text-[10px]">{expandedPassagesIdx === idx ? '▲ Collapse' : '▼ Expand'}</span>
                            </div>
                            {expandedPassagesIdx === idx && (
                              <div className="space-y-2 mt-2 pt-2 border-t border-slate-800">
                                {log.rag_passages.map((p: any, pIdx: number) => (
                                  <div key={pIdx} className="bg-slate-900 p-2 rounded border border-slate-800/60 text-xs text-slate-300">
                                    <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                                      <span>Source: {p.filename || 'Doc'}</span>
                                      <span>Dist: {p.score}</span>
                                    </div>
                                    <p className="mt-1 text-slate-200">{p.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Executed Tools Badges */}
                        {log.tool_calls && log.tool_calls.length > 0 && (
                          <div className="mt-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300">
                            <span>⚡ Executed API Tools: {log.tool_calls.map((t: any) => t.tool).join(', ')}</span>
                          </div>
                        )}
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
                placeholder="Enter prompt (e.g. What are the requirements for a retail savings account?)"
                value={playgroundQuery}
                onChange={(e) => setPlaygroundQuery(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isPlaygroundTesting || !selectedProjectId}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-500/20"
              >
                {isPlaygroundTesting ? 'Testing LLM...' : 'Run Simulation'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: KNOWLEDGE BASE & RAG WEB CRAWLER */}
        {activeTab === 'kb' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Web Crawler Ingestion Card */}
              <form onSubmit={handleCrawlUrl} className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🌐</span>
                  <div>
                    <h3 className="text-base font-bold text-blue-400">RAG Web Crawler</h3>
                    <p className="text-xs text-slate-400">Fetch web URL, clean HTML, chunk text, and index into Chroma vector store</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Webpage URL</label>
                  <input
                    type="url"
                    placeholder="https://en.wikipedia.org/wiki/Retail_banking"
                    value={crawlUrlInput}
                    onChange={(e) => setCrawlUrlInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCrawling || !selectedProjectId}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm shadow-md transition"
                >
                  {isCrawling ? 'Crawling & Indexing Passages...' : 'Crawl & Index to Vector Store'}
                </button>
                {crawlSuccessInfo && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 rounded-lg text-xs space-y-1">
                    <p className="font-semibold">✓ Indexed {crawlSuccessInfo.doc_metadata?.chunks_count || 1} semantic chunks!</p>
                    <p className="text-slate-300">Title: {crawlSuccessInfo.doc_metadata?.title || crawlSuccessInfo.filename}</p>
                  </div>
                )}
              </form>

              {/* Document File Uploader */}
              <form onSubmit={handleUploadKb} className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📄</span>
                  <div>
                    <h3 className="text-base font-bold text-indigo-400">Document Vector Ingestion</h3>
                    <p className="text-xs text-slate-400">Upload PDF, Markdown, or TXT policy documents</p>
                  </div>
                </div>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
                <button type="submit" disabled={!selectedFile} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                  Upload & Index File
                </button>
              </form>
            </div>

            {/* Indexed Documents Table */}
            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-base">Indexed Knowledge Documents in Chroma</h4>
                <span className="text-xs text-slate-400">{kbDocs.length} Documents in Vector Store</span>
              </div>
              <div className="space-y-2">
                {kbDocs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No knowledge documents indexed yet. Use the web crawler or document uploader above.</p>
                ) : (
                  kbDocs.map((doc) => (
                    <div key={doc.id} className="bg-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-sm border border-slate-700/50">
                      <div className="flex items-center space-x-3">
                        <span className="text-base">{doc.filename.startsWith('Web:') ? '🌐' : '📄'}</span>
                        <div>
                          <div className="font-semibold text-slate-200 text-sm">{doc.filename}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            Collection: {doc.collection_name} • Chunks: {doc.doc_metadata?.chunks_count || '1+'} • Size: {(doc.file_size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {doc.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURATION & PROMPTS */}
        {activeTab === 'config' && (
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-6 max-w-3xl shadow-xl">
            <h3 className="text-base font-bold text-blue-400">Agent System Prompt & Two-Pass Guardrails</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">System Prompt</label>
                <textarea rows={5} value={configPrompt} onChange={(e) => setConfigPrompt(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Blocked Topics (comma separated)</label>
                <input type="text" value={blockedTopics} onChange={(e) => setBlockedTopics(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Required Disclaimers (comma separated)</label>
                <input type="text" value={disclaimers} onChange={(e) => setDisclaimers(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white" />
              </div>
              <button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition">Save Configuration</button>
            </div>
          </div>
        )}

        {/* TAB 5: API INTEGRATIONS & SECRET VAULT */}
        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleCreateIntegration} className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-blue-400">Add External API Tool Integration</h3>
              <input type="text" placeholder="Integration Name (e.g. Core Banking API)" value={integName} onChange={(e) => setIntegName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" required />
              <input type="text" placeholder="Base URL (e.g. https://httpbin.org)" value={integBaseUrl} onChange={(e) => setIntegBaseUrl(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" required />
              <input type="password" placeholder="API Secret / Token (Fernet Vault Encrypted)" value={integSecret} onChange={(e) => setIntegSecret(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-sm font-semibold transition">Save to Secret Vault</button>
            </form>

            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h4 className="font-bold text-white text-base">Configured Tools & Integrations</h4>
              {integrations.map((item) => (
                <div key={item.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700/60">
                  <div>
                    <h5 className="font-bold text-white text-sm">{item.name}</h5>
                    <p className="text-xs text-slate-400 font-mono">{item.base_url}</p>
                  </div>
                  <button onClick={() => handleTestCall(item.id)} className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1.5 rounded-lg font-semibold text-white">Test Call</button>
                </div>
              ))}
              {testResult && <pre className="p-3 bg-black rounded-lg text-xs text-emerald-400 overflow-x-auto">{JSON.stringify(testResult, null, 2)}</pre>}
            </div>
          </div>
        )}

        {/* TAB 6: ORGS & CLIENT USERS */}
        {activeTab === 'orgs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleCreateOrg} className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-blue-400">Create New Organization</h3>
              <input type="text" placeholder="Org Name (e.g. Standard Chartered)" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white" required />
              <input type="text" placeholder="Org Slug (e.g. standard-chartered)" value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white" required />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold">Create Org</button>
            </form>

            <form onSubmit={handleCreateOrgUser} className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-emerald-400">Onboard Client User for Active Org</h3>
              <input type="email" placeholder="Client Email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" required />
              <input type="password" placeholder="Temporary Password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" required />
              <input type="text" placeholder="Full Name" value={userFullName} onChange={(e) => setUserFullName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" required />
              <div>
                <label className="block text-xs text-slate-400 mb-1">User Role</label>
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white">
                  <option value="lead">Lead Operator (Assigned agents only)</option>
                  <option value="supervisor">Supervisor (All Org agents & analytics)</option>
                </select>
              </div>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-semibold">Create Client User</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
