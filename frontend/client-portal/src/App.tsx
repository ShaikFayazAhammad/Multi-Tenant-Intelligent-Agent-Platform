import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clientApi } from './services/api';

// Extend Window for SpeechRecognition browser API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  latency_ms?: number;
  model?: string;
  isVoice?: boolean;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bfsi_client_token'));
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('lead@bfsi.com');
  const [password, setPassword] = useState('lead123');

  // Context State
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'dashboard'>('chat');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);

  // History State
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<any[]>([]);

  // Analytics Dashboard State
  const [analytics, setAnalytics] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition on mount
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  useEffect(() => {
    if (token) {
      loadUserProfile();
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectId) {
      setupWebSocket(selectedProjectId);
      loadConversations(selectedProjectId);
      loadAnalytics(selectedProjectId);
      setMessages([]); // reset chat on agent switch
    }
  }, [selectedProjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadUserProfile = async () => {
    try {
      const uData = await clientApi.getMe();
      setUser(uData);
    } catch (err) {
      setToken(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await clientApi.login(email, password);
      localStorage.setItem('bfsi_client_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setStatusMsg('Login successful!');
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || 'Invalid login credentials');
    }
  };

  const loadProjects = async () => {
    try {
      const data = await clientApi.getProjects();
      setProjects(data);
      if (data.length > 0) {
        // Prefer first Live agent if available
        const liveProj = data.find((p: any) => p.status === 'Live' || p.status === 'active') || data[0];
        setSelectedProjectId(liveProj.id);
      }
    } catch (err) {}
  };

  const setupWebSocket = (projId: string) => {
    if (ws) {
      ws.close();
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${projId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Connected to Agent WebSocket');
    };

    socket.onmessage = (event) => {
      setIsLoading(false);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'MESSAGE_STREAM') {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'assistant') {
              return [...prev.slice(0, -1), { ...last, text: last.text + data.payload }];
            } else {
              return [...prev, { sender: 'assistant', text: data.payload }];
            }
          });
        } else if (data.type === 'AUDIO_STREAM') {
          // Play ElevenLabs audio
          const audio = new Audio(`data:audio/mp3;base64,${data.payload}`);
          audio.play().catch((e) => console.log('Audio playback error', e));
        }
      } catch (e) {
        console.error('Error handling WebSocket message', e);
      }
    };

    socket.onerror = () => {
      setIsLoading(false);
    };

    setWs(socket);
  };

  const sendMessageText = useCallback(async (userText: string, voiceMode: boolean) => {
    if (!userText.trim() || !selectedProjectId || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText, isVoice: voiceMode }]);
    setIsLoading(true);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'USER_MESSAGE',
        payload: userText,
        isVoiceInput: voiceMode,
      }));
    } else {
      // HTTP Fallback
      try {
        const res = await clientApi.sendMessage(selectedProjectId, userText);
        setMessages((prev) => [...prev, {
          sender: 'assistant',
          text: res.answer,
          latency_ms: res.latency_ms,
        }]);
      } catch (err) {
        setMessages((prev) => [...prev, { sender: 'assistant', text: 'Error connecting to agent service.' }]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedProjectId, isLoading, ws]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageText(input.trim(), isVoice);
  };

  // Voice Recording: Start/Stop browser Speech Recognition
  const toggleVoiceRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      // Stop recording
      recognition.stop();
      setIsRecording(false);
      return;
    }

    // Start recording
    setIsRecording(true);
    setIsVoice(true);
    setInput('');

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      // Show interim results in input field
      setInput(finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech Recognition Error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Auto-send the final transcribed text
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
        // Use a small timeout to ensure state is updated before sending
        setTimeout(() => {
          sendMessageText(finalTranscript.trim(), true);
        }, 100);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  }, [isRecording, sendMessageText]);

  const loadConversations = async (projId: string) => {
    try {
      const data = await clientApi.getConversations(projId);
      setConversations(data);
    } catch (err) {}
  };

  const loadTranscript = async (convId: string) => {
    setSelectedConvId(convId);
    try {
      const msgs = await clientApi.getMessages(convId);
      setTranscript(msgs);
    } catch (err) {}
  };

  const loadAnalytics = async (projId: string) => {
    try {
      const data = await clientApi.getAnalytics(projId);
      setAnalytics(data);
    } catch (err) {}
  };

  const selectedAgent = projects.find((p) => p.id === selectedProjectId);
  const isAgentLive = selectedAgent ? (selectedAgent.status === 'Live' || selectedAgent.status === 'active') : true;

  if (!token || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md space-y-6 shadow-2xl">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">C</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">BFSI Client Portal</h2>
          </div>
          <p className="text-xs text-slate-400 text-center">Live Operations, Voicebot & Telemetry Inspector</p>
          {statusMsg && <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 rounded-lg text-sm">{statusMsg}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">User Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold py-2.5 rounded-lg text-white shadow-lg shadow-emerald-500/20 transition">Sign In to Client Portal</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center font-bold text-white shadow-md">C</div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">BFSI Client Operations</h1>
            <p className="text-xs text-slate-400">Operator: <strong>{user.full_name}</strong> ({user.role})</p>
          </div>
        </div>

        {/* Live Agent Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Active Agent:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              {projects.map((p) => {
                const isLive = p.status === 'Live' || p.status === 'active';
                return (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {isLive ? '🟢' : p.status === 'Paused' ? '🟡' : '⚪'} {p.name} ({p.domain.toUpperCase()} • {p.status || 'Live'})
                  </option>
                );
              })}
            </select>
          </div>

          <button onClick={() => { localStorage.removeItem('bfsi_client_token'); setToken(null); }} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition">Sign Out</button>
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 flex space-x-6">
        {(['chat', 'history', 'dashboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-sm font-semibold border-b-2 transition ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            {tab === 'chat' && '💬 Live Agent Chat & Voicebot'}
            {tab === 'history' && '📜 Session History & Transcripts'}
            {tab === 'dashboard' && '📊 Operational Telemetry'}
          </button>
        ))}
      </div>

      {/* Main Body */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: CHATBOT & VOICEBOT */}
        {activeTab === 'chat' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl h-[670px] flex flex-col shadow-2xl overflow-hidden">
            {/* Agent Status Bar */}
            <div className="bg-slate-800/80 px-6 py-3 border-b border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className={`w-2.5 h-2.5 rounded-full ${isAgentLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="font-semibold text-slate-200">{selectedAgent?.name || 'Selected Agent'}</span>
                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase font-mono text-[10px]">{selectedAgent?.domain || 'BFSI'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isAgentLive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  {selectedAgent?.status || 'Live'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-slate-400">
                <span>Model: <strong className="text-slate-300">OpenRouter (Gemini / Llama)</strong></span>
                <span>Voice: <strong className="text-slate-300">ElevenLabs TTS</strong></span>
              </div>
            </div>

            {/* Inactive Agent Notice if Paused or Draft */}
            {!isAgentLive && (
              <div className="bg-amber-950/70 border-b border-amber-800 px-6 py-2.5 text-xs text-amber-300 flex items-center justify-between">
                <span>⚠️ Note: This agent is currently <strong>{selectedAgent?.status}</strong>. Inquiries will receive an automated maintenance response. Switch to a Live agent in the top header.</span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 my-24 space-y-2">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-inner">💬</div>
                  <p className="text-base font-semibold text-slate-400">Connected to {selectedAgent?.name || 'Agent'}</p>
                  <p className="text-xs text-slate-500">Ask any banking, finance, or policy question. Two-pass guardrails and per-project Chroma RAG context are active.</p>
                </div>
              )}
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-none'
                  }`}>
                    <div className="text-[10px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>{m.sender === 'user' ? 'You' : 'Agent Assistant'}</span>
                      {m.latency_ms && <span className="font-mono text-slate-400">{m.latency_ms}ms</span>}
                    </div>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl text-sm text-slate-400 rounded-bl-none flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-xs text-slate-400 ml-2">OpenRouter is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center space-x-3">
              {/* Microphone Voice Input Button */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                disabled={isLoading}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition ${
                  isRecording
                    ? 'bg-red-950/80 border-red-500 text-red-400 shadow-md shadow-red-500/30 animate-pulse'
                    : isVoice
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                }`}
                title={isRecording ? 'Click to stop recording' : 'Click to start voice input'}
              >
                <span>{isRecording ? '⏹️' : '🎙️'}</span>
                <span>{isRecording ? 'Listening...' : 'Voice'}</span>
              </button>

              {/* Voice/Text mode toggle */}
              {!isRecording && (
                <button
                  type="button"
                  onClick={() => setIsVoice(!isVoice)}
                  className={`px-2 py-2.5 rounded-lg border text-[10px] font-semibold transition ${
                    isVoice ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-slate-800/60 border-slate-700 text-slate-500'
                  }`}
                  title={isVoice ? 'TTS responses ON — click to disable' : 'TTS responses OFF — click to enable'}
                >
                  {isVoice ? '🔊' : '🔇'}
                </button>
              )}

              <input
                type="text"
                placeholder={isRecording ? '🎤 Listening... speak now' : 'Ask about account balances, card blocks, interest rates, or claim status...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || isRecording}
                className={`flex-1 bg-slate-800 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isRecording ? 'border-red-600/50 bg-red-950/20' : 'border-slate-700'
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isRecording}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-500/20"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: CONVERSATION HISTORY & TRANSCRIPTS */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <h3 className="font-bold text-emerald-400 text-base">Conversation Sessions</h3>
              <div className="space-y-2 max-h-[560px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">No past conversation sessions found.</p>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadTranscript(c.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${selectedConvId === c.id ? 'bg-emerald-950/50 border-emerald-600' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white font-mono">{c.session_id.substring(0, 8)}...</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'escalated' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{c.intent_summary || 'General Inquiry'}</p>
                      <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                        <span>Channel: <strong>{c.channel}</strong></span>
                        <span>{new Date(c.start_time).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h3 className="font-bold text-emerald-400 text-base">Detailed Message Transcript</h3>
              <div className="space-y-3 max-h-[520px] overflow-y-auto">
                {transcript.length === 0 ? (
                  <p className="text-sm text-slate-500 py-16 text-center">Select a conversation session on the left to inspect its messages.</p>
                ) : (
                  transcript.map((m) => (
                    <div key={m.id} className={`p-4 rounded-xl border text-sm ${m.sender_type === 'user' ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-slate-800 border-slate-700'}`}>
                      <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-between">
                        <span>{m.sender_type.toUpperCase()}</span>
                        <span className="font-mono text-[11px] text-slate-500">Latency: {m.latency_ms}ms • Tokens: {m.tokens_used}</span>
                      </div>
                      <p className="text-slate-100 whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OPERATIONAL TELEMETRY & ANALYTICS */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
                <p className="text-xs text-slate-400 font-medium">Total Conversations</p>
                <p className="text-3xl font-extrabold text-white mt-1">{analytics.total_conversations}</p>
                <p className="text-[11px] text-slate-500 mt-1">Tenant Session Count</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
                <p className="text-xs text-slate-400 font-medium">Resolution Rate</p>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1">{analytics.resolution_rate}%</p>
                <p className="text-[11px] text-emerald-500/80 mt-1">Resolved without Escalation</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
                <p className="text-xs text-slate-400 font-medium">Avg Turn Latency</p>
                <p className="text-3xl font-extrabold text-blue-400 mt-1">{analytics.avg_response_time_ms} ms</p>
                <p className="text-[11px] text-blue-500/80 mt-1">OpenRouter LLM + RAG Time</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
                <p className="text-xs text-slate-400 font-medium">Customer CSAT Score</p>
                <p className="text-3xl font-extrabold text-amber-400 mt-1">{analytics.feedback_score} / 5.0</p>
                <p className="text-[11px] text-amber-500/80 mt-1">Satisfied User Feedback</p>
              </div>
            </div>

            {/* Split & Intents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <h4 className="font-bold text-white text-base">Channel Split (Chat vs Voice)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
                    <p className="text-xs text-slate-400">💬 Text Chat Sessions</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{analytics.chat_vs_voice?.chat || 0}</p>
                  </div>
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
                    <p className="text-xs text-slate-400">🎙️ Voicebot Calls</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">{analytics.chat_vs_voice?.voice || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <h4 className="font-bold text-white text-base">Guardrails & Escalations</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
                    <p className="text-xs text-slate-400">🚨 Flagged Policy Violations</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{analytics.failed_api_calls || 0}</p>
                  </div>
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
                    <p className="text-xs text-slate-400">⚠️ Escalated to Human</p>
                    <p className="text-2xl font-bold text-orange-400 mt-1">{analytics.escalated_conversations || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
