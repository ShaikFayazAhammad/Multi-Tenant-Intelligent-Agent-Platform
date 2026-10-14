import React from 'react';
import { ShieldCheck, Network, Database, Lock, Bot, Radio, Compass, RefreshCw, Sparkles, Layers } from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: ShieldCheck,
      title: 'Multi-Tenant Data Isolation',
      desc: 'Strict relational and vector boundaries. Every query, config, conversation, and document is partitioned by org_id and project_id via JWT claim enforcement.',
      badge: 'Zero Cross-Tenant Leaks',
      gradient: 'from-blue-600 to-cyan-500',
    },
    {
      icon: Network,
      title: 'Config-Driven Dynamic LangGraph',
      desc: 'Agent graphs are synthesized dynamically at runtime per session from project settings (prompts, temperature, enabled tools, fallback chains) with zero code redeploys.',
      badge: 'Autonomous Graph Synthesis',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: RefreshCw,
      title: 'Multi-Model Fallback Chain',
      desc: 'Resilient multi-model inference powered by OpenRouter. Primary model (gemini-2.0-flash) automatically cascades to secondary (gemini-2.5-flash) and tertiary (llama-3.1-8b) if rate-limited.',
      badge: '99.99% Availability',
      gradient: 'from-cyan-600 to-blue-600',
    },
    {
      icon: Database,
      title: 'Isolated ChromaDB RAG & Crawler',
      desc: 'Each project manages a dedicated vector collection (proj_{project_id}). Ingest compliance policies via document upload or extract clean text from URLs with the embedded crawler.',
      badge: 'Per-Project Vector Slice',
      gradient: 'from-emerald-600 to-teal-500',
    },
    {
      icon: Lock,
      title: 'Fernet AES-256 API Tool Vault',
      desc: 'Register REST API integrations with military-grade symmetric encryption. Bearer tokens and API keys are stored encrypted, decrypted only in memory during authorized tool calls.',
      badge: 'Encrypted Credential Vault',
      gradient: 'from-amber-600 to-orange-500',
    },
    {
      icon: Radio,
      title: 'Real-Time WebSocket & Voice AI',
      desc: 'Stream token chunks instantaneously over WebSockets (MESSAGE_STREAM). Built-in browser speech recognition (STT) and ElevenLabs text-to-speech audio playback (AUDIO_STREAM).',
      badge: 'Token-Chunked Streaming',
      gradient: 'from-purple-600 to-pink-600',
    },
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 dark:border-cyan-500/30 bg-blue-50 dark:bg-cyan-950/40 text-blue-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>Architecture Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Built for Regulated Financial Enterprises
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Every layer is engineered to meet strict BFSI compliance standards, high-throughput token streaming, and dynamic agent lifecycle management.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-blue-500/40 dark:hover:border-cyan-500/40 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-tr ${feat.gradient} text-white shadow-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {feat.title}
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center text-xs font-semibold text-blue-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>Learn more in documentation</span>
                  <span className="ml-1">➔</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
