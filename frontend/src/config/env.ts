export interface AppConfig {
  wsUrl: string
  useMock: boolean
  debug: boolean
}

function getEnvVar(key: string, defaultValue: string): string {
  const value = (import.meta.env as Record<string, string>)[key]
  return value ?? defaultValue
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = (import.meta.env as Record<string, string>)[key]
  if (value === undefined) return defaultValue
  return value === "true" || value === "1"
}

function getDefaultWsUrl(): string {
  if (typeof window === "undefined") {
    return "ws://localhost:8125/ws"
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//localhost:8125/ws`
}

export const config: AppConfig = {
  wsUrl: getEnvVar("VITE_WS_URL", getDefaultWsUrl()),
  useMock: getEnvBool("VITE_USE_MOCK", false),
  debug: getEnvBool("VITE_DEBUG", import.meta.env.DEV),
}

if (config.debug) {
  console.log("Hexa config:", config)
}
