import React from 'react';
import { ArrowRight, Shield, Database, Wrench, Cpu, CheckCircle, Radio, Terminal, FileCode2 } from 'lucide-react';
import { PLATFORM_LINKS } from '../config/navigation';

export const ArchitectureSection: React.FC = () => {
  const pipeline = [
    {
      step: '01',
      title: 'Input Guardrail',
      subtitle: 'PII Masking & Safety',
      desc: 'Detects SSNs, credit cards, emails, phone numbers & blocked financial topics before touching the model.',
      icon: Shield,
      badge: 'Regex + BERT',
      color: 'from-amber-500 to-orange-500',
    },
    {
      step: '02',
      title: 'ChromaDB RAG',
      subtitle: 'Tenant Isolated Memory',
      desc: 'Performs semantic similarity search across project-scoped vector collections (MiniLM-L6-v2 embeddings).',
      icon: Database,
      badge: 'Isolated Collection',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      step: '03',
      title: 'Dynamic Tool Vault',
      subtitle: 'Fernet AES-256 Auth',
      desc: 'Executes verified REST API connectors with decrypted bearer tokens for live banking account balances.',
      icon: Wrench,
      badge: 'AES-256 Vault',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      step: '04',
      title: 'OpenRouter Multi-LLM',
      subtitle: 'Failover Orchestration',
      desc: 'Cascades prompt + context through Gemini 2.0 Flash ➔ Gemini 2.5 Flash ➔ LLaMA 3.1 8B Instruct.',
      icon: Cpu,
      badge: 'Fallback Chain',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      step: '05',
      title: 'Output Guardrail',
      subtitle: 'Compliance & Sentiment',
      desc: 'Sanitizes model output, injects mandatory disclaimers, and triggers supervisor escalation on distress.',
      icon: CheckCircle,
      badge: 'Regulatory Pass',
      color: 'from-rose-500 to-pink-500',
    },
    {
      step: '06',
      title: 'Real-Time Delivery',
      subtitle: 'WebSocket + ElevenLabs',
      desc: 'Streams tokens chunk-by-chunk to the client UI with optional base64 audio stream for voice conversations.',
      icon: Radio,
      badge: '<15ms Latency',
      color: 'from-cyan-500 to-blue-600',
    },
  ];

  return (
    <section id="architecture" className="py-24 bg-slate-100/50 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 dark:border-cyan-500/30 bg-blue-50 dark:bg-cyan-950/40 text-blue-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-cyan-500" />
            <span>Runtime Execution Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            How Every User Query is Processed
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            A hardened, multi-stage LangGraph execution cycle ensuring strict regulatory compliance, low-latency streaming, and isolated data boundaries.
          </p>
        </div>

        {/* Pipeline Sequence */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pipeline.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                      STAGE {item.step}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${item.color} text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-cyan-400 font-semibold">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Swagger / OpenAPI Interactive Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl border border-blue-500/20 dark:border-cyan-500/30 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-cyan-500/5 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-cyan-950/40 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <FileCode2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Interactive Swagger & OpenAPI Documentation
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Test and inspect all 20+ REST API endpoints for Organizations, Projects, RAG Ingestion, Tool Vault, and Analytics.
              </p>
            </div>
          </div>

          <a
            href={PLATFORM_LINKS.backendApiDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 shadow-md transition-colors"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Open Swagger Docs</span>
          </a>
        </div>

      </div>
    </section>
  );
};
