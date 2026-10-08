import { ChatTransport } from "./ChatTransport"
import { ChatEvent } from "../types/chat"
import { getStoredSession, getValidAccessToken } from "../services/apiClient"

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error"

export interface WebSocketTransportOptions {
  url: string
  reconnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
}

export class WebSocketChatTransport implements ChatTransport {
  private ws: WebSocket | null = null
  private eventCallback?: (event: ChatEvent) => void
  private connectionCallback?: (state: ConnectionState) => void
  private options: Required<WebSocketTransportOptions>
  private reconnectCount = 0
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private heartbeatTimer?: ReturnType<typeof setInterval>
  private isManualDisconnect = false
  private isConnecting = false
  private messageQueue: string[] = []
  private connectionState: ConnectionState = "disconnected"

  constructor(options: WebSocketTransportOptions) {
    this.options = {
      url: options.url,
      reconnect: options.reconnect ?? true,
      reconnectAttempts: options.reconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
    }
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state
    this.connectionCallback?.(state)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  onConnectionChange(callback: (state: ConnectionState) => void) {
    this.connectionCallback = callback
    // Immediately notify current state
    callback(this.connectionState)
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log("WebSocket already connected")
      return
    }

    this.isManualDisconnect = false
    this.setConnectionState("connecting")
    void this.openSocket()
  }

  private async openSocket() {
    this.isConnecting = true
    try {
      const accessToken = await getValidAccessToken()
      const socketUrl = accessToken
        ? `${this.options.url}${this.options.url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`
        : this.options.url

      this.ws = new WebSocket(socketUrl)

      this.ws.onopen = () => {
        console.log("WebSocket connected to:", socketUrl)
        this.setConnectionState("connected")
        this.reconnectCount = 0
        this.startHeartbeat()
        this.flushMessageQueue()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle pong responses
          if (data.type === "PONG") {
            return
          }

          // Forward chat events
          if (this.eventCallback) {
            this.eventCallback(data as ChatEvent)
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason)
        this.stopHeartbeat()

        if (!this.isManualDisconnect) {
          this.setConnectionState("disconnected")
          this.attemptReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        this.setConnectionState("error")
      }
    } catch (error) {
      console.error("Failed to create WebSocket:", error)
      this.setConnectionState("error")
      this.attemptReconnect()
    } finally {
      this.isConnecting = false
    }
  }

  disconnect() {
    this.isManualDisconnect = true
    this.stopHeartbeat()
    this.clearReconnectTimer()

    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }

    this.setConnectionState("disconnected")
  }

  sendMessage(message: string, isVoiceInput: boolean = false) {
    void this.sendMessageInternal(message, isVoiceInput)
  }

  private async sendMessageInternal(message: string, isVoiceInput: boolean) {
    const session = getStoredSession()
    const accessToken = await getValidAccessToken()
    const room = session?.location?.room && session.location.room !== "Unknown"
      ? session.location.room
      : "Governance"

    console.log(`Transport: Sending USER_MESSAGE with source: "${room}"`)

    const payload = JSON.stringify({
      type: "USER_MESSAGE",
      payload: message,
      access_token: accessToken || "",
      source: room,
      isVoiceInput: isVoiceInput,
    })

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
      return
    }

    console.log("WebSocket not connected, queueing message")
    this.messageQueue.push(payload)

    if (this.connectionState === "disconnected" || this.connectionState === "error") {
      this.connect()
    }
  }

  onEvent(callback: (event: ChatEvent) => void) {
    this.eventCallback = callback
  }

  private startHeartbeat() {
    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "PING" }))
      }
    }, this.options.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private attemptReconnect() {
    if (!this.options.reconnect || this.isManualDisconnect) {
      return
    }

    if (this.reconnectCount >= this.options.reconnectAttempts) {
      console.log("Max reconnection attempts reached")
      this.setConnectionState("error")
      return
    }

    this.clearReconnectTimer()

    // Exponential backoff
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectCount)
    console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectCount + 1}/${this.options.reconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectCount++
      this.connect()
    }, delay)
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()
      if (message) {
        this.ws.send(message)
      }
    }
  }
}

