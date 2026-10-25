import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Zap,
  Flame,
  Building,
  Shield,
  Layers,
  Bot,
  FileText,
  Key,
  MessageSquare,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { billingApi } from '../services/api';
import type {
  Organization,
  BillingPlan,
  SubscriptionWithUsage,
  PaymentTransaction,
} from '../types';

interface BillingViewProps {
  orgs: Organization[];
  selectedOrgId: string;
  onOrgChange: (orgId: string) => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
  currentUser?: {
    email?: string;
    full_name?: string;
    role?: string;
  } | null;
}

export default function BillingView({
  orgs,
  selectedOrgId,
  onOrgChange,
  onMessage,
  currentUser,
}: BillingViewProps) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subData, setSubData] = useState<SubscriptionWithUsage | null>(null);
  const [invoices, setInvoices] = useState<PaymentTransaction[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Test checkout modal state
  const [checkoutModal, setCheckoutModal] = useState<{
    open: boolean;
    orderId: string;
    amount: number;
    planName: string;
    planDisplayName: string;
    keyId: string;
  } | null>(null);

  // Test card form inputs
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardOtp, setCardOtp] = useState('123456');
  const [verifying, setVerifying] = useState(false);

  // Load plans & subscription
  const loadBillingData = useCallback(async () => {
    if (!selectedOrgId && orgs.length > 0) return;
    setLoading(true);
    try {
      const [plansData, subRes, invRes] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSubscription(selectedOrgId || undefined).catch(() => null),
        billingApi.getInvoices(selectedOrgId || undefined).catch(() => []),
      ]);
      setPlans(plansData);
      setSubData(subRes);
      setInvoices(invRes);
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to load billing information', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, orgs, onMessage]);

  // Dynamically load Razorpay checkout script
  useEffect(() => {
    const existing = document.getElementById('razorpay-checkout-script');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Handle plan upgrade trigger
  const handleInitiateUpgrade = async (plan: BillingPlan) => {
    if (plan.name === 'enterprise') {
      window.location.href = 'mailto:sales@bfsi-agents.com?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    setUpgradingPlan(plan.name);
    try {
      const order = await billingApi.createOrder(
        plan.name,
        billingCycle,
        selectedOrgId || undefined
      );

      // Check if official Razorpay checkout is available
      if ((window as any).Razorpay && order.razorpay_key_id && !order.razorpay_key_id.includes('mock')) {
        const options = {
          key: order.razorpay_key_id,
          amount: order.amount,
          currency: 'INR',
          name: 'BFSI Platform',
          description: `Upgrade to ${plan.display_name} (${billingCycle})`,
          order_id: order.order_id,
          handler: async function (response: any) {
            try {
              const res = await billingApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_name: plan.name,
                billing_cycle: billingCycle,
                org_id: selectedOrgId || undefined,
              });
              onMessage(res.message || `Upgraded to ${plan.display_name}!`, 'success');
              await loadBillingData();
            } catch (err: any) {
              onMessage(err?.response?.data?.detail || 'Signature verification failed', 'error');
            }
          },
          prefill: {
            name: currentUser?.full_name || 'Admin User',
            email: currentUser?.email || 'admin@bfsi.com',
            contact: '9999999999',
          },
          theme: {
            color: '#6366f1',
          },
          modal: {
            ondismiss: function () {
              setUpgradingPlan(null);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          onMessage(`Payment Failed: ${resp.error.description}`, 'error');
        });
        rzp.open();
      } else {
        // Fallback test modal
        setCheckoutModal({
          open: true,
          orderId: order.order_id,
          amount: order.amount,
          planName: plan.name,
          planDisplayName: plan.display_name,
          keyId: order.razorpay_key_id,
        });
      }
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to create upgrade order', 'error');
    } finally {
      setUpgradingPlan(null);
    }
  };

  // Complete payment simulation
  const handleCompletePayment = async (isSuccess: boolean = true) => {
    if (!checkoutModal) return;
    if (!isSuccess) {
      setCheckoutModal(null);
      onMessage('Payment was cancelled or failed.', 'error');
      return;
    }

    setVerifying(true);
    try {
      const paymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;
      const signature = `test_sig_${Math.random().toString(36).substring(2, 12)}`;

      const res = await billingApi.verifyPayment({
        razorpay_order_id: checkoutModal.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        plan_name: checkoutModal.planName,
        billing_cycle: billingCycle,
        org_id: selectedOrgId || undefined,
      });

      onMessage(res.message || `Upgraded to ${checkoutModal.planDisplayName} successfully!`, 'success');
      setCheckoutModal(null);
      await loadBillingData();
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Payment verification failed.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const currentPlanName = subData?.subscription?.plan?.name || 'free';
  const usage = subData?.usage;

  const currentOrg = orgs.find((o) => o.id === selectedOrgId) || orgs[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Top Banner / Org Selector Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          padding: '20px 24px',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                Plans & Subscription
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Multi-tenant quota enforcement & Razorpay payment billing
              </p>
            </div>
          </div>
        </div>

        {/* Org Selector & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {orgs.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tenant Org:</span>
              <select
                className="form-input"
                style={{ padding: '6px 12px', fontSize: 13, width: 'auto' }}
                value={selectedOrgId}
                onChange={(e) => onOrgChange(e.target.value)}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadBillingData}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh subscription & usage"
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Current Subscription & Quota Card */}
      {subData && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {/* Active Plan Card */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 14,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 140,
                height: 140,
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#818cf8', fontWeight: 700 }}>
                  Active Subscription
                </span>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {subData.subscription.status}
                </span>
              </div>

              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  {subData.subscription.plan?.display_name || currentPlanName.toUpperCase()}
                </h3>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  ({subData.subscription.billing_cycle})
                </span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                {subData.subscription.plan?.description || 'Current active tier for ' + (currentOrg?.name || 'organization')}
              </p>

              {subData.subscription.current_period_end && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <Clock size={14} />
                  <span>
                    Valid until:{' '}
                    {new Date(subData.subscription.current_period_end).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              {currentPlanName !== 'ultra_pro' && currentPlanName !== 'enterprise' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const next = plans.find((p) => p.name === (currentPlanName === 'free' ? 'pro' : 'ultra_pro'));
                    if (next) handleInitiateUpgrade(next);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Zap size={14} />
                  <span>Upgrade to {currentPlanName === 'free' ? 'Pro' : 'Ultra Pro'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-Time Quota Usage Bars */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                Resource Quota & Usage
              </h4>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Tenant: {currentOrg?.name || 'Selected Org'}
              </span>
            </div>

            {usage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Projects quota */}
                <QuotaMeter
                  icon={Layers}
                  label="Active Projects"
                  metric={usage.projects}
                  defaultLimit={subData.subscription.plan?.max_projects ?? 1}
                />

                {/* Agents quota */}
                <QuotaMeter
                  icon={Bot}
                  label="Active Agents / Configs"
                  metric={usage.agents}
                  defaultLimit={subData.subscription.plan?.max_agents ?? 1}
                />

                {/* Knowledge Docs quota */}
                <QuotaMeter
                  icon={FileText}
                  label="Knowledge Base Documents"
                  metric={usage.knowledge_docs}
                  defaultLimit={subData.subscription.plan?.max_knowledge_docs ?? 5}
                />

                {/* API Integrations */}
                <QuotaMeter
                  icon={Key}
                  label="API Vault Integrations"
                  metric={usage.api_integrations}
                  defaultLimit={subData.subscription.plan?.max_api_integrations ?? 1}
                />

                {/* Monthly Conversations */}
                <QuotaMeter
                  icon={MessageSquare}
                  label="Conversations / Month"
                  metric={usage.conversations_this_month}
                  defaultLimit={subData.subscription.plan?.max_conversations_per_month ?? 500}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Free tier limit reached banner */}
      {(() => {
        const projCur = typeof usage?.projects === 'number' ? usage.projects : usage?.projects?.current ?? 0;
        const projLim = usage?.projects?.limit ?? subData?.subscription?.plan?.max_projects ?? 1;
        const isLimitReached = currentPlanName === 'free' && projLim > 0 && projCur >= projLim;
        return isLimitReached ? (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: '#ef4444', flexShrink: 0 }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fee2e2' }}>
                  Free Tier Quota Limit Reached ({projCur}/{projLim} Active)
                </div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 2 }}>
                  Attempting to create another project or agent will be blocked by backend quota guards.
                  Upgrade to Pro (5 projects & 5 agents) using Razorpay test cards.
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => {
                const pro = plans.find((p) => p.name === 'pro');
                if (pro) handleInitiateUpgrade(pro);
              }}
            >
              Upgrade to Pro
            </button>
          </div>
        ) : null;
      })()}

      {/* Plan Catalog Grid Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Select Subscription Plan
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Choose the tier that matches your multi-tenant agent throughput requirements
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: 4,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                background: billingCycle === 'monthly' ? '#6366f1' : 'transparent',
                color: billingCycle === 'monthly' ? '#ffffff' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                background: billingCycle === 'yearly' ? '#6366f1' : 'transparent',
                color: billingCycle === 'yearly' ? '#ffffff' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Yearly Billing</span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.25)',
                  color: '#10b981',
                  padding: '2px 6px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Plans Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlanName === plan.name;
            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const isPopular = plan.name === 'pro';

            return (
              <div
                key={plan.id}
                style={{
                  background: isCurrent
                    ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)'
                    : 'var(--color-bg-card)',
                  border: isCurrent
                    ? '2px solid #6366f1'
                    : isPopular
                    ? '1px solid rgba(129, 140, 248, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: isPopular ? '0 10px 30px rgba(99,102,241,0.15)' : 'none',
                }}
              >
                {/* Popular or Active Badge */}
                {isCurrent && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Current Plan
                  </div>
                )}
                {!isCurrent && isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Plan Icon & Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background:
                        plan.name === 'free'
                          ? 'rgba(148, 163, 184, 0.2)'
                          : plan.name === 'pro'
                          ? 'rgba(99, 102, 241, 0.2)'
                          : plan.name === 'ultra_pro'
                          ? 'rgba(236, 72, 153, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                      color:
                        plan.name === 'free'
                          ? '#94a3b8'
                          : plan.name === 'pro'
                          ? '#818cf8'
                          : plan.name === 'ultra_pro'
                          ? '#f472b6'
                          : '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {plan.name === 'free' && <Shield size={18} />}
                    {plan.name === 'pro' && <Zap size={18} />}
                    {plan.name === 'ultra_pro' && <Flame size={18} />}
                    {plan.name === 'enterprise' && <Building size={18} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                      {plan.display_name}
                    </h4>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', minHeight: 36, margin: '0 0 16px' }}>
                  {plan.description}
                </p>

                {/* Price */}
                <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {plan.name === 'enterprise' ? (
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>Custom</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Contact for custom contract</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && price > 0 && (
                        <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                          ₹{Math.round(price / 12).toLocaleString('en-IN')}/mo billed annually
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Features list */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  <FeatureRow
                    highlight={plan.max_projects > 1 || plan.max_projects === -1}
                    text={plan.max_projects === -1 ? 'Unlimited Projects' : `${plan.max_projects} Active Project${plan.max_projects > 1 ? 's' : ''}`}
                  />
                  <FeatureRow
                    highlight={plan.max_agents > 1 || plan.max_agents === -1}
                    text={plan.max_agents === -1 ? 'Unlimited Agents' : `${plan.max_agents} Agent Config${plan.max_agents > 1 ? 's' : ''}`}
                  />
                  <FeatureRow
                    text={plan.max_conversations_per_month === -1 ? 'Unlimited Conversations' : `${plan.max_conversations_per_month.toLocaleString()} Conversations/mo`}
                  />
                  <FeatureRow
                    text={plan.max_knowledge_docs === -1 ? 'Unlimited Knowledge Docs' : `${plan.max_knowledge_docs} Knowledge Docs`}
                  />
                  <FeatureRow
                    text={plan.max_api_integrations === -1 ? 'Unlimited API Integrations' : `${plan.max_api_integrations} API Vault Integrations`}
                  />
                  <FeatureRow
                    text={`Support: ${plan.features?.support || 'Standard'}`}
                  />
                </div>

                {/* Action CTA */}
                <div>
                  {isCurrent ? (
                    <button
                      className="btn btn-secondary btn-full btn-md"
                      disabled
                      style={{ opacity: 0.7, cursor: 'default' }}
                    >
                      <Check size={16} /> Current Plan
                    </button>
                  ) : plan.name === 'free' ? (
                    <button
                      className="btn btn-secondary btn-full btn-md"
                      onClick={() => billingApi.cancelSubscription(true, selectedOrgId).then(loadBillingData)}
                    >
                      Downgrade to Free
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-full btn-md"
                      disabled={upgradingPlan === plan.name}
                      onClick={() => handleInitiateUpgrade(plan)}
                    >
                      {upgradingPlan === plan.name ? (
                        'Generating Order…'
                      ) : (
                        <>
                          Upgrade to {plan.display_name} <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History / Invoices Table */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Payment & Transaction History
            </h4>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Razorpay transactions and audit records for {currentOrg?.name || 'this organization'}
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-text-muted)', fontSize: 13 }}>
            No payment transactions recorded yet. Upgrade using test cards to view transaction history.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order ID</th>
                  <th>Plan Tier</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontSize: 12 }}>
                      {new Date(inv.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94a3b8' }}>
                      {inv.razorpay_order_id || '—'}
                    </td>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                      {inv.plan_name ? inv.plan_name.replace('_', ' ') : 'Pro'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      ₹{inv.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {inv.payment_method || 'Razorpay (Test)'}
                    </td>
                    <td>
                      <span
                        style={{
                          background: inv.status === 'captured' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: inv.status === 'captured' ? '#10b981' : '#f59e0b',
                          border: `1px solid ${inv.status === 'captured' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Razorpay Test Mode Checkout Modal */}
      {checkoutModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480, width: '100%', padding: 28 }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <CreditCard size={18} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                    Razorpay Checkout
                  </h3>
                </div>
                <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600, marginTop: 4 }}>
                  TEST MODE SANDBOX · ZERO REAL CHARGES
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCheckoutModal(null)}
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Plan & Amount Summary */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 10,
                padding: '14px 18px',
                marginBottom: 20,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Upgrade Plan ({billingCycle})
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2 }}>
                  {checkoutModal.planDisplayName}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Total to Pay
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                  ₹{(checkoutModal.amount / 100).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Test Cards Prompt Card */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 12,
                color: '#bfdbfe',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#60a5fa" />
                <span>Pre-filled Razorpay Test Card Details:</span>
              </div>
              <div>Card: <code>4111 1111 1111 1111</code> · Expiry: <code>12/28</code> · CVV: <code>123</code> · OTP: <code>123456</code></div>
            </div>

            {/* Card Inputs Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Test Card Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4111 1111 1111 1111"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="12/28"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CVV</label>
                  <input
                    type="password"
                    maxLength={3}
                    className="form-input"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Test OTP</label>
                <input
                  type="text"
                  className="form-input"
                  value={cardOtp}
                  onChange={(e) => setCardOtp(e.target.value)}
                  placeholder="123456"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => handleCompletePayment(false)}
                  disabled={verifying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={() => handleCompletePayment(true)}
                  disabled={verifying}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  {verifying ? (
                    'Verifying Signature…'
                  ) : (
                    <>
                      Pay ₹{(checkoutModal.amount / 100).toLocaleString('en-IN')} (Test)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function QuotaMeter({
  icon: Icon,
  label,
  metric,
  current: directCurrent,
  limit: directLimit,
  percent: directPercent,
  defaultLimit = 1,
}: {
  icon: any;
  label: string;
  metric?: { current?: number; limit?: number; percent?: number } | number;
  current?: number;
  limit?: number;
  percent?: number;
  defaultLimit?: number;
}) {
  const current =
    directCurrent !== undefined
      ? directCurrent
      : typeof metric === 'object' && metric?.current !== undefined
      ? metric.current
      : typeof metric === 'number'
      ? metric
      : 0;

  const rawLimit =
    directLimit !== undefined
      ? directLimit
      : typeof metric === 'object' && metric?.limit !== undefined
      ? metric.limit
      : defaultLimit;

  const limit = rawLimit !== undefined ? rawLimit : defaultLimit;
  const isUnlimited = limit === -1;

  const calculatedPercent = isUnlimited
    ? 0
    : limit > 0
    ? Math.round((current / limit) * 100)
    : 0;

  const rawPercent =
    directPercent !== undefined
      ? directPercent
      : typeof metric === 'object' && metric?.percent !== undefined
      ? metric.percent
      : calculatedPercent;

  const percent = isNaN(rawPercent) ? 0 : Math.max(0, Math.min(100, rawPercent));
  const isFull = !isUnlimited && current >= limit;
  const isWarning = !isUnlimited && percent >= 80 && !isFull;

  const barColor = isFull ? '#ef4444' : isWarning ? '#f59e0b' : '#6366f1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
          <Icon size={15} color={barColor} />
          <span>{label}</span>
        </div>
        <div style={{ fontWeight: 600, color: isFull ? '#ef4444' : 'var(--color-text-primary)', fontSize: 12 }}>
          {current} / {isUnlimited ? '∞ Unlimited' : limit}
          {!isUnlimited && ` (${percent}%)`}
        </div>
      </div>

      <div
        style={{
          width: '100%',
          height: 6,
          borderRadius: 6,
          background: 'rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: isUnlimited ? '15%' : `${Math.min(100, Math.max(4, percent))}%`,
            background: barColor,
            borderRadius: 6,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function FeatureRow({ text, highlight = false }: { text: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <Check size={14} color={highlight ? '#10b981' : '#6366f1'} style={{ flexShrink: 0 }} />
      <span
        style={{
          color: highlight ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {text}
      </span>
    </div>
  );
}
