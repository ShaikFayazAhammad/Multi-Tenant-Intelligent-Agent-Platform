import React, { useState } from 'react';
import { adminApi } from '../services/api';
import type { PlaygroundLog, Project } from '../types';

interface PlaygroundViewProps {
  selectedProject: Project | undefined;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

const EXAMPLE_QUERIES = [
  'What is the balance for account ACC100234?',
  'What is the status of loan LN882211?',
  'Get details for insurance policy POL99212',
  'Calculate EMI for loan of 500000 at 9.5% for 36 months',
  'What are the requirements for opening a retail savings account?',
  'Search contacts for John in HubSpot CRM',
];

export default function PlaygroundView({ selectedProject, onMessage }: PlaygroundViewProps) {
  const [logs, setLogs] = useState<PlaygroundLog[]>([]);
  const [query, setQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [expandedPassages, setExpandedPassages] = useState<number | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<number | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent, presetQuery?: string) => {
    e.preventDefault();
    const finalQuery = presetQuery || query.trim();
    if (!selectedProject?.id || !finalQuery) return;

    const userLog: PlaygroundLog = { role: 'user', content: finalQuery };
    setLogs((prev) => [...prev, userLog]);
    setQuery('');
    setIsTesting(true);

    try {
      const res = await adminApi.testPlaygroundChat(selectedProject.id, finalQuery);
      const assistantLog: PlaygroundLog = {
        role: 'assistant',
        content: res.answer || '(no response)',
        intent: res.intent,
        rag_passages: res.rag_passages || [],
        tool_calls: res.tool_calls || [],
        should_escalate: res.should_escalate,
        is_flagged: res.is_flagged,
        latency_ms: res.latency_ms,
        tokens_used: res.tokens_used,
        model_used: res.model_used,
      };
      setLogs((prev) => [...prev, assistantLog]);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      setLogs((prev) => [...prev, { role: 'assistant', content: '⚠️ Agent simulation failed. Check backend connectivity.' }]);
      onMessage('Playground test execution failed', 'error');
    } finally { setIsTesting(false); }
  };

  if (!selectedProject) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon">🎮</div>
        <div className="empty-state-title">No agent selected</div>
        <div className="empty-state-desc">Select an agent from the header to launch the Playground simulator</div>
      </div>
    );
  }

  const st = (selectedProject.status || '').toLowerCase();
  const isDraft = st === 'draft';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Agent Playground</div>
          <div className="section-subtitle">
            Full simulation: Input Guardrails → ChromaDB RAG → Tool Calls → OpenRouter LLM → Output Guardrails
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="badge badge-indigo">🔬 Sandbox Mode</div>
          {isDraft && <div className="badge badge-draft">Draft Agent</div>}
          <button className="btn btn-secondary btn-sm" onClick={() => setLogs([])}>Clear Chat</button>
        </div>
      </div>

      {/* Agent Info Strip */}
      <div style={{
        padding: '12px 16px', borderRadius: 12,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedProject.name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Domain: {selectedProject.domain.toUpperCase()} · Playground bypasses lifecycle status gates
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="badge badge-emerald">RAG Active</div>
          <div className="badge badge-sky">OpenRouter LLM</div>
          <div className="badge badge-amber">Guardrails On</div>
        </div>
      </div>

      {/* Example Queries */}
      {logs.length === 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 10 }}>💡 Try these example queries:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11, textAlign: 'left', whiteSpace: 'normal', maxWidth: 280 }}
                onClick={(e) => handleSend(e, q)}
                disabled={isTesting}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="playground-chat">
        {logs.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎮</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Ready to simulate</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, textAlign: 'center' }}>
              Type a test query below to run the full agent pipeline
            </div>
          </div>
        )}

        {logs.map((log, idx) => (
          <div key={idx}>
            {log.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="chat-bubble-user">
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    👤 Test Query
                  </div>
                  {log.content}
                </div>
              </div>
            ) : (
              <div className="chat-bubble-assistant">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🤖 Agent Response
                  </div>
                  {log.model_used && (
                    <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}>
                      {log.model_used}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{log.content}</div>

                {/* Flags */}
                {(log.should_escalate || log.is_flagged) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {log.should_escalate && <span className="badge badge-rose">🔺 Escalation Triggered</span>}
                    {log.is_flagged && <span className="badge badge-amber">⚠️ Content Flagged</span>}
                  </div>
                )}

                {/* Telemetry */}
                <div className="telemetry-bar">
                  {log.intent && (
                    <div className="telemetry-item">
                      Intent: <strong>{log.intent}</strong>
                    </div>
                  )}
                  {log.latency_ms !== undefined && (
                    <div className="telemetry-item" style={{ color: '#c084fc' }}>
                      Latency: <strong>{log.latency_ms?.toFixed(0)}ms</strong>
                    </div>
                  )}
                  {log.tokens_used !== undefined && (
                    <div className="telemetry-item" style={{ color: '#fbbf24' }}>
                      Tokens: <strong>{log.tokens_used}</strong>
                    </div>
                  )}
                  {log.rag_passages && log.rag_passages.length > 0 && (
                    <div className="telemetry-item">
                      <span style={{ color: '#818cf8' }}>RAG Passages: <strong>{log.rag_passages.length}</strong></span>
                    </div>
                  )}
                  {log.tool_calls && log.tool_calls.length > 0 && (
                    <div className="telemetry-item" style={{ color: '#06b6d4' }}>
                      Tools: <strong>{log.tool_calls.map((t) => t.tool).join(', ')}</strong>
                    </div>
                  )}
                </div>

                {/* RAG Passages Accordion */}
                {log.rag_passages && log.rag_passages.length > 0 && (
                  <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div
                      className="accordion-header"
                      onClick={() => setExpandedPassages(expandedPassages === idx ? null : idx)}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#818cf8' }}>
                        📚 RAG Context — {log.rag_passages.length} passages retrieved
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {expandedPassages === idx ? '▲ Collapse' : '▼ Expand'}
                      </span>
                    </div>
                    {expandedPassages === idx && (
                      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {log.rag_passages.map((p, pIdx) => (
                          <div key={pIdx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                              <span>📄 {p.filename || 'Vector Document'}</span>
                              <span>Score: {typeof p.score === 'number' ? p.score.toFixed(3) : p.score}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{p.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tool Execution Results Accordion */}
                {log.tool_calls && log.tool_calls.length > 0 && (
                  <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid rgba(6,182,212,0.3)' }}>
                    <div
                      className="accordion-header"
                      onClick={() => setExpandedToolCalls(expandedToolCalls === idx ? null : idx)}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚡</span>
                        <span>API Tool Executions — {log.tool_calls.length} invoked</span>
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {expandedToolCalls === idx ? '▲ Collapse' : '▼ View Details'}
                      </span>
                    </div>

                    {(expandedToolCalls === idx || expandedToolCalls === null) && (
                      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {log.tool_calls.map((tc, tcIdx) => {
                          const isSuccess = tc.status === 'success' || ((tc.status_code || 0) >= 200 && (tc.status_code || 0) < 400);
                          return (
                            <div
                              key={tcIdx}
                              style={{
                                background: isSuccess ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.08)',
                                border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.3)'}`,
                                borderRadius: 8,
                                padding: '12px 14px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {tc.tool}
                                  </span>
                                  {tc.endpoint && (
                                    <span style={{
                                      fontSize: 10,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: 'rgba(255,255,255,0.06)',
                                      color: 'var(--color-text-secondary)',
                                      fontFamily: 'JetBrains Mono, monospace',
                                    }}>
                                      {tc.endpoint}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className={`badge ${isSuccess ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: 10 }}>
                                    {isSuccess ? `✓ ${tc.status_code || 200} OK` : `✕ ${tc.status_code || 500} ERROR`}
                                  </span>
                                  {tc.latency_ms !== undefined && (
                                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                      {tc.latency_ms.toFixed(1)}ms
                                    </span>
                                  )}
                                </div>
                              </div>

                              {tc.description && (
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                  {tc.description}
                                </div>
                              )}

                              {tc.error && (
                                <div style={{
                                  background: 'rgba(239,68,68,0.15)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  borderRadius: 6,
                                  padding: '8px 10px',
                                  fontSize: 11,
                                  color: '#f87171',
                                  marginBottom: 8,
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}>
                                  ⚠️ {typeof tc.error === 'string' ? tc.error : JSON.stringify(tc.error)}
                                </div>
                              )}

                              {tc.result !== undefined && tc.result !== null && (
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                    Response Payload
                                  </div>
                                  <pre style={{
                                    margin: 0,
                                    background: 'rgba(0,0,0,0.4)',
                                    borderRadius: 6,
                                    padding: '8px 10px',
                                    fontSize: 11,
                                    fontFamily: 'JetBrains Mono, monospace',
                                    color: '#a5f3fc',
                                    overflowX: 'auto',
                                    maxHeight: 180,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                  }}>
                                    {typeof tc.result === 'object' ? JSON.stringify(tc.result, null, 2) : String(tc.result)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isTesting && (
          <div className="chat-bubble-assistant" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="spinner" />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Running guardrails → RAG → LLM inference…</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Enter a test query (e.g. What are the loan requirements?)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isTesting}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isTesting || !query.trim()}
          style={{ flexShrink: 0 }}
        >
          {isTesting ? <><div className="spinner" /> Running…</> : '🚀 Run Simulation'}
        </button>
      </form>
    </div>
  );
}
