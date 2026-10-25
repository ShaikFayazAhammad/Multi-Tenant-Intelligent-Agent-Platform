import React, { useState } from 'react';
import { Shield, Sun, Moon, Github, LogIn, UserPlus, Menu, X, ExternalLink, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PLATFORM_LINKS } from '../config/navigation';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full transition-colors duration-300 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand Identity */}
          <a href="#" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Shield className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-cyan-200 bg-clip-text text-transparent">
                  BFSI AgentCloud
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800/60">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Multi-Tenant Financial AI Orchestrator
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">
              Platform
            </a>
            <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">
              Workflow
            </a>
            <a href="#demo-videos" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors flex items-center space-x-1">
              <span>Demo Videos</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            </a>
            <a href="#architecture" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">
              Architecture
            </a>
            <a href="#pricing" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors flex items-center space-x-1">
              <span>Pricing</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </a>
            <a href="#creators" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">
              Developers
            </a>
          </nav>

          {/* Desktop Actions: Theme, GitHub, Portals */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-btn"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200"
              aria-label="Toggle Dark and Light Mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* GitHub Repo Button */}
            <a
              href={PLATFORM_LINKS.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              id="github-code-link"
              title="View source code on GitHub"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-black dark:hover:text-white transition-all duration-200 flex items-center space-x-1.5"
            >
              <Github className="w-5 h-5" />
            </a>

            {/* Client Portal Login CTA */}
            <a
              href={PLATFORM_LINKS.clientPortal}
              target="_blank"
              rel="noopener noreferrer"
              id="client-portal-btn"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 bg-cyan-50/50 dark:bg-cyan-950/30 hover:bg-cyan-100/80 dark:hover:bg-cyan-900/50 transition-all duration-200 shadow-sm"
            >
              <LogIn className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Client Portal Login</span>
            </a>

            {/* Admin Portal Signup / Launch CTA */}
            <a
              href={PLATFORM_LINKS.adminPortal}
              target="_blank"
              rel="noopener noreferrer"
              id="admin-portal-signup-btn"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Admin Portal Signup</span>
            </a>
          </div>

          {/* Mobile Menu & Theme Button */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-2 text-base font-semibold text-slate-700 dark:text-slate-200">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Platform
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Workflow
            </a>
            <a
              href="#demo-videos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-cyan-600 dark:text-cyan-400"
            >
              Demo Videos
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Architecture
            </a>
            <a
              href="#creators"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Developers
            </a>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-2">
            <a
              href={PLATFORM_LINKS.adminPortal}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>Admin Portal Signup</span>
            </a>
            <a
              href={PLATFORM_LINKS.clientPortal}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold border border-cyan-500/40 text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40"
            >
              <LogIn className="w-4 h-4" />
              <span>Client Portal Login</span>
            </a>
            <a
              href={PLATFORM_LINKS.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <Github className="w-4 h-4" />
              <span>View Code on GitHub</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
