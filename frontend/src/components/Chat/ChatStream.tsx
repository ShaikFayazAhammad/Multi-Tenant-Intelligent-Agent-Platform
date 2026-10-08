import { useEffect, useRef, useCallback } from "react"
import { useChatStore } from "../../store/chatStore"
import { useElevenLabsTTS } from "../../voice/useElevenLabsTTS"
import { useTransport } from "../../transport/TransportContext"
import { useBargeIn } from "../../voice/BargeInContext"

export function useChatStream() {
  const { transport } = useTransport()
  const {
    addUserMessage,
    startAssistantMessage,
    appendAssistantToken,
    completeAssistantMessage,
  } = useChatStore()

  const { registerStopCallback, unregisterStopCallback, registerResumeCallback, unregisterResumeCallback, setBotSpeaking } = useBargeIn()

  // Wire TTS callbacks → BargeInContext so ChatInput knows when to mute/unmute mic
  const { playAudio, stop: stopAudio, supported: ttsSupported } = useElevenLabsTTS({
    onPlayStart: () => {
      console.log("🔊 Bot started speaking — muting mic")
      setBotSpeaking(true)
    },
    onPlayEnd: () => {
      console.log("🔇 Bot finished speaking — mic can resume")
      setBotSpeaking(false)
    },
  })

  // Register barge-in callback to stop speech synthesis when user speaks
  useEffect(() => {
    const stopCallback = () => {
      console.log("Barge-in: Stopping bot speech immediately")
      stopAudio()
      // setBotSpeaking(false) is handled inside stopAudio via onPlayEnd callback
    }

    registerStopCallback(stopCallback)

    return () => {
      unregisterStopCallback()
      unregisterResumeCallback()
    }
  }, [registerStopCallback, unregisterStopCallback, registerResumeCallback, unregisterResumeCallback, stopAudio])

  // Use refs to store latest values for use in event handler
  const speakRef = useRef(playAudio)
  const ttsSupportedRef = useRef(ttsSupported)
  const startAssistantMessageRef = useRef(startAssistantMessage)
  const appendAssistantTokenRef = useRef(appendAssistantToken)
  const completeAssistantMessageRef = useRef(completeAssistantMessage)

  useEffect(() => {
    speakRef.current = playAudio
    ttsSupportedRef.current = ttsSupported
  }, [playAudio, ttsSupported])

  useEffect(() => {
    startAssistantMessageRef.current = startAssistantMessage
    appendAssistantTokenRef.current = appendAssistantToken
    completeAssistantMessageRef.current = completeAssistantMessage
  }, [startAssistantMessage, appendAssistantToken, completeAssistantMessage])

  useEffect(() => {
    let assistantId: string | null = null
    let accumulatedText = ""

    const handleEvent = (event: any) => {
      console.log("Chat event received:", event.type)

      if (event.type === "MESSAGE_STREAM") {
        if (!assistantId) {
          assistantId = startAssistantMessageRef.current()
          console.log("Started assistant message:", assistantId)
        }
        appendAssistantTokenRef.current(assistantId, event.payload)
        accumulatedText += event.payload
      }

      if (event.type === "MESSAGE_COMPLETE") {
        console.log("Message complete, assistantId:", assistantId)
        if (assistantId) {
          completeAssistantMessageRef.current(assistantId)
        }
        assistantId = null
        accumulatedText = ""
      }

      // Handle audio stream from ElevenLabs TTS
      if (event.type === "AUDIO_STREAM") {
        console.log("Received audio stream from server")
        const audioBase64 = event.payload

        if (audioBase64 && ttsSupportedRef.current) {
          // onPlayStart fires inside playAudio → sets isBotSpeaking=true → mic pauses
          // onPlayEnd fires when done → sets isBotSpeaking=false → mic resumes
          speakRef.current(audioBase64).catch((error) => {
            console.error("Audio playback error:", error)
          })
        }
      }

      if (event.type === "ERROR") {
        console.error("Chat error:", event.payload)
        if (assistantId) {
          completeAssistantMessageRef.current(assistantId)
          assistantId = null
          accumulatedText = ""
        }
        const { setThinking } = useChatStore.getState()
        setThinking(false)
      }
    }

    transport.onEvent(handleEvent)
  }, [transport])

  const sendMessage = useCallback((message: string, isVoiceInput: boolean = false) => {
    if (!message.trim()) return
    console.log("Sending message:", message, "isVoiceInput:", isVoiceInput)
    addUserMessage(message)
    transport.sendMessage(message, isVoiceInput)
  }, [addUserMessage, transport])

  return sendMessage
}
