import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { ChatTransport } from "./ChatTransport"
import { createTransport, type TransportInstance, type ConnectionState } from "./createTransport"
import { getStoredSession } from "../services/apiClient"

interface TransportContextValue {
  transport: ChatTransport
  connectionState: ConnectionState
  isConnected: boolean
}

const TransportContext = createContext<TransportContextValue | null>(null)

export function TransportProvider({ children }: { children: ReactNode }) {
  const transportInstanceRef = useRef<TransportInstance | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")

  useEffect(() => {
    if (!getStoredSession()?.user?.access_token) {
      return
    }

    const newTransport = createTransport()
    transportInstanceRef.current = newTransport

    if (newTransport.onConnectionChange) {
      newTransport.onConnectionChange(setConnectionState)
    } else {
      setConnectionState("connected")
    }

    newTransport.transport.connect()

    return () => {
      newTransport.transport.disconnect()
    }
  }, [])

  if (!transportInstanceRef.current) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">Connecting Hexa…</div>
  }

  const value: TransportContextValue = {
    transport: transportInstanceRef.current.transport,
    connectionState,
    isConnected: connectionState === "connected",
  }

  return <TransportContext.Provider value={value}>{children}</TransportContext.Provider>
}

export function useTransport(): TransportContextValue {
  const context = useContext(TransportContext)
  if (!context) {
    throw new Error("useTransport must be used within a TransportProvider")
  }
  return context
}
