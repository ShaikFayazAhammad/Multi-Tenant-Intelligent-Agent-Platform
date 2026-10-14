import React from 'react';
import { Shield, Github, Linkedin, ExternalLink, Heart, Lock, Activity } from 'lucide-react';
import { PLATFORM_LINKS } from '../config/navigation';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1.5px] shadow-md">
                <div className="w-full h-full bg-slate-900 rounded-[9px] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                BFSI AgentCloud
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              Enterprise-grade Multi-Tenant Intelligent Agent Platform for Banking, Financial Services, and Insurance. Engineered with config-driven dynamic LangGraph agents, per-project ChromaDB RAG, Fernet AES-256 encryption, and low-latency token streaming.
            </p>
            <div className="flex items-center space-x-3 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>SYSTEM STATUS: ALL ENGINES OPERATIONAL</span>
            </div>
          </div>

          {/* Quick Access Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Platform Portals
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href={PLATFORM_LINKS.adminPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-cyan-400 flex items-center space-x-1.5 transition-colors"
                >
                  <span>Admin Portal (Port 3001)</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={PLATFORM_LINKS.clientPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-cyan-400 flex items-center space-x-1.5 transition-colors"
                >
                  <span>Client Operations (Port 3000)</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={PLATFORM_LINKS.backendApiDocs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-cyan-400 flex items-center space-x-1.5 transition-colors"
                >
                  <span>Swagger API Docs (Port 8000)</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Connect & Repositories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Creators & Source
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href={PLATFORM_LINKS.githubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-cyan-400 flex items-center space-x-2 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href={PLATFORM_LINKS.creators.rakesh.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-cyan-400 flex items-center space-x-2 transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                  <span>Rakesh Rohan (LinkedIn)</span>
                </a>
              </li>
              <li>
                <a
                  href={PLATFORM_LINKS.creators.fayaz.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-cyan-400 flex items-center space-x-2 transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                  <span>Shaik Fayaz Ahammad (LinkedIn)</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} BFSI Multi-Tenant Intelligent Agent Platform. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-cyan-500" />
              <span>AES-256 Vault Verified</span>
            </span>
            <span>•</span>
            <span>Architected by Rakesh Rohan & Shaik Fayaz Ahammad</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
