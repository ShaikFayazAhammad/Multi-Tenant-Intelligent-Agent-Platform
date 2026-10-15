import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { ProjectConfig, DomainTemplate, Project } from '../types';

interface PromptConfigViewProps {
  selectedProject: Project | undefined;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

const LLM_MODELS = [
  { value: 'google/gemini-2.0-flash-001', label: '⚡ Gemini 2.0 Flash (Fast, Cost-efficient)' },
  { value: 'gpt-4o-mini', label: '🧠 GPT-4o Mini (Balanced)' },
  { value: 'openai/gpt-4o', label: '🔥 GPT-4o (Most Capable)' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: '🦙 Llama 3.1 70B (Open Source)' },
  { value: 'anthropic/claude-3-haiku', label: '🎭 Claude 3 Haiku (Fast)' },
];

export default function PromptConfigView({ selectedProject, onMessage }: PromptConfigViewProps) {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [templates, setTemplates] = useState<DomainTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local edit state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [blockedTopics, setBlockedTopics] = useState('');
  const [disclaimers, setDisclaimers] = useState('');
  const [piiMasking, setPiiMasking] = useState(true);
  const [negSentimentTurns, setNegSentimentTurns] = useState('2');
  const [llmModel, setLlmModel] = useState('google/gemini-2.0-flash-001');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(1000);

  useEffect(() => {
    if (selectedProject?.id) loadConfig(selectedProject.id);
    adminApi.getTemplates().then(setTemplates).catch(() => {});
  }, [selectedProject?.id]);

  const loadConfig = async (projId: string) => {
    setLoading(true);
    try {
      const data = await adminApi.getConfig(projId);
      setConfig(data);
      setSystemPrompt(data.system_prompt || '');
      setBlockedTopics((data.guardrails?.blocked_topics || []).join(', '));
      setDisclaimers((data.guardrails?.required_disclaimers || []).join(', '));
      setPiiMasking(data.guardrails?.pii_masking ?? true);
      setNegSentimentTurns(String(data.guardrails?.escalation_rules?.negative_sentiment_turns || 2));
      setLlmModel(data.agent_settings?.llm_model || 'google/gemini-2.0-flash-001');
      setTemperature(data.agent_settings?.temperature ?? 0.2);
      setMaxTokens(data.agent_settings?.max_tokens ?? 1000);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selectedProject?.id) return;
    setSaving(true);
    try {
      await adminApi.updateConfig(selectedProject.id, {
        system_prompt: systemPrompt,
        guardrails: {
          blocked_topics: blockedTopics.split(',').map((s) => s.trim()).filter(Boolean),
          required_disclaimers: disclaimers.split(',').map((s) => s.trim()).filter(Boolean),
          pii_masking: piiMasking,
          escalation_rules: { negative_sentiment_turns: parseInt(negSentimentTurns) || 2 },
        },
        agent_settings: { llm_model: llmModel, temperature, max_tokens: maxTokens },
      });
      onMessage('✅ Agent configuration saved successfully', 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to save configuration', 'error');
    } finally { setSaving(false); }
  };

  const applyTemplate = (template: DomainTemplate) => {
    setSystemPrompt(template.default_prompt);
    const g = template.default_guardrails;
    setBlockedTopics((g.blocked_topics || []).join(', '));
    setDisclaimers((g.required_disclaimers || []).join(', '));
    setPiiMasking(g.pii_masking ?? true);
    const s = template.default_agent_settings;
    setLlmModel(s.llm_model || 'google/gemini-2.0-flash-001');
    setTemperature(s.temperature ?? 0.2);
    setMaxTokens(s.max_tokens ?? 1000);
    onMessage(`✅ Applied ${template.name} template — save to persist`, 'success');
  };

  if (!selectedProject) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon">✍️</div>
        <div className="empty-state-title">No agent selected</div>
        <div className="empty-state-desc">Select or create an agent first from Projects & Agents</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-header">
        <div>
          <div className="section-title">Configure Prompt & Guardrails</div>
          <div className="section-subtitle">
            Configuring: <strong style={{ color: 'var(--color-text-accent)' }}>{selectedProject.name}</strong>
            {' '}({selectedProject.domain.toUpperCase()})
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><div className="spinner" /> Saving…</> : '💾 Save Configuration'}
        </button>
      </div>

      {/* Domain Templates */}
      {templates.length > 0 && (
        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Quick Templates</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Pre-built domain templates to accelerate configuration</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {templates.map((t) => (
              <button
                key={t.domain}
                className="btn btn-secondary btn-sm"
                onClick={() => applyTemplate(t)}
              >
                {t.domain === 'banking' ? '🏦' : t.domain === 'finance' ? '📈' : '🛡️'} {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* System Prompt */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>System Prompt</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Define the agent's persona, capabilities, tone, and behavior. This prompt is prepended to every conversation.
            </div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : (
            <textarea
              className="form-textarea"
              style={{ minHeight: 160 }}
              placeholder="You are a professional BFSI AI Assistant specializing in..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
            {systemPrompt.length} characters · {Math.round(systemPrompt.split(/\s+/).length)} tokens (approx.)
          </div>
        </div>

        {/* Guardrails */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>🛡️ Two-Pass Guardrails</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Input pre-check & output post-check safety filters</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Blocked Topics (comma-separated)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. crypto gambling, money laundering, insider trading"
                value={blockedTopics}
                onChange={(e) => setBlockedTopics(e.target.value)}
              />
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Queries matching these topics are blocked at the input guardrail stage
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Required Disclaimers (comma-separated)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Not financial advice, Subject to market risks"
                value={disclaimers}
                onChange={(e) => setDisclaimers(e.target.value)}
              />
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                These disclaimers are appended to every agent response automatically
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>PII Masking</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Auto-mask credit cards, SSNs, phone numbers in outputs
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPiiMasking((v) => !v)}
                style={{
                  width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: piiMasking ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'all 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: piiMasking ? 22 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Escalation: Negative Sentiment Turns</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={10}
                value={negSentimentTurns}
                onChange={(e) => setNegSentimentTurns(e.target.value)}
              />
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Auto-escalate after this many consecutive negative-sentiment turns
              </div>
            </div>
          </div>
        </div>

        {/* LLM Settings */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>⚙️ LLM & Inference Settings</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>OpenRouter model configuration and generation parameters</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">OpenRouter Model</label>
              <select
                className="form-select"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
              >
                {LLM_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Temperature: <strong style={{ color: '#a5b4fc' }}>{temperature}</strong>
              </label>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                <span>0.0 — Deterministic, precise</span>
                <span>1.0 — Creative, varied</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Max Tokens</label>
              <input
                className="form-input"
                type="number"
                min={100}
                max={4096}
                step={100}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
              />
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Maximum number of tokens per response
              </div>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 4 }}>🔍 Configuration Preview</div>
              <pre style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8, overflow: 'auto' }}>
{JSON.stringify({ llm_model: llmModel, temperature, max_tokens: maxTokens }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Save Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><div className="spinner" /> Saving Configuration…</> : '💾 Save All Configuration'}
        </button>
      </div>
    </div>
  );
}
