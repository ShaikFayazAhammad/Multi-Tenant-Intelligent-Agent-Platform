import axios from 'axios';
import type {
  Organization,
  Project,
  ProjectConfig,
  KnowledgeDoc,
  ApiIntegration,
  AnalyticsDashboard,
  AuditLog,
  DomainTemplate,
  CurlParseResult,
  ToolAssignment,
  MockInstallResult,
  HubSpotStatus,
} from '../types';

const API_BASE = '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bfsi_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminApi = {
  // ----- Auth -----
  login: async (email: string, password: string): Promise<{ access_token: string }> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // ----- Templates -----
  getTemplates: async (): Promise<DomainTemplate[]> => {
    const res = await api.get('/admin/templates');
    return res.data;
  },

  // ----- Organizations -----
  getOrgs: async (): Promise<Organization[]> => {
    const res = await api.get('/admin/orgs');
    return res.data;
  },
  createOrg: async (name: string, slug: string): Promise<Organization> => {
    const res = await api.post('/admin/orgs', { name, slug });
    return res.data;
  },
  createOrgUser: async (orgId: string, userData: {
    email: string; password: string; full_name: string; role: string;
  }) => {
    const res = await api.post(`/admin/orgs/${orgId}/users`, userData);
    return res.data;
  },

  // ----- Projects (containers for agents) -----
  getProjects: async (orgId: string): Promise<Project[]> => {
    const res = await api.get(`/admin/orgs/${orgId}/projects`);
    return res.data;
  },
  createProject: async (
    orgId: string, name: string, domain: string,
    templateDomain?: string, status: string = 'Live'
  ): Promise<Project> => {
    const res = await api.post(`/admin/orgs/${orgId}/projects`, {
      name, domain, template_domain: templateDomain, status
    });
    return res.data;
  },
  updateProjectStatus: async (projectId: string, status: string): Promise<Project> => {
    const res = await api.patch(`/admin/projects/${projectId}/status`, { status });
    return res.data;
  },

  // ----- Project Config (prompt, guardrails, agent settings) -----
  getConfig: async (projectId: string): Promise<ProjectConfig> => {
    const res = await api.get(`/admin/projects/${projectId}/config`);
    return res.data;
  },
  updateConfig: async (projectId: string, configData: Partial<ProjectConfig>): Promise<ProjectConfig> => {
    const res = await api.put(`/admin/projects/${projectId}/config`, configData);
    return res.data;
  },

  // ----- API Integrations (Vault) -----
  getIntegrations: async (projectId: string): Promise<ApiIntegration[]> => {
    const res = await api.get(`/admin/projects/${projectId}/integrations`);
    return res.data;
  },
  createIntegration: async (projectId: string, data: {
    name: string; base_url: string; auth_type: string;
    secret_key?: string; endpoints: any[]; is_enabled?: boolean;
  }): Promise<ApiIntegration> => {
    const res = await api.post(`/admin/projects/${projectId}/integrations`, data);
    return res.data;
  },
  testCall: async (
    integrationId: string, endpointName: string,
    queryParams: Record<string, any> = {}, bodyJson: Record<string, any> = {}
  ) => {
    const res = await api.post(`/admin/integrations/${integrationId}/test-call`, {
      endpoint_name: endpointName, query_params: queryParams, body_json: bodyJson,
    });
    return res.data;
  },

  // ----- cURL Import Parser -----
  parseCurl: async (curlCommand: string): Promise<CurlParseResult> => {
    const res = await api.post('/admin/parse-curl', { curl_command: curlCommand });
    return res.data;
  },

  // ----- Tool Assignments -----
  getToolAssignments: async (projectId: string): Promise<ToolAssignment[]> => {
    const res = await api.get(`/admin/projects/${projectId}/tool-assignments`);
    return res.data.assignments;
  },
  updateToolAssignments: async (
    projectId: string,
    assignments: { integration_id: string; is_enabled: boolean }[]
  ): Promise<{ updated: number; assignments: ToolAssignment[] }> => {
    const res = await api.put(`/admin/projects/${projectId}/tool-assignments`, { assignments });
    return res.data;
  },

  // ----- Mock BFSI Integration Install -----
  installMockIntegrations: async (projectId: string): Promise<MockInstallResult> => {
    const res = await api.post(`/admin/projects/${projectId}/install-mock-integrations`);
    return res.data;
  },

  // ----- HubSpot CRM Integration -----
  getHubSpotStatus: async (projectId: string): Promise<HubSpotStatus> => {
    const res = await api.get('/admin/hubspot/status', { params: { project_id: projectId } });
    return res.data;
  },
  connectHubSpot: async (projectId: string, privateAppToken: string) => {
    const res = await api.post('/admin/hubspot/connect', {
      project_id: projectId,
      private_app_token: privateAppToken,
    });
    return res.data;
  },
  installHubSpotIntegration: async (projectId: string) => {
    const res = await api.post(`/admin/projects/${projectId}/install-hubspot-integration`);
    return res.data;
  },
  searchHubSpotContacts: async (projectId: string, q: string = '') => {
    const res = await api.get('/admin/hubspot/contacts', { params: { project_id: projectId, q } });
    return res.data;
  },

  // ----- Knowledge Base -----
  getKbDocs: async (projectId: string): Promise<KnowledgeDoc[]> => {
    const res = await api.get(`/admin/projects/${projectId}/kb`);
    return res.data;
  },
  uploadKbDoc: async (projectId: string, file: File): Promise<KnowledgeDoc> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/admin/projects/${projectId}/kb/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  crawlUrl: async (projectId: string, url: string): Promise<KnowledgeDoc> => {
    const res = await api.post(`/admin/projects/${projectId}/kb/crawl`, { url });
    return res.data;
  },

  // ----- Analytics -----
  getAnalytics: async (projectId?: string): Promise<AnalyticsDashboard> => {
    const params = projectId ? { project_id: projectId } : {};
    const res = await api.get('/analytics/dashboard', { params });
    return res.data;
  },
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await api.get('/analytics/audit-logs');
    return res.data;
  },

  // ----- Playground -----
  testPlaygroundChat: async (projectId: string, query: string) => {
    const res = await api.post(`/admin/projects/${projectId}/playground-test`, { query });
    return res.data;
  },
};
