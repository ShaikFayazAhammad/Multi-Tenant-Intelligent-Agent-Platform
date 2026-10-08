import { useNavigate } from "react-router-dom"
import { ChatContainer } from "../components/Chat/ChatContainer"
import { ChatInput } from "../components/Chat/ChatInput"
import { ConnectionStatus } from "../components/Chat/ConnectionStatus"
import { useChatStream } from "../components/Chat/ChatStream"
import { useTransport } from "../transport/TransportContext"
import { clearStoredSession, getStoredSession } from "../services/apiClient"
import { useChatStore } from "../store/chatStore"

export function ChatPage() {
  const send = useChatStream()
  const { isConnected, connectionState } = useTransport()
  const navigate = useNavigate()
  const sessionData = getStoredSession()
  const clearMessages = useChatStore((state) => state.clearMessages)
  const displayName = sessionData?.user?.profile?.full_name || "BFSI Operations User"
  const department = sessionData?.user?.profile?.department || "BFSI Platform • Banking, Finance & Insurance (SaaS)"

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/vms_logo.png" alt="BFSI logo" className="h-10 w-auto object-contain rounded-xl bg-slate-100 p-1" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">BFSI Assistant (SaaS)</h1>
              <p className="text-xs text-slate-500">{department} • {displayName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <ConnectionStatus />
            </div>
            <button
              onClick={() => {
                clearStoredSession()
                clearMessages()
                sessionStorage.removeItem("bfsi_temp_floor")
                sessionStorage.removeItem("bfsi_temp_room")
                navigate("/login")
              }}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {connectionState === "error" && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2">
          <p className="text-center text-sm text-red-600">
            Websocket is down. Messages will queue and resume automatically.
          </p>
        </div>
      )}

      {connectionState === "connecting" && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-center text-sm text-amber-700">Connecting to BFSI Agent Platform backend…</p>
        </div>
      )}

      <ChatContainer />
      <ChatInput onSend={send} disabled={!isConnected && connectionState !== "connected"} />
    </div>
  )
}
