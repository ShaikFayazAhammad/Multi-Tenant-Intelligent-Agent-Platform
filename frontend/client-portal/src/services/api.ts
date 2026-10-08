import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bfsi_client_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const clientApi = {
  // Auth
  login: async (email: string, password: str) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // Projects visibility based on role (Supervisor sees all org projects, Lead sees assigned)
  getProjects: async (orgId: string) => {
    const res = await api.get(`/admin/orgs/${orgId}/projects`);
    return res.data;
  },

  // Chat HTTP fallback
  sendMessage: async (projectId: string, message: string, sessionId?: string) => {
    const res = await api.post('/client/chat', { project_id: projectId, message, session_id: sessionId });
    return res.data;
  },

  // History & Transcripts
  getConversations: async (projectId?: string) => {
    const res = await api.get('/client/conversations', { params: { project_id: projectId } });
    return res.data;
  },
  getMessages: async (conversationId: string) => {
    const res = await api.get(`/client/conversations/${conversationId}/messages`);
    return res.data;
  },

  // Analytics Dashboard
  getAnalytics: async (projectId?: string) => {
    const res = await api.get('/analytics/dashboard', { params: { project_id: projectId } });
    return res.data;
  },
};
