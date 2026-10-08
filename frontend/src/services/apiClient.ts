import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  buildLocalSession,
  clearStoredSession,
  createSessionFromStoredInput,
  getStoredSession,
  isSessionActive,
  SESSION_STORAGE_KEY,
  updateStoredSession,
  type LocalLoginInput,
  type SessionLocation,
  type SessionUser,
  type UserSession,
} from "../auth/localSession";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  return typeof configured === "string" && configured.trim() ? configured.trim() : DEFAULT_API_BASE_URL;
}

function getAccessToken(): string | null {
  return getStoredSession()?.user?.access_token ?? null;
}

function getValidAccessToken(): Promise<string | null> {
  return Promise.resolve(getAccessToken());
}

/**
 * Build a UserSession from the backend auth response.
 * The backend returns: { access_token, token_type, user: { id, email, full_name, employee_id, department, floor, room, role } }
 * refresh_token is not issued by this backend, so we supply a placeholder.
 */
function createSessionFromAuthUser(
  data: {
    access_token: string;
    token_type?: string;
    refresh_token?: string;
    user?: Record<string, unknown>;
  },
  location?: Partial<SessionLocation>
): UserSession | null {
  if (!data.access_token) {
    return null;
  }

  const backendUser = (data.user ?? {}) as Record<string, unknown>;
  const refreshToken = data.refresh_token ?? "dummy-refresh-token";

  return createSessionFromStoredInput({
    user: {
      profile: {
        full_name: String(backendUser.full_name ?? backendUser.name ?? "Hexa User"),
        employee_id: String(backendUser.employee_id ?? backendUser.id ?? "HEX-LOCAL"),
        department: String(backendUser.department ?? "General Services"),
        role: String(backendUser.role ?? "Employee"),
        company: "HEXA",
        service_access: ["banking", "meeting rooms", "tea", "coffee", "support"],
      },
      access_token: data.access_token,
      refresh_token: refreshToken,
      id_token: "",
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      scopes: ["openid", "profile", "offline_access"],
    },
    location: {
      floor: String(backendUser.floor ?? location?.floor ?? "Unknown"),
      room: String(backendUser.room ?? location?.room ?? "Unknown"),
    },
    lastLoginAt: new Date().toISOString(),
  });
}

function createLocalSession(input: LocalLoginInput): UserSession {
  return buildLocalSession(input);
}

const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const accessToken = await getValidAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401 && isSessionActive()) {
      clearStoredSession();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ── API helpers ──────────────────────────────────────────────────────────────

export async function registerUser(userData: {
  full_name: string;
  email: string;
  password: string;
  employee_id?: string;
  department?: string;
  role?: string;
}): Promise<any> {
  return apiClient.post("/api/auth/signup", userData);
}

export async function loginUser(creds: { email: string; password: string }): Promise<any> {
  return apiClient.post("/api/auth/login", creds);
}

// ── Re-exports for convenience ───────────────────────────────────────────────

export {
  SESSION_STORAGE_KEY,
  buildLocalSession,
  clearStoredSession,
  createLocalSession,
  createSessionFromAuthUser,
  createSessionFromStoredInput,
  getStoredSession,
  getValidAccessToken,
  isSessionActive,
  updateStoredSession,
};

export type {
  LocalLoginInput,
  SessionLocation,
  SessionUser,
  UserSession,
};
