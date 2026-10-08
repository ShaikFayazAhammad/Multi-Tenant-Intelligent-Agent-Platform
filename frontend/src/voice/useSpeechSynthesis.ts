import { useEffect, useRef, useState } from "react"

interface SpeechSynthesisOptions {
  lang?: string
  pitch?: number
  rate?: number
  volume?: number
  voice?: SpeechSynthesisVoice
}

export function useSpeechSynthesis() {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const interruptedTextRef = useRef<string>("")
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)

  // Initialize on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis
      setSupported(true)

      // Some browsers need voices to be loaded
      // Chrome loads voices asynchronously, so we trigger loading
      if (synthRef.current.getVoices().length === 0) {
        synthRef.current.addEventListener("voiceschanged", () => {
          // Voices loaded
        })
      }
    }
  }, [])

  const speak = (
    text: string,
    options: SpeechSynthesisOptions = {}
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!synthRef.current || !supported) {
        reject(new Error("Speech synthesis not supported"))
        return
      }

      // Cancel any ongoing speech
      synthRef.current.cancel()
      currentUtteranceRef.current = null
      interruptedTextRef.current = ""

      const utterance = new SpeechSynthesisUtterance(text)
      currentUtteranceRef.current = utterance

      // Set options
      utterance.lang = options.lang || "en-IN"
      utterance.pitch = options.pitch ?? 1
      utterance.rate = options.rate ?? 0.9
      utterance.volume = options.volume ?? 1

      // Get voices (may need to be called multiple times for Chrome)
      const getVoices = () => {
        const voices = synthRef.current?.getVoices() || []
        if (voices.length === 0 && synthRef.current) {
          // Try again after a short delay if voices aren't loaded
          setTimeout(() => {
            const retryVoices = synthRef.current?.getVoices() || []
            selectVoice(retryVoices)
          }, 100)
          return
        }
        selectVoice(voices)
      }

      const selectVoice = (voices: SpeechSynthesisVoice[]) => {
        // Priority list for female voices
        const preferredVoice =
          // 1. Explicitly named "Female"
          voices.find((v) => v.name.toLowerCase().includes("female")) ||
          // 2. Microsoft Zira (Windows Standard Female)
          voices.find((v) => v.name.includes("Microsoft Zira")) ||
          // 3. Microsoft Heera (Indian English Female)
          voices.find((v) => v.name.includes("Microsoft Heera")) ||
          // 4. Google US English (Often Female)
          voices.find((v) => v.name === "Google US English") ||
          // 5. Any Indian English as fallback
          voices.find(
            (v) =>
              v.lang.startsWith("en-IN") ||
              v.name.toLowerCase().includes("india")
          ) ||
          // 6. Any English
          voices.find((v) => v.lang.startsWith("en")) ||
          null

        if (preferredVoice) {
          utterance.voice = preferredVoice
        } else if (options.voice) {
          utterance.voice = options.voice
        }

        // Set up event handlers
        utterance.onstart = () => {
          setSpeaking(true)
        }

        utterance.onend = () => {
          setSpeaking(false)
          currentUtteranceRef.current = null
          interruptedTextRef.current = ""
          resolve()
        }

        utterance.onerror = (error) => {
          setSpeaking(false)
          currentUtteranceRef.current = null
          interruptedTextRef.current = ""
          reject(error)
        }

        // Start speaking
        synthRef.current?.speak(utterance)
      }

      getVoices()
    })
  }

  const stop = () => {
    if (synthRef.current) {
      // Store interrupted text for potential resume BEFORE canceling
      if (currentUtteranceRef.current && currentUtteranceRef.current.text) {
        interruptedTextRef.current = currentUtteranceRef.current.text
        console.log("Storing interrupted speech text:", interruptedTextRef.current)
      }

      // Stop immediately - cancel() stops audio output synchronously
      // Also try pause() first for faster stop in some browsers
      try {
        synthRef.current.pause()
      } catch (e) {
        // Ignore pause errors
      }
      synthRef.current.cancel()

      // Clear state immediately
      currentUtteranceRef.current = null
      setSpeaking(false)
    }
  }

  const resume = (text?: string) => {
    const textToSpeak = text || interruptedTextRef.current
    if (textToSpeak && synthRef.current && supported) {
      console.log("Resuming speech with text:", textToSpeak)
      speak(textToSpeak).catch((error) => {
        console.error("Error resuming speech:", error)
      })
    }
  }

  const pause = () => {
    if (synthRef.current && speaking) {
      synthRef.current.pause()
    }
  }

  const resumePaused = () => {
    if (synthRef.current && speaking) {
      synthRef.current.resume()
    }
  }

  return {
    speak,
    stop,
    pause,
    resume,
    resumePaused,
    speaking,
    supported,
  }
}

