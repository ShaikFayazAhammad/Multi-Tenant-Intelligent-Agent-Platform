import React from 'react';
import { Building2, Sliders, Globe, KeyRound, MessageSquareCode, LineChart, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const WorkflowSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Tenant & Project Provisioning',
      actor: 'Organization Admin',
      actorColor: 'text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/40 border-blue-200 dark:border-cyan-800/40',
      icon: Building2,
      desc: 'Create isolated enterprise tenants and spin up domain-specific projects (Retail Banking, Mortgages, Wealth Management, Insurance Claims).',
      bullets: ['Strict tenant isolation', 'Per-project Chroma collection', 'Scoped JWT access'],
    },
    {
      num: '02',
      title: 'Prompt & Guardrail Engineering',
      actor: 'Organization Admin',
      actorColor: 'text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/40 border-blue-200 dark:border-cyan-800/40',
      icon: Sliders,
      desc: 'Define system prompts, temperature, model fallback chain (OpenRouter), blocked financial topics, and mandatory compliance disclaimers.',
      bullets: ['Dynamic LangGraph state', 'Automated PII masking', 'Regulatory disclaimer injection'],
    },
    {
      num: '03',
      title: 'RAG Knowledge Ingestion',
      actor: 'Organization Admin',
      actorColor: 'text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/40 border-blue-200 dark:border-cyan-800/40',
      icon: Globe,
      desc: 'Upload PDF/policy docs or trigger the automated web crawler to index public branch manuals and rates directly into vector memory.',
      bullets: ['Recursive character text splitting', 'MiniLM embeddings', 'Per-project ChromaDB isolation'],
    },
    {
      num: '04',
      title: 'Encrypted API Tool Vault',
      actor: 'Organization Admin',
      actorColor: 'text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/40 border-blue-200 dark:border-cyan-800/40',
      icon: KeyRound,
      desc: 'Register REST API endpoints for live core-banking lookups. Secrets and bearer tokens are encrypted with military-grade Fernet AES-256.',
      bullets: ['Fernet AES-256 encryption', 'In-console live API testing', 'Dynamic LangChain tool binding'],
    },
    {
      num: '05',
      title: 'Client Interaction & Voice Testing',
      actor: 'Client / Branch User',
      actorColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
      icon: MessageSquareCode,
      desc: 'End-users and staff log into the Client Portal to converse with and test agents over real-time WebSockets with token-chunked streaming.',
      bullets: ['Sub-second token streaming', 'Browser speech recognition', 'ElevenLabs voice TTS audio'],
    },
    {
      num: '06',
      title: 'Audit Trails & Live Analytics',
      actor: 'Supervisors & Admins',
      actorColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40',
      icon: LineChart,
      desc: 'Track conversation resolution rates, latency, token spend, model usage, and negative sentiment escalations in real-time dashboards.',
      bullets: ['Full conversation transcripts', 'Intent classification telemetry', 'Immutable security audit logs'],
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-slate-100/60 dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 dark:border-cyan-500/30 bg-blue-50 dark:bg-cyan-950/40 text-blue-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-4 h-4 text-cyan-500" />
            <span>End-to-End SaaS Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            How Organizations & Clients Use the Platform
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            From tenant creation and prompt tuning to encrypted API integration and live client voice testing — completely config-driven with zero code redeployments.
          </p>
        </div>

        {/* 6-Step Workflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl p-7 border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-500/50 flex flex-col justify-between space-y-6"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black font-mono text-slate-300 dark:text-slate-700">
                      {step.num}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${step.actorColor}`}>
                      {step.actor}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  {step.bullets.map((b, i) => (
                    <div key={i} className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
