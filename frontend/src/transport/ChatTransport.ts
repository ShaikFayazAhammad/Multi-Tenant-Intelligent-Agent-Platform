import { ChatEvent } from "../types/chat"

export interface ChatTransport {
  connect(): void
  disconnect(): void
  sendMessage(message: string, isVoiceInput?: boolean): void
  onEvent(callback: (event: ChatEvent) => void): void
}