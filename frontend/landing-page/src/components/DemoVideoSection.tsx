import React, { useState } from 'react';
import { Play, Video, ExternalLink, CheckCircle2, Shield, Sparkles, MessageSquare, Terminal, Eye } from 'lucide-react';
import { VideoModal } from './VideoModal';
import { PLATFORM_LINKS } from '../config/navigation';

export const DemoVideoSection: React.FC = () => {
  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    videoSrc: string;
    keyPoints: string[];
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    videoSrc: '',
    keyPoints: [],
  });

  const openVideo = (title: string, subtitle: string, videoSrc: string, keyPoints: string[]) => {
    setActiveModal({
      isOpen: true,
      title,
      subtitle,
      videoSrc,
      keyPoints,
    });
  };

  const closeModal = () => {
    setActiveModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <section id="demo-videos" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 dark:border-cyan-500/30 bg-blue-50 dark:bg-cyan-950/40 text-blue-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Video className="w-4 h-4 text-cyan-500" />
            <span>Interactive Demo Showcases</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            See the Platform in Action
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Explore comprehensive video walkthroughs covering both the <span className="font-semibold text-blue-600 dark:text-cyan-400">Super Admin Configuration Suite</span> and the <span className="font-semibold text-indigo-600 dark:text-indigo-400">Client Agent Testing Experience</span>.
          </p>
        </div>

        {/* 2 Showcase Blocks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">

          {/* BLOCK 1: Super Admin Portal Walkthrough */}
          <div className="flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-500/40 dark:hover:border-blue-500/40 group">
            
            {/* Top Video Container */}
            <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
              {/* Simulated UI background with cyber grid */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/80 opacity-90"></div>
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

              {/* Graphical Preview Card */}
              <div className="relative z-10 w-4/5 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="text-xs font-mono font-bold text-white">ADMIN CONSOLE SIMULATOR</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-cyan-300 border border-blue-700/40">
                    PORT 3001
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                    <div className="text-slate-400 text-[9px]">TENANT PROVISIONING</div>
                    <div className="text-white font-semibold">BFSI Global Bank</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                    <div className="text-slate-400 text-[9px]">RAG VECTOR CHUNKS</div>
                    <div className="text-cyan-400 font-semibold">1,420 Chroma Docs</div>
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              <button
                onClick={() =>
                  openVideo(
                    'Super Admin Portal Walkthrough',
                    'Multi-tenant provisioning, RAG crawler, tool encryption & playground simulator',
                    '/videos/admin-demo.mp4',
                    [
                      'Creating organizations and scoped project agent configurations',
                      'Uploading compliance documents and crawling websites into ChromaDB',
                      'Registering encrypted API tools with Fernet AES-256 keys',
                      'Testing agent execution with latency and RAG trace in the Playground',
                    ]
                  )
                }
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-all duration-300 cursor-pointer"
                aria-label="Play Super Admin Portal Walkthrough Video"
              >
                <div className="relative flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-2xl shadow-blue-500/50 group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-8 h-8 ml-1 fill-white" />
                </div>
              </button>

              {/* Duration badge */}
              <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-mono text-white flex items-center space-x-1.5">
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span>Admin Demo • 1080p</span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                  <Terminal className="w-4 h-4" />
                  <span>Block 01 • Super Admin Operations</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Multi-Tenant Agent Provisioning & Configuration
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Deep-dive into the enterprise admin console. See how administrators onboard organizations, configure domain-specific system prompts, index compliance manuals via file upload or live URL crawling, and define encrypted API tools.
                </p>

                {/* Key Points */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Multi-tenant project isolation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>ChromaDB RAG document ingestion</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Live web crawler text extraction</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Full-trace Agent Playground</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() =>
                    openVideo(
                      'Super Admin Portal Walkthrough',
                      'Multi-tenant provisioning, RAG crawler, tool encryption & playground simulator',
                      '/videos/admin-demo.mp4',
                      [
                        'Creating organizations and scoped project agent configurations',
                        'Uploading compliance documents and crawling websites into ChromaDB',
                        'Registering encrypted API tools with Fernet AES-256 keys',
                        'Testing agent execution with latency and RAG trace in the Playground',
                      ]
                    )
                  }
                  className="inline-flex items-center space-x-2 text-sm font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                >
                  <Eye className="w-4 h-4" />
                  <span>Watch Walkthrough Video</span>
                </button>

                <a
                  href={PLATFORM_LINKS.adminPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md"
                >
                  <span>Launch Admin</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>

          </div>


          {/* BLOCK 2: Client Portal & Agent Testing Experience */}
          <div className="flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-cyan-500/40 dark:hover:border-cyan-500/40 group">
            
            {/* Top Video Container */}
            <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
              {/* Simulated UI background with cyber grid */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950/80 opacity-90"></div>
              <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

              {/* Graphical Preview Card */}
              <div className="relative z-10 w-4/5 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-mono font-bold text-white">CLIENT WEBSOCKET CHAT</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                    PORT 3000
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] font-sans">
                  <div className="p-2 rounded-lg bg-blue-600/20 text-blue-200 border border-blue-500/30 text-right">
                    Can I initiate a wire transfer of $5,000 to John Doe?
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/90 text-slate-200 border border-slate-700">
                    <div className="text-[9px] font-mono text-emerald-400 mb-0.5 flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>PII MASKED • TOOL EXEC: TRANSFER_API</span>
                    </div>
                    Processing request securely. Auth token verified.
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              <button
                onClick={() =>
                  openVideo(
                    'Client Operations & Voice Agent Experience',
                    'Real-time WebSocket streaming, browser speech recognition, and ElevenLabs TTS',
                    '/videos/client-demo.mp4',
                    [
                      'Logging into client portal with role-based project selection',
                      'Testing conversational banking agent via real-time WebSocket token streaming',
                      'Voice interaction using Speech-to-Text and ElevenLabs TTS audio streaming',
                      'Viewing live analytics: resolution rate, latency, and sentiment escalations',
                    ]
                  )
                }
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-all duration-300 cursor-pointer"
                aria-label="Play Client Operations & Voice Agent Video"
              >
                <div className="relative flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-500 to-blue-600 text-white shadow-2xl shadow-cyan-500/50 group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-8 h-8 ml-1 fill-white" />
                </div>
              </button>

              {/* Duration badge */}
              <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-mono text-white flex items-center space-x-1.5">
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span>Client Demo • 1080p</span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  <MessageSquare className="w-4 h-4" />
                  <span>Block 02 • Client Operations</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Real-Time WebSocket Chat & Voice Agent Testing
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Experience the end-user interface. Test specialized financial agents in real time with low-latency WebSocket streaming, native browser speech recognition, ElevenLabs text-to-speech audio streaming, and live session analytics.
                </p>

                {/* Key Points */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Real-time WebSocket token streaming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Browser Speech Recognition (STT)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>ElevenLabs voice audio response (TTS)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Conversation transcripts & audit history</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() =>
                    openVideo(
                      'Client Operations & Voice Agent Experience',
                      'Real-time WebSocket streaming, browser speech recognition, and ElevenLabs TTS',
                      '/videos/client-demo.mp4',
                      [
                        'Logging into client portal with role-based project selection',
                        'Testing conversational banking agent via real-time WebSocket token streaming',
                        'Voice interaction using Speech-to-Text and ElevenLabs TTS audio streaming',
                        'Viewing live analytics: resolution rate, latency, and sentiment escalations',
                      ]
                    )
                  }
                  className="inline-flex items-center space-x-2 text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  <Eye className="w-4 h-4" />
                  <span>Watch Client Demo Video</span>
                </button>

                <a
                  href={PLATFORM_LINKS.clientPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 bg-cyan-50/70 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 shadow-sm"
                >
                  <span>Launch Client</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>

          </div>

        </div>

        {/* Video Attachment Instructions Note */}
        <div className="mt-12 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-900/40 text-center max-w-3xl mx-auto text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            💡 Video Attachment Slots
          </div>
          <div>
            Place your recorded MP4 walkthrough files at <code className="text-blue-600 dark:text-cyan-300 font-mono">public/videos/admin-demo.mp4</code> and <code className="text-blue-600 dark:text-cyan-300 font-mono">public/videos/client-demo.mp4</code>, or paste external video embed links.
          </div>
        </div>

      </div>

      {/* Fullscreen Video Modal */}
      <VideoModal
        isOpen={activeModal.isOpen}
        onClose={closeModal}
        title={activeModal.title}
        subtitle={activeModal.subtitle}
        videoSrc={activeModal.videoSrc}
        keyPoints={activeModal.keyPoints}
      />
    </section>
  );
};
