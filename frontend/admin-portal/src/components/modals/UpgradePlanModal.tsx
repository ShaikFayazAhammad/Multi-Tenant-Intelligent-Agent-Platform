import React from 'react';
import { Sparkles, Zap, Check, X, Layers, Bot, ArrowRight, ShieldCheck } from 'lucide-react';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planName: 'pro' | 'ultra_pro') => void;
  title?: string;
  message?: string;
  currentCount?: number;
  limitCount?: number;
}

export default function UpgradePlanModal({
  isOpen,
  onClose,
  onSelectPlan,
  title = 'Plan Limit Reached',
  message = "You've reached your Free tier quota (1 active agent & project). Upgrade to scale your intelligent agent platform.",
  currentCount = 1,
  limitCount = 1,
}: UpgradePlanModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #161b2e 0%, #0d111f 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.2)',
          borderRadius: 20,
          maxWidth: 620,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent Bar */}
        <div
          style={{
            height: 4,
            width: '100%',
            background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #06b6d4 100%)',
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <X size={16} />
        </button>

        <div style={{ padding: '28px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(99, 102, 241, 0.3) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
                flexShrink: 0,
              }}
            >
              <Zap size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  Quota Full ({currentCount}/{limitCount})
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: '#818cf8',
                    background: 'rgba(99, 102, 241, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  Free Tier
                </span>
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  margin: '4px 0 0',
                  letterSpacing: -0.4,
                }}
              >
                {title}
              </h2>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 22px' }}>
            {message}
          </p>

          {/* Plan Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {/* Pro Plan Card */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.04) 100%)',
                border: '1.5px solid rgba(99, 102, 241, 0.45)',
                borderRadius: 14,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  right: 12,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 20,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Popular
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Pro Tier
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4, marginBottom: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#a5b4fc' }}>₹999</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>/ month</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0' }}>
                    <Check size={14} color="#10b981" />
                    <strong>5 Active Agents & Projects</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
                    <Check size={14} color="#10b981" />
                    <span>15 Knowledge Base Docs</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
                    <Check size={14} color="#10b981" />
                    <span>Full API Vault Integrations</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
                    <Check size={14} color="#10b981" />
                    <span>5,000 Conversations / mo</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm btn-full"
                style={{ marginTop: 16, justifyContent: 'center' }}
                onClick={() => onSelectPlan('pro')}
              >
                <Sparkles size={14} /> Upgrade to Pro
              </button>
            </div>

            {/* Ultra Pro Plan Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Ultra Pro Tier
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4, marginBottom: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>₹2,999</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>/ month</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0' }}>
                    <Check size={14} color="#6366f1" />
                    <strong>10 Active Agents & Projects</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
                    <Check size={14} color="#6366f1" />
                    <span>50 Knowledge Base Docs</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
                    <Check size={14} color="#6366f1" />
                    <span>HubSpot CRM & Webhooks</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
                    <Check size={14} color="#6366f1" />
                    <span>25,000 Conversations / mo</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm btn-full"
                style={{ marginTop: 16, justifyContent: 'center' }}
                onClick={() => onSelectPlan('ultra_pro')}
              >
                Upgrade to Ultra Pro
              </button>
            </div>
          </div>

          {/* Footer note & Dismiss */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 12,
            }}
          >
            <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Instant provisioning via Razorpay Test/Live cards</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 8px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
