import { nanoid } from "nanoid"

export const SESSION_STORAGE_KEY = "vms_user_session"
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 30

export type SessionLocation = {
  floor: string
  room: string
}

export type SessionUser = {
  profile: {
    full_name: string
    employee_id: string
    department: string
    role: string
    company: string
    service_access: string[]
  }
  access_token: string
  refresh_token: string
  id_token: string
  expires_at: number
  scopes: string[]
}

export interface UserSession {
  user: SessionUser
  location: SessionLocation
  lastLoginAt: string
}

export type LocalLoginInput = {
  fullName: string
  employeeId: string
  department: string
  role: string
  floor: string
  room: string
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function createDummyJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }))
  const body = base64UrlEncode(JSON.stringify(payload))
  return `${header}.${body}.hexa`
}

export function buildLocalSession(input: LocalLoginInput): UserSession {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + TOKEN_LIFETIME_SECONDS

  const accessToken = createDummyJwt({
    sub: input.employeeId,
    name: input.fullName,
    dept: input.department,
    role: input.role,
    floor: input.floor,
    room: input.room,
    iss: "hexa-local",
    aud: "hexa-client",
    exp: expiresAt,
    iat: now,
    jti: nanoid(),
    services: ["vms", "banking", "chat", "voice", "websocket"],
  })

  const refreshToken = createDummyJwt({
    sub: input.employeeId,
    type: "refresh",
    exp: expiresAt + TOKEN_LIFETIME_SECONDS,
    jti: nanoid(),
  })

  const idToken = createDummyJwt({
    sub: input.employeeId,
    name: input.fullName,
    department: input.department,
    company: "HEXA",
    exp: expiresAt,
    iat: now,
  })

  return {
    user: {
      profile: {
        full_name: input.fullName,
        employee_id: input.employeeId,
        department: input.department,
        role: input.role,
        company: "BFSI SaaS",
        service_access: ["banking", "finance", "insurance", "support"],
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      id_token: idToken,
      expires_at: expiresAt,
      scopes: ["openid", "profile", "offline_access", "hexa.local"],
    },
    location: {
      floor: input.floor,
      room: input.room,
    },
    lastLoginAt: new Date().toISOString(),
  }
}

export function createSessionFromStoredInput(session: UserSession): UserSession {
  return {
    ...session,
    user: {
      ...session.user,
      profile: {
        ...session.user.profile,
        service_access: Array.isArray(session.user.profile?.service_access)
          ? session.user.profile.service_access
          : ["banking", "meeting rooms", "tea", "coffee", "support"],
      },
      scopes: Array.isArray(session.user.scopes) ? session.user.scopes : [],
    },
    location: {
      floor: session.location?.floor || "Unknown",
      room: session.location?.room || "Unknown",
    },
    lastLoginAt: session.lastLoginAt || new Date().toISOString(),
  }
}

export function getStoredSession(): UserSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as UserSession
    return createSessionFromStoredInput(parsed)
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function updateStoredSession(session: UserSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function isSessionActive(): boolean {
  return !!getStoredSession()?.user?.access_token
}
