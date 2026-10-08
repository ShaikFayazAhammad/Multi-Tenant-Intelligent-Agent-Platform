import { ChatTransport } from "./ChatTransport"
import { MockChatTransport } from "./MockChatTransport"
import { WebSocketChatTransport, ConnectionState } from "./WebSocketChatTransport"
import { config } from "../config/env"

export interface TransportInstance {
  transport: ChatTransport
  // Connection state management (only available for WebSocket transport)
  onConnectionChange?: (callback: (state: ConnectionState) => void) => void
  getConnectionState?: () => ConnectionState
}

/**
 * Creates a chat transport based on environment configuration.
 * 
 * - In mock mode (VITE_USE_MOCK=true): Returns MockChatTransport for local development
 * - In production mode: Returns WebSocketChatTransport connected to the backend
 */
export function createTransport(): TransportInstance {
  if (config.useMock) {
    if (config.debug) {
      console.log("Using MockChatTransport for development")
    }

    return {
      transport: new MockChatTransport(),
    }
  }

  if (config.debug) {
    console.log("Using WebSocketChatTransport:", config.wsUrl)
  }

  const wsTransport = new WebSocketChatTransport({
    url: config.wsUrl,
    reconnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
  })

  return {
    transport: wsTransport,
    onConnectionChange: (callback) => wsTransport.onConnectionChange(callback),
    getConnectionState: () => wsTransport.getConnectionState(),
  }
}

// Re-export types
export type { ConnectionState } from "./WebSocketChatTransport"

