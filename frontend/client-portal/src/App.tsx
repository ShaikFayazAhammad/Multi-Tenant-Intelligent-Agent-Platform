import React, { useState, useEffect, useRef } from 'react';
import { clientApi } from './services/api';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
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
  const [ws, setWs] = useState<WebSocket | null>(null);

  // History State
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<any[]>([]);

  // Analytics Dashboard State
  const [analytics, setAnalytics] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      loadUserProfile();
    }
  }, [token]);

  useEffect(() => {
    if (user && user.org_id) {
      loadProjects(user.org_id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectId) {
      setupWebSocket(selectedProjectId);
      loadConversations(selectedProjectId);
      loadAnalytics(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      setStatusMsg(err.response?.data?.detail || 'Invalid login');
    }
  };

  const loadProjects = async (orgId: string) => {
    try {
      const data = await clientApi.getProjects(orgId);
      // Supervisor sees all projects; lead sees filtered projects
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
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
      console.log('Connected to Chatbot WebSocket');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'MESSAGE_STREAM') {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.sender === 'assistant') {
            return [...prev.slice(0, -1), { sender: 'assistant', text: last.text + data.payload }];
          } else {
            return [...prev, { sender: 'assistant', text: data.payload }];
          }
        });
      } else if (data.type === 'AUDIO_STREAM') {
        // Play ElevenLabs audio
        const audio = new Audio(`data:audio/mp3;base64,${data.payload}`);
        audio.play().catch((e) => console.log('Audio playback error', e));
      }
    };

    setWs(socket);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedProjectId) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'USER_MESSAGE',
        payload: userText,
        isVoiceInput: isVoice,
      }));
    } else {
      // HTTP Fallback
      try {
        const res = await clientApi.sendMessage(selectedProjectId, userText);
        setMessages((prev) => [...prev, { sender: 'assistant', text: res.answer }]);
      } catch (err) {
        setMessages((prev) => [...prev, { sender: 'assistant', text: 'Error connecting to assistant.' }]);
      }
    }
  };

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

  if (!token || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 p-8 rounded-xl w-full max-w-md space-y-6">
          <h2 className="text-2xl font-bold text-blue-400 text-center">BFSI Client Operations Portal</h2>
          {statusMsg && <div className="p-3 bg-blue-900/50 border border-blue-700 text-blue-200 rounded text-sm">{statusMsg}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">User Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2 rounded transition">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Navbar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">C</div>
          <div>
            <h1 className="text-xl font-bold text-white">BFSI Client Operations</h1>
            <p className="text-xs text-gray-400">User: {user.full_name} ({user.role})</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.domain})</option>))}
            </select>
          </div>
          <button onClick={() => { localStorage.removeItem('bfsi_client_token'); setToken(null); }} className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded">Logout</button>
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 flex space-x-4">
        {(['chat', 'history', 'dashboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-sm font-medium border-b-2 transition ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            {tab === 'chat' && '💬 Chatbot & Voicebot'}
            {tab === 'history' && '📜 Conversation History'}
            {tab === 'dashboard' && '📊 Operational Analytics'}
          </button>
        ))}
      </div>

      {/* Main Body */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: CHATBOT & VOICEBOT */}
        {activeTab === 'chat' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl h-[650px] flex flex-col">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 my-20">
                  <p className="text-lg">Start a conversation with the BFSI Intelligent Agent</p>
                  <p className="text-xs text-gray-600 mt-1">Session is bound to active project and two-pass guardrails</p>
                </div>
              )}
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xl p-3.5 rounded-xl text-sm ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-gray-900/50 flex items-center space-x-3">
              <button type="button" onClick={() => setIsVoice(!isVoice)} className={`p-2.5 rounded-lg border text-xs font-semibold transition ${isVoice ? 'bg-red-600/30 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                {isVoice ? '🎙️ Voice ON' : '🎤 Voice OFF'}
              </button>
              <input
                type="text"
                placeholder="Type your banking, finance, or insurance query..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm">Send</button>
            </form>
          </div>
        )}

        {/* TAB 2: CONVERSATION HISTORY & TRANSCRIPTS */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3">
              <h3 className="font-bold text-blue-400">Conversations List</h3>
              <div className="space-y-2 max-h-[550px] overflow-y-auto">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => loadTranscript(c.id)}
                    className={`p-3 rounded border cursor-pointer transition ${selectedConvId === c.id ? 'bg-blue-900/40 border-blue-600' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}
                  >
                    <p className="text-xs font-bold text-white">{c.session_id.substring(0, 8)}...</p>
                    <p className="text-xs text-gray-400">{c.intent_summary || 'General Inquiry'}</p>
                    <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                      <span>Channel: {c.channel}</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${c.status === 'escalated' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-blue-400">Message Transcript</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {transcript.length === 0 && <p className="text-sm text-gray-500">Select a conversation to view message logs</p>}
                {transcript.map((m) => (
                  <div key={m.id} className={`p-3 rounded border text-sm ${m.sender_type === 'user' ? 'bg-blue-950 border-blue-800' : 'bg-gray-800 border-gray-700'}`}>
                    <p className="text-xs text-gray-400 font-bold mb-1">{m.sender_type.toUpperCase()} • Latency: {m.latency_ms}ms</p>
                    <p className="text-gray-100">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OPERATIONAL ANALYTICS DASHBOARD */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Total Conversations</p>
                <p className="text-2xl font-bold text-white mt-1">{analytics.total_conversations}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{analytics.resolution_rate}%</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{analytics.avg_response_time_ms} ms</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Customer CSAT Score</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{analytics.feedback_score} / 5.0</p>
              </div>
            </div>

            {/* Split & Intents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
                <h4 className="font-bold text-gray-200">Channel Split (Chat vs Voice)</h4>
                <div className="flex items-center space-x-6 text-sm">
                  <div><span className="text-gray-400">Chat Sessions:</span> <span className="font-bold text-blue-400">{analytics.chat_vs_voice?.chat || 0}</span></div>
                  <div><span className="text-gray-400">Voice Sessions:</span> <span className="font-bold text-purple-400">{analytics.chat_vs_voice?.voice || 0}</span></div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
                <h4 className="font-bold text-gray-200">Failed API Calls & Escalations</h4>
                <div className="flex items-center space-x-6 text-sm">
                  <div><span className="text-gray-400">Failed API Calls:</span> <span className="font-bold text-red-400">{analytics.failed_api_calls || 0}</span></div>
                  <div><span className="text-gray-400">Escalations:</span> <span className="font-bold text-orange-400">{analytics.escalated_conversations || 0}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
