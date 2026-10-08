export type Role = "user" | "assistant" | "system"

export interface ChatMessage {
  id: string
  role: Role
  content: string
  streaming?: boolean
}

export type ChatEvent =
  | { type: "MESSAGE_STREAM"; payload: string }
  | { type: "MESSAGE_COMPLETE" }
  | { type: "ERROR"; payload: string }