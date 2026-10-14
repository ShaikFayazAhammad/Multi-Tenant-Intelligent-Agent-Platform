import React from 'react';
import { ArrowRight, ShieldCheck, Cpu, Database, Lock, Play, Github, Sparkles, Layers, Activity } from 'lucide-react';
import { PLATFORM_LINKS } from '../config/navigation';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-12 pb-24 overflow-hidden">
      {/* Background Ambient Glow Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/15 to-purple-600/15 dark:from-blue-600/25 dark:via-cyan-500/20 dark:to-indigo-600/25 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Announcement Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full border border-blue-500/30 dark:border-cyan-500/30 bg-blue-50/80 dark:bg-slate-900/80 shadow-sm backdrop-blur-md">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-300">
              BFSI Multi-Tenant Agentic SaaS Architecture
            </span>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
              <span>LangGraph + ChromaDB</span>
            </span>
          </div>
        </div>

        {/* Hero Title & Value Proposition */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
            <span className="block text-slate-900 dark:text-white">
              Enterprise BFSI
            </span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
              Intelligent Agent SaaS
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            A production-ready, config-driven SaaS platform engineered for banking, financial services, and insurance enterprises.
            Organizations provision isolated tenant projects, customize agent system prompts, inject RAG knowledge via file upload or web crawling, and securely execute encrypted API tools — while clients test and converse with agents via real-time WebSocket token streaming and ElevenLabs voice.
          </p>

          {/* CTA Buttons Row */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Admin Signup Button */}
            <a
              href={PLATFORM_LINKS.adminPortal}
              target="_blank"
              rel="noopener noreferrer"
              id="hero-admin-signup-cta"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-xl shadow-blue-500/25 hover:shadow-cyan-500/35 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <span>Admin Portal (Sign Up / Manage)</span>
              <ArrowRight className="w-5 h-5" />
            </a>

            {/* Client Login Button */}
            <a
              href={PLATFORM_LINKS.clientPortal}
              target="_blank"
              rel="noopener noreferrer"
              id="hero-client-login-cta"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl text-base font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/90 shadow-md hover:border-cyan-500/50 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 text-cyan-500 fill-cyan-500/20" />
              <span>Client Portal (Log In & Test)</span>
            </a>

            {/* GitHub Repo Link */}
            <a
              href={PLATFORM_LINKS.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              id="hero-github-cta"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl text-base font-semibold border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-900 transition-all duration-200"
            >
              <Github className="w-5 h-5" />
              <span>GitHub Code</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 mb-1">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Tenant Scope</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">100% Isolated</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Strict Org & Project RBAC</div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <Cpu className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Orchestration</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">LangGraph</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Config-driven runtime state</div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-1">
                <Database className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Vector Search</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">ChromaDB RAG</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Per-project collection slice</div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <Lock className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Security Vault</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">Fernet AES-256</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Encrypted API tool secrets</div>
            </div>
          </div>

        </div>

        {/* High-Resolution BFSI SaaS Visual Showcase */}
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-blue-500/30 via-indigo-500/20 to-transparent dark:from-cyan-500/30 dark:via-indigo-500/20 dark:to-slate-900/40 shadow-2xl shadow-indigo-500/20">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
              
              {/* Telemetry Status Bar Header */}
              <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-400 hidden sm:inline">
                    BFSI SaaS Telemetry Engine • Multi-Tenant Active Graph
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs font-mono">
                  <span className="inline-flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>ENCRYPTION: AES-256</span>
                  </span>
                  <span className="text-cyan-400 hidden md:inline">
                    TENANT ISOLATION: 100% PASS
                  </span>
                </div>
              </div>

              {/* The Hero Image */}
              <img
                src="/assets/bfsi_saas_hero.jpg"
                alt="BFSI Multi-Tenant Intelligent Agent Platform Architecture and Telemetry"
                className="w-full h-auto object-cover object-center max-h-[620px] transition-transform duration-700 hover:scale-[1.01]"
                loading="eager"
              />

              {/* Bottom Feature Bar Overlay */}
              <div className="p-4 sm:p-6 bg-slate-900/95 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-300 text-xs sm:text-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Dynamic Agent Workflows</div>
                    <div className="text-slate-400 text-xs">Runtime graph synthesis per organization</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Two-Pass Guardrails</div>
                    <div className="text-slate-400 text-xs">PII mask, topic block, disclaimer injection</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Multi-Model LLM Failover</div>
                    <div className="text-slate-400 text-xs">OpenRouter automatic fallback chain</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
