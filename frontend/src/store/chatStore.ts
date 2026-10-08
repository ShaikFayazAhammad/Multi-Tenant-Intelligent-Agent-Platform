import { create } from "zustand"
import { ChatMessage } from "../types/chat"
import { nanoid } from "nanoid"

interface ChatState {
  messages: ChatMessage[]
  isThinking: boolean
  addUserMessage(content: string): void
  startAssistantMessage(): string
  appendAssistantToken(id: string, token: string): void
  completeAssistantMessage(id: string): void
  setThinking(thinking: boolean): void
  clearMessages(): void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isThinking: false,

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: nanoid(), role: "user", content },
      ],
      isThinking: true, // Start thinking when user sends a message
    })),

  startAssistantMessage: () => {
    const id = nanoid()
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: "assistant", content: "", streaming: true },
      ],
      isThinking: false, // Stop thinking when first token arrives
    }))
    return id
  },

  appendAssistantToken: (id, token) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m
      ),
    })),

  completeAssistantMessage: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, streaming: false } : m
      ),
    })),

  setThinking: (thinking) =>
    set({ isThinking: thinking }),

  clearMessages: () =>
    set({
      messages: [],
      isThinking: false,
    }),
}))
