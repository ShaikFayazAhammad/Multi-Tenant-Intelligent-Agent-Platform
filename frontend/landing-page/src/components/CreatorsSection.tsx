import React, { useState } from 'react';
import { Linkedin, Github, ExternalLink, Code2, Users, Check, Copy } from 'lucide-react';
import { PLATFORM_LINKS } from '../config/navigation';

export const CreatorsSection: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const gitCloneCmd = 'git clone https://github.com/ShaikFayazAhammad/Multi-Tenant-Intelligent-Agent-Platform.git';

  const handleCopyClone = () => {
    navigator.clipboard.writeText(gitCloneCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const creators = [
    {
      name: PLATFORM_LINKS.creators.rakesh.name,
      role: PLATFORM_LINKS.creators.rakesh.role,
      specialization: PLATFORM_LINKS.creators.rakesh.specialization,
      tagline: PLATFORM_LINKS.creators.rakesh.tagline,
      linkedin: PLATFORM_LINKS.creators.rakesh.linkedin,
      initials: PLATFORM_LINKS.creators.rakesh.avatarInitials,
      gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
      badge: 'Co-Creator & System Architect',
    },
    {
      name: PLATFORM_LINKS.creators.fayaz.name,
      role: PLATFORM_LINKS.creators.fayaz.role,
      specialization: PLATFORM_LINKS.creators.fayaz.specialization,
      tagline: PLATFORM_LINKS.creators.fayaz.tagline,
      linkedin: PLATFORM_LINKS.creators.fayaz.linkedin,
      initials: PLATFORM_LINKS.creators.fayaz.avatarInitials,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      badge: 'Co-Creator & AI Lead',
    },
  ];

  return (
    <section id="creators" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 dark:border-cyan-500/30 bg-blue-50 dark:bg-cyan-950/40 text-blue-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Users className="w-4 h-4 text-cyan-500" />
            <span>Platform Architects</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Engineered by Rakesh Rohan & Shaik Fayaz Ahammad
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Co-creators of the BFSI Multi-Tenant Intelligent Agent Platform. Connect on LinkedIn and explore the project on GitHub.
          </p>
        </div>

        {/* Two Creator Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-14">
          {creators.map((creator, idx) => (
            <div
              key={idx}
              className="group relative rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-blue-500/50 flex flex-col justify-between space-y-6"
            >
              <div>
                {/* Header with Avatar & Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${creator.gradient} p-0.5 shadow-lg shadow-blue-500/20`}>
                      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-white">
                        {creator.initials}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                        {creator.name}
                      </h3>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                        {creator.badge}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {creator.tagline}
                </p>

                {/* Key Focus Areas */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Technical Focus & Architecture
                  </div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {creator.specialization}
                  </div>
                </div>
              </div>

              {/* LinkedIn Action Link */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <a
                  href={creator.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center space-x-2 py-3 px-5 rounded-2xl font-bold text-sm text-white bg-[#0A66C2] hover:bg-[#004182] shadow-md shadow-blue-600/20 hover:shadow-blue-600/40 transition-all duration-200"
                >
                  <Linkedin className="w-4 h-4 fill-white" />
                  <span>Connect with {creator.name.split(' ')[0]} on LinkedIn</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* GitHub Codebase Card */}
        <div className="max-w-5xl mx-auto rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-900/60 text-cyan-300 border border-blue-700/60 text-xs font-bold uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5" />
                <span>Open Source Repository</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black">
                ShaikFayazAhammad/Multi-Tenant-Intelligent-Agent-Platform
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Explore the complete source code, LangGraph orchestrator graphs, FastAPI routers, vector chunking pipelines, and dual portal React interfaces.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {/* Clone Command Button */}
              <button
                onClick={handleCopyClone}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition-colors"
                title="Copy git clone command"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'git clone repo'}</span>
              </button>

              {/* Direct GitHub Link */}
              <a
                href={PLATFORM_LINKS.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                id="github-creators-repo-link"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-slate-100 shadow-lg shadow-white/10 transition-all transform hover:-translate-y-0.5"
              >
                <Github className="w-4 h-4" />
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
