import { useRef, useState, useCallback } from "react"

interface TTSOptions {
  onPlayStart?: () => void   // called just before audio begins playing
  onPlayEnd?: () => void     // called when audio finishes (or is stopped)
}

export function useElevenLabsTTS(options: TTSOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const supported = true
  const currentAudioBufferRef = useRef<AudioBuffer | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)

  // Keep option callbacks in refs so they're always fresh without re-creating playAudio
  const onPlayStartRef = useRef(options.onPlayStart)
  const onPlayEndRef = useRef(options.onPlayEnd)
  onPlayStartRef.current = options.onPlayStart
  onPlayEndRef.current = options.onPlayEnd

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }

  const stop = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop()
      } catch (e) {
        // Ignore if already stopped
      }
      audioSourceRef.current = null
    }
    currentAudioBufferRef.current = null
    setSpeaking(false)
    startTimeRef.current = 0
    pauseTimeRef.current = 0

    // Notify that playback ended (covers barge-in stop case too)
    onPlayEndRef.current?.()
  }, [])

  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    console.log("Audio data received, decoding...")
    try {
      // Stop any currently playing audio first
      stop()

      const audioContext = getAudioContext()

      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      // Decode base64 → ArrayBuffer
      const binaryString = atob(base64Audio)
      console.log("Binary string length:", binaryString.length)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer)
      currentAudioBufferRef.current = audioBuffer

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)

      audioSourceRef.current = source
      setSpeaking(true)
      startTimeRef.current = audioContext.currentTime

      // Notify that playback is starting — mic should pause now
      onPlayStartRef.current?.()

      source.onended = () => {
        setSpeaking(false)
        audioSourceRef.current = null
        currentAudioBufferRef.current = null
        // Notify that playback finished naturally — mic can resume
        onPlayEndRef.current?.()
      }

      source.start(0)

    } catch (error) {
      console.error("Error playing audio:", error)
      setSpeaking(false)
      onPlayEndRef.current?.() // always fire end callback even on error
      throw error
    }
  }, [stop])

  const pause = useCallback(() => {
    if (audioSourceRef.current && audioContextRef.current) {
      audioContextRef.current.suspend()
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current
    }
  }, [])

  const resume = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume()
    }
  }, [])

  return {
    playAudio,
    stop,
    pause,
    resume,
    speaking,
    supported,
  }
}