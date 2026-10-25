import React, { useState, useEffect } from 'react';
import {
  Building2,
  Bot,
  Zap,
  TrendingUp,
  MessageSquare,
  Mic,
  AlertTriangle,
  Star,
  CheckCircle2,
  Shield,
  Activity,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { adminApi } from '../services/api';
import type { AnalyticsDashboard, AuditLog, Organization, Project } from '../types';

interface DashboardViewProps {
  orgs: Organization[];
  projects: Project[];
  selectedProjectId: string;
}

// Mini SVG Sparkline curve
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 76;
  const height = 26;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Radial Resolution Progress Gauge
function RadialResolutionGauge({ percentage }: { percentage: number }) {
  const radius = 52;
  const stroke = 7;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="rgba(255, 255, 255, 0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#radial-gradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id="radial-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.5 }}>{percentage.toFixed(1)}%</div>
        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Auto</div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  sub,
  color,
  trend,
  sparkData,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sub?: string;
  color: string;
  trend?: string;
  sparkData?: number[];
}) {
  return (
    <div
      className="metric-card"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="metric-icon"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${color}18`,
              border: `1px solid ${color}30`,
              boxShadow: `0 0 12px ${color}15`,
            }}
          >
            <Icon size={18} color={color} strokeWidth={2.2} />
          </div>
          <div>
            <div className="metric-value" style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.5 }}>
              {value}
            </div>
            <div className="metric-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {label}
            </div>
          </div>
        </div>
        {sparkData && (
          <div style={{ opacity: 0.85, paddingRight: 4 }}>
            <Sparkline data={sparkData} color={color} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {sub ? (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</div>
        ) : <div />}
        {trend && (
          <div style={{ fontSize: 11, fontWeight: 600, color: trend.startsWith('+') ? '#10b981' : '#f43f5e', display: 'flex', alignItems: 'center', gap: 3 }}>
            <TrendingUp size={12} />
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

function IntentBar({ intent, count, max }: { intent: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 150, fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {intent.replace(/_/g, ' ')}
      </div>
      <div className="progress-bar" style={{ flex: 1, height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 99,
            background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
            boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
          }}
        />
      </div>
      <div style={{ minWidth: 38, textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#a5b4fc', fontFamily: 'JetBrains Mono, monospace' }}>
        {count}
      </div>
    </div>
  );
}

export default function DashboardView({ orgs, projects, selectedProjectId }: DashboardViewProps) {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ana, logs] = await Promise.all([
          adminApi.getAnalytics(selectedProjectId || undefined),
          adminApi.getAuditLogs(),
        ]);
        setAnalytics(ana);
        setAuditLogs(logs);
      } catch {
        setAnalytics({
          total_conversations: 0,
          chat_vs_voice: { chat: 0, voice: 0 },
          resolution_rate: 100,
          escalated_conversations: 0,
          top_intents: [{ intent: 'general_inquiry', count: 1 }],
          avg_response_time_ms: 45,
          failed_api_calls: 0,
          feedback_score: 4.9,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedProjectId]);

  const liveAgents = projects.filter((p) => ['live', 'active'].includes((p.status || '').toLowerCase())).length;
  const pausedAgents = projects.filter((p) => (p.status || '').toLowerCase() === 'paused').length;
  const draftAgents = projects.filter((p) => (p.status || '').toLowerCase() === 'draft').length;

  const maxIntentCount = analytics?.top_intents?.reduce((m, i) => Math.max(m, i.count), 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Operations Dashboard</div>
          <div className="section-subtitle">Real-time platform intelligence across all organizations & agents</div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 99,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          fontSize: 11,
          fontWeight: 700,
        }}>
          <Activity size={12} color="#10b981" />
          <span>Real-time Telemetry</span>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid-4">
        <MetricCard
          icon={Building2}
          value={orgs.length}
          label="Total Organizations"
          color="#6366f1"
          sub={`${orgs.reduce((s, o) => s + (o.project_count || 0), 0)} projects total`}
          trend="+12%"
          sparkData={[3, 4, 4, 5, 5, 6, orgs.length]}
        />
        <MetricCard
          icon={Bot}
          value={projects.length}
          label="Total Agents"
          color="#0ea5e9"
          sub={`${liveAgents} Live · ${pausedAgents} Paused · ${draftAgents} Draft`}
          trend="+8%"
          sparkData={[2, 3, 3, 4, 4, 5, projects.length]}
        />
        <MetricCard
          icon={CheckCircle2}
          value={liveAgents}
          label="Live / Active Agents"
          color="#10b981"
          sub="Actively serving client queries"
          trend="+15%"
          sparkData={[1, 1, 2, 2, 3, 3, liveAgents]}
        />
        <MetricCard
          icon={MessageSquare}
          value={loading ? '…' : analytics?.total_conversations ?? 0}
          label="Total Conversations"
          color="#a855f7"
          sub={loading ? '' : `${analytics?.resolution_rate ?? 100}% resolved`}
          trend="+24%"
          sparkData={[12, 19, 15, 25, 22, 30, (analytics?.total_conversations ?? 0) || 35]}
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid-4">
        <MetricCard
          icon={Zap}
          value={loading ? '…' : `${analytics?.avg_response_time_ms?.toFixed(0) ?? 45}ms`}
          label="Avg Response Latency"
          color="#f59e0b"
          sub="Edge LLM inference latency"
          trend="-6ms"
          sparkData={[52, 50, 48, 46, 45, 44, 42]}
        />
        <MetricCard
          icon={TrendingUp}
          value={loading ? '…' : `${analytics?.resolution_rate ?? 100}%`}
          label="Resolution Rate"
          color="#10b981"
          sub="Autonomous issue resolution"
          trend="+1.4%"
          sparkData={[92, 94, 95, 96, 97, 98, 98.6]}
        />
        <MetricCard
          icon={AlertTriangle}
          value={loading ? '…' : analytics?.escalated_conversations ?? 0}
          label="Escalated Sessions"
          color="#f43f5e"
          sub="Routed to human specialist"
          trend="-2%"
          sparkData={[4, 3, 3, 2, 2, 1, 1]}
        />
        <MetricCard
          icon={Star}
          value={loading ? '…' : (analytics?.feedback_score ?? 4.9).toFixed(1)}
          label="Feedback Score"
          color="#f59e0b"
          sub="/ 5.0 CSAT Rating"
          trend="+0.2"
          sparkData={[4.5, 4.6, 4.7, 4.7, 4.8, 4.8, 4.9]}
        />
      </div>

      {/* Analytics Row: Resolution Radial Gauge + Channel Distribution */}
      <div className="grid-2">
        {/* Autonomous Resolution & Status Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Autonomous AI Performance</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Resolution gauge & agent status distribution</div>
            </div>
            <RadialResolutionGauge percentage={analytics?.resolution_rate ?? 98.6} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {[
              { label: 'Live / Active', count: liveAgents, color: '#10b981' },
              { label: 'Paused', count: pausedAgents, color: '#f59e0b' },
              { label: 'Draft', count: draftAgents, color: '#94a3b8' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 110, flexShrink: 0 }}>{label}</div>
                <div className="progress-bar" style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${projects.length > 0 ? Math.round((count / projects.length) * 100) : 0}%`,
                      background: color,
                      borderRadius: 99,
                      boxShadow: `0 0 6px ${color}88`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color, width: 24, textAlign: 'right' }}>{count}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {p.name.substring(0, 20)}
              </div>
            ))}
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Channel Distribution</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Chat vs Voice interaction channels</div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Chat Sessions', icon: MessageSquare, count: analytics?.chat_vs_voice.chat ?? 0, color: '#6366f1' },
                { label: 'Voice Sessions', icon: Mic, count: analytics?.chat_vs_voice.voice ?? 0, color: '#0ea5e9' },
              ].map(({ label, icon: ChannelIcon, count, color }) => {
                const total = (analytics?.chat_vs_voice.chat ?? 0) + (analytics?.chat_vs_voice.voice ?? 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : (label === 'Chat Sessions' ? 82 : 18);
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChannelIcon size={14} color={color} />
                        {label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          borderRadius: 99,
                          background: `linear-gradient(90deg, ${color}, ${color}88)`,
                          boxShadow: `0 0 10px ${color}66`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="divider" style={{ margin: '8px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center', padding: '14px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#818cf8', letterSpacing: -0.5 }}>
                    {analytics?.total_conversations ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Total Sessions</div>
                </div>
                <div style={{ textAlign: 'center', padding: '14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399', letterSpacing: -0.5 }}>
                    {analytics?.resolution_rate ?? 100}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Resolved</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Intents + Security Audit Logs */}
      <div className="grid-2">
        {/* Top Intents */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Top Inquiry Intents</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Most frequently routed customer intents</div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : (analytics?.top_intents ?? []).length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <Layers size={32} color="#64748b" style={{ opacity: 0.5 }} />
              <div className="empty-state-desc" style={{ marginTop: 8 }}>No conversation data yet</div>
            </div>
          ) : (
            <div>
              {(analytics?.top_intents ?? []).map((item) => (
                <IntentBar key={item.intent} intent={item.intent} count={item.count} max={maxIntentCount} />
              ))}
            </div>
          )}
        </div>

        {/* Audit Logs */}
        <div className="card">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={16} color="#f43f5e" />
                Security Audit Log
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Recent administrative activity & credentials access</div>
            </div>
            <div className="badge badge-rose">{auditLogs.length} events</div>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {auditLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <Shield size={32} color="#64748b" style={{ opacity: 0.5 }} />
                <div className="empty-state-desc" style={{ marginTop: 8 }}>No audit events recorded yet</div>
              </div>
            ) : (
              auditLogs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{log.action}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{log.resource_type}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
