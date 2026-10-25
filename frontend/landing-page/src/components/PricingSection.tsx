import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building2, ArrowRight, Sparkles, Shield, Headphones, BarChart3, Star } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_projects: number;
  max_agents: number;
  max_conversations_per_month: number;
  max_knowledge_docs: number;
  max_api_integrations: number;
  features: Record<string, string>;
  is_active: boolean;
  sort_order: number;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Zap className="w-7 h-7" />,
  pro: <Star className="w-7 h-7" />,
  ultra_pro: <Crown className="w-7 h-7" />,
  enterprise: <Building2 className="w-7 h-7" />,
};

const PLAN_COLORS: Record<string, { gradient: string; badge: string; border: string; glow: string }> = {
  free: {
    gradient: 'from-slate-500 to-slate-600',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    glow: '',
  },
  pro: {
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    glow: '',
  },
  ultra_pro: {
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700 ring-2 ring-purple-400/30',
    glow: 'shadow-xl shadow-purple-500/20',
  },
  enterprise: {
    gradient: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    glow: '',
  },
};

const SUPPORT_LABELS: Record<string, string> = {
  community: 'Community support',
  email: 'Priority email support',
  priority: '24/7 priority support',
  dedicated: 'Dedicated account manager',
};

const ANALYTICS_LABELS: Record<string, string> = {
  basic: 'Basic analytics',
  advanced: 'Advanced analytics',
  full: 'Full analytics suite',
  custom: 'Custom BI dashboards',
};

function formatLimit(n: number): string {
  if (n === -1) return 'Unlimited';
  return n.toLocaleString();
}

function formatPrice(price: number, cycle: 'monthly' | 'yearly'): string {
  if (price === 0) return 'Free';
  const monthlyPrice = cycle === 'yearly' ? Math.round(price / 12) : price;
  return `₹${monthlyPrice.toLocaleString()}`;
}

export function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing/plans')
      .then(r => r.json())
      .then(data => { setPlans(data); setLoading(false); })
      .catch(() => {
        // Fallback static plans if API unreachable
        setPlans([
          { id: '1', name: 'free', display_name: 'Free', description: 'Get started — 1 project, 1 agent.', price_monthly: 0, price_yearly: 0, max_projects: 1, max_agents: 1, max_conversations_per_month: 500, max_knowledge_docs: 5, max_api_integrations: 1, features: { analytics: 'basic', support: 'community' }, is_active: true, sort_order: 0 },
          { id: '2', name: 'pro', display_name: 'Pro', description: 'Scale up — 5 projects, 5 agents.', price_monthly: 999, price_yearly: 9990, max_projects: 5, max_agents: 5, max_conversations_per_month: 10000, max_knowledge_docs: 50, max_api_integrations: 10, features: { analytics: 'advanced', support: 'email' }, is_active: true, sort_order: 1 },
          { id: '3', name: 'ultra_pro', display_name: 'Ultra Pro', description: 'Power users — 10 projects, 10 agents.', price_monthly: 2999, price_yearly: 29990, max_projects: 10, max_agents: 10, max_conversations_per_month: 50000, max_knowledge_docs: 200, max_api_integrations: 25, features: { analytics: 'full', support: 'priority' }, is_active: true, sort_order: 2 },
          { id: '4', name: 'enterprise', display_name: 'Enterprise', description: 'Unlimited everything. Contact us.', price_monthly: 0, price_yearly: 0, max_projects: -1, max_agents: -1, max_conversations_per_month: -1, max_knowledge_docs: -1, max_api_integrations: -1, features: { analytics: 'custom', support: 'dedicated' }, is_active: true, sort_order: 3 },
        ]);
        setLoading(false);
      });
  }, []);

  return (
    <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-900/30 px-4 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6">
            <Sparkles className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
            Choose the plan that scales with you
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Start free, upgrade when you need more. Every plan includes core AI agent capabilities, real-time analytics, and multi-tenant isolation.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="relative inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`relative z-10 rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                billing === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`relative z-10 rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                billing === 'yearly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Yearly
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
            {plans.map((plan, idx) => {
              const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.free;
              const isPopular = plan.name === 'ultra_pro';
              const isEnterprise = plan.name === 'enterprise';
              const price = billing === 'yearly' ? plan.price_yearly : plan.price_monthly;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border bg-white dark:bg-slate-900/80 backdrop-blur-sm p-7 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 ${colors.border} ${colors.glow} ${isPopular ? 'lg:-mt-4 lg:mb-4' : ''}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-purple-500/30">
                        <Crown className="w-3.5 h-3.5" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-6">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} text-white mb-4`}>
                      {PLAN_ICONS[plan.name]}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.display_name}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {isEnterprise ? (
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">Custom</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">
                          {formatPrice(price, billing)}
                        </span>
                        {price > 0 && (
                          <span className="ml-1 text-sm text-slate-500 dark:text-slate-400">/mo</span>
                        )}
                      </div>
                    )}
                    {billing === 'yearly' && price > 0 && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Billed ₹{price.toLocaleString()}/year
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div className="mb-8">
                    {isEnterprise ? (
                      <a
                        href="mailto:contact@bfsi-platform.com?subject=Enterprise%20Plan%20Inquiry"
                        className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 hover:scale-[1.02]"
                      >
                        Contact Sales
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    ) : plan.name === 'free' ? (
                      <a
                        href="/admin/login"
                        className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
                      >
                        Get Started Free
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <a
                        href="/admin/login"
                        className={`flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r ${colors.gradient} px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
                      >
                        Upgrade to {plan.display_name}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mb-2">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                      What's included
                    </p>
                  </div>

                  {/* Features list */}
                  <ul className="flex-1 space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500`} />
                      <span className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-white">{formatLimit(plan.max_projects)}</strong> {plan.max_projects === 1 ? 'project' : 'projects'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-white">{formatLimit(plan.max_agents)}</strong> AI {plan.max_agents === 1 ? 'agent' : 'agents'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-white">{formatLimit(plan.max_conversations_per_month)}</strong> conversations/mo
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-white">{formatLimit(plan.max_knowledge_docs)}</strong> knowledge docs
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-white">{formatLimit(plan.max_api_integrations)}</strong> API integrations
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <BarChart3 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        {ANALYTICS_LABELS[plan.features?.analytics] || 'Analytics'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Headphones className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        {SUPPORT_LABELS[plan.features?.support] || 'Support'}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">Multi-tenant isolation</span>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Money-back guarantee */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
            <Shield className="w-4 h-4" />
            <span>30-day money-back guarantee on all paid plans. No questions asked.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
