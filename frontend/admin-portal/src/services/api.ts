import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bfsi_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminApi = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // Templates
  getTemplates: async () => {
    const res = await api.get('/admin/templates');
    return res.data;
  },

  // Orgs
  getOrgs: async () => {
    const res = await api.get('/admin/orgs');
    return res.data;
  },
  createOrg: async (name: string, slug: string) => {
    const res = await api.post('/admin/orgs', { name, slug });
    return res.data;
  },
  createOrgUser: async (orgId: string, userData: any) => {
    const res = await api.post(`/admin/orgs/${orgId}/users`, userData);
    return res.data;
  },

  // Projects
  getProjects: async (orgId: string) => {
    const res = await api.get(`/admin/orgs/${orgId}/projects`);
    return res.data;
  },
  createProject: async (orgId: string, name: string, domain: string, templateDomain?: string) => {
    const res = await api.post(`/admin/orgs/${orgId}/projects`, { name, domain, template_domain: templateDomain });
    return res.data;
  },

  // Project Config
  getConfig: async (projectId: string) => {
    const res = await api.get(`/admin/projects/${projectId}/config`);
    return res.data;
  },
  updateConfig: async (projectId: string, configData: any) => {
    const res = await api.put(`/admin/projects/${projectId}/config`, configData);
    return res.data;
  },

  // API Integrations
  getIntegrations: async (projectId: string) => {
    const res = await api.get(`/admin/projects/${projectId}/integrations`);
    return res.data;
  },
  createIntegration: async (projectId: string, integrationData: any) => {
    const res = await api.post(`/admin/projects/${projectId}/integrations`, integrationData);
    return res.data;
  },
  testCall: async (integrationId: string, endpointName: string, queryParams = {}, bodyJson = {}) => {
    const res = await api.post(`/admin/integrations/${integrationId}/test-call`, {
      endpoint_name: endpointName,
      query_params: queryParams,
      body_json: bodyJson,
    });
    return res.data;
  },

  // KB Docs
  getKbDocs: async (projectId: string) => {
    const res = await api.get(`/admin/projects/${projectId}/kb`);
    return res.data;
  },
  uploadKbDoc: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/admin/projects/${projectId}/kb/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  // Playground Test Chat
  testPlaygroundChat: async (projectId: string, message: string) => {
    const res = await api.post('/client/chat', { project_id: projectId, message });
    return res.data;
  },
};
