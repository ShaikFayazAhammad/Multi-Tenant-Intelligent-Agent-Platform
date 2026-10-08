import { createContext, useContext, useRef, useState, ReactNode } from "react"

interface BargeInContextType {
  registerStopCallback: (callback: () => void) => void
  unregisterStopCallback: () => void
  triggerBargeIn: () => void
  registerResumeCallback: (callback: () => void) => void
  unregisterResumeCallback: () => void
  triggerResume: () => void
  // NEW: track whether bot is currently speaking so mic can ignore its own output
  isBotSpeaking: boolean
  setBotSpeaking: (val: boolean) => void
}

const BargeInContext = createContext<BargeInContextType | null>(null)

export function BargeInProvider({ children }: { children: ReactNode }) {
  const stopCallbackRef = useRef<(() => void) | null>(null)
  const resumeCallbackRef = useRef<(() => void) | null>(null)

  // Shared flag — ChatInput reads this to suppress mic input during bot speech
  const [isBotSpeaking, setIsBotSpeaking] = useState(false)

  const registerStopCallback = (callback: () => void) => {
    stopCallbackRef.current = callback
  }

  const unregisterStopCallback = () => {
    stopCallbackRef.current = null
  }

  const registerResumeCallback = (callback: () => void) => {
    resumeCallbackRef.current = callback
  }

  const unregisterResumeCallback = () => {
    resumeCallbackRef.current = null
  }

  const triggerBargeIn = () => {
    if (stopCallbackRef.current) {
      console.log("Barge-in triggered: stopping bot speech immediately")
      try {
        stopCallbackRef.current()
      } catch (error) {
        console.error("Error in barge-in callback:", error)
      }
    }
  }

  const triggerResume = () => {
    if (resumeCallbackRef.current) {
      console.log("Resuming interrupted bot speech")
      resumeCallbackRef.current()
    }
  }

  return (
    <BargeInContext.Provider
      value={{
        registerStopCallback,
        unregisterStopCallback,
        triggerBargeIn,
        registerResumeCallback,
        unregisterResumeCallback,
        triggerResume,
        isBotSpeaking,
        setBotSpeaking: setIsBotSpeaking,
      }}
    >
      {children}
    </BargeInContext.Provider>
  )
}

export function useBargeIn() {
  const context = useContext(BargeInContext)
  if (!context) {
    throw new Error("useBargeIn must be used within BargeInProvider")
  }
  return context
}