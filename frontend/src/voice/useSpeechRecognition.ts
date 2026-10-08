// import { useRef, useState } from "react"
// import { getNoiseReducedAudioConstraints, filterNoiseResults, cleanTranscript } from "./noiseReduction"

// declare global {
//   interface Window {
//     SpeechRecognition: any
//     webkitSpeechRecognition: any
//   }
// }

// interface SpeechRecognitionOptions {
//   onInterimResult?: (text: string) => void
//   onFinalResult?: (text: string, confidence?: number) => void
//   autoSend?: boolean
//   continuous?: boolean // Enable continuous listening mode
//   onSpeechStart?: () => void // Callback when user starts speaking (for barge-in)
// }

// export function useSpeechRecognition(
//   onFinalTranscript?: (text: string) => void,
//   options?: SpeechRecognitionOptions
// ) {
//   const recognitionRef = useRef<any>(null)
//   const transcriptRef = useRef<string>("")
//   const interimTranscriptRef = useRef<string>("")
//   const isManuallyStoppedRef = useRef<boolean>(false)
//   const shouldProcessResultRef = useRef<boolean>(false)
//   const isContinuousModeRef = useRef<boolean>(false)
//   const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
//   const mediaStreamRef = useRef<MediaStream | null>(null)
//   const audioContextRef = useRef<AudioContext | null>(null)
//   const analyserRef = useRef<AnalyserNode | null>(null)
//   const audioLevelCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
//   const [listening, setListening] = useState(false)
//   const [transcript, setTranscript] = useState("")
//   const supported =
//     typeof window !== "undefined" &&
//     ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

//   const requestMicrophonePermission = async () => {
//     try {
//       if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//         // Request microphone with noise suppression and echo cancellation
//         const constraints: MediaStreamConstraints = {
//           audio: getNoiseReducedAudioConstraints(),
//         }
        
//         const stream = await navigator.mediaDevices.getUserMedia(constraints)
//         console.log("Microphone permission granted with noise reduction enabled")
        
//         // Store stream reference for cleanup
//         return stream
//       }
//     } catch (error) {
//       console.error("Microphone permission denied:", error)
//       alert("Microphone permission is required for voice recognition. Please allow microphone access and try again.")
//       throw error
//     }
//   }

//   const start = async () => {
//     if (!supported || listening) {
//       console.log("Speech recognition not supported or already listening", { supported, listening })
//       return
//     }

//     try {
//       // Request microphone permission first with noise reduction
//       const stream = await requestMicrophonePermission()
//       if (stream) {
//         mediaStreamRef.current = stream
        
//         // Set up immediate audio level detection for faster barge-in
//         try {
//           const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
//           const analyser = audioContext.createAnalyser()
//           const microphone = audioContext.createMediaStreamSource(stream)
          
//           analyser.fftSize = 256
//           analyser.smoothingTimeConstant = 0.3
//           microphone.connect(analyser)
          
//           audioContextRef.current = audioContext
//           analyserRef.current = analyser
          
//           // Monitor audio levels to detect speech immediately
//           // Use time domain data for better speech detection (amplitude/volume)
//           const bufferLength = analyser.fftSize
//           const dataArray = new Uint8Array(bufferLength)
//           let lastTriggerTime = 0
//           const MIN_TRIGGER_INTERVAL = 200 // Don't trigger more than once per 200ms
//           let baselineLevel = 0
//           let sampleCount = 0
//           const BASELINE_SAMPLES = 10 // Calculate baseline over first 10 samples
          
//           audioLevelCheckIntervalRef.current = setInterval(() => {
//             if (!analyserRef.current || !options?.onSpeechStart) return
            
//             // Get time domain data (amplitude) instead of frequency data
//             analyser.getByteTimeDomainData(dataArray)
            
//             // Calculate RMS (Root Mean Square) for better speech detection
//             let sum = 0
//             for (let i = 0; i < dataArray.length; i++) {
//               const normalized = (dataArray[i] - 128) / 128
//               sum += normalized * normalized
//             }
//             const rms = Math.sqrt(sum / dataArray.length)
//             const level = rms * 100 // Convert to 0-100 scale
            
//             // Calculate baseline noise level
//             if (sampleCount < BASELINE_SAMPLES) {
//               baselineLevel += level
//               sampleCount++
//               if (sampleCount === BASELINE_SAMPLES) {
//                 baselineLevel = baselineLevel / BASELINE_SAMPLES
//                 console.log("Audio baseline level calculated:", baselineLevel)
//               }
//               return
//             }
            
//             // Adaptive threshold: baseline * multiplier
//             // Lower multiplier (2.5x) for better detection sensitivity - catches quieter speech
//             const ADAPTIVE_THRESHOLD = baselineLevel > 0 ? baselineLevel * 2.5 : 3
//             const now = Date.now()
            
//             // Trigger barge-in when audio level exceeds adaptive threshold
//             if (level > ADAPTIVE_THRESHOLD && (now - lastTriggerTime) > MIN_TRIGGER_INTERVAL) {
//               console.log("Immediate audio detection - triggering barge-in, level:", level.toFixed(2), "threshold:", ADAPTIVE_THRESHOLD.toFixed(2), "baseline:", baselineLevel.toFixed(2))
//               lastTriggerTime = now
//               options.onSpeechStart()
//             }
//           }, 30) // Check every 30ms for faster response
          
//           console.log("Audio level monitoring started for immediate barge-in")
//         } catch (error) {
//           console.warn("Could not set up audio level detection:", error)
//           // Continue without audio level detection - will rely on onspeechstart
//         }
//       }

//       const SpeechRecognition =
//         window.SpeechRecognition || window.webkitSpeechRecognition

//       if (!SpeechRecognition) {
//         console.error("SpeechRecognition API not available")
//         return
//       }

//       const recognition = new SpeechRecognition()
//       recognition.lang = "en-IN"
//       recognition.interimResults = true
//       recognition.continuous = options?.continuous ?? false  // Enable continuous mode if specified
//       recognition.maxAlternatives = 1
      
//       // Filter out low-confidence results (likely noise)
//       // Note: This is a workaround since confidence isn't always available
//       recognition.serviceURI = "" // Use default service

//       // Reset transcript accumulator
//       transcriptRef.current = ""
//       interimTranscriptRef.current = ""
//       isManuallyStoppedRef.current = false
//       isContinuousModeRef.current = options?.continuous ?? false

//       recognition.onstart = () => {
//         console.log("Speech recognition started")
//         setListening(true)
//         setTranscript("")
//         transcriptRef.current = ""
//         interimTranscriptRef.current = ""
//         isManuallyStoppedRef.current = false
//         shouldProcessResultRef.current = true
//       }

//       // Detect when user starts speaking (for barge-in feature)
//       recognition.onspeechstart = () => {
//         console.log("Speech recognition detected user started speaking - triggering barge-in")
//         if (options?.onSpeechStart) {
//           options.onSpeechStart()
//         }
//       }
      
//       // Also detect when audio starts (even before speech is recognized)
//       recognition.onaudiostart = () => {
//         console.log("Audio input detected - user may be speaking")
//         // This fires when audio input starts, even before speech is recognized
//         // Can be used as early detection, but we'll rely on audio level monitoring for immediate response
//       }

//       recognition.onresult = (event: any) => {
//         let interimTranscript = ""
//         let finalTranscript = transcriptRef.current

//         console.log("onresult fired, processing", event.results.length, "results")

//         // Detect when user starts speaking (first result)
//         // This helps with barge-in even if onspeechstart doesn't fire reliably
//         // Trigger on ANY first result to catch all speech, even short utterances
//         if (event.resultIndex === 0 && event.results.length > 0 && options?.onSpeechStart) {
//           const firstResult = event.results[0]
//           const firstTranscript = firstResult[0].transcript.trim()
//           // Trigger barge-in on any first result (even single characters) to ensure we catch speech
//           if (firstTranscript.length >= 1) {
//             console.log("User speech detected in onresult - triggering barge-in, transcript:", firstTranscript)
//             options.onSpeechStart()
//           }
//         }

//         // Process all results since last event
//         for (let i = event.resultIndex; i < event.results.length; i++) {
//           const result = event.results[i]
//           let transcript = result[0].transcript
//           const confidence = result[0].confidence

//           console.log("Result", i, "- isFinal:", result.isFinal, "text:", transcript, "confidence:", confidence)

//           // Clean and filter out noise
//           transcript = cleanTranscript(transcript)
          
//           // Filter out low-confidence results (likely noise or false positives)
//           if (!filterNoiseResults(transcript, confidence)) {
//             console.log("Filtering out noise result:", transcript, "confidence:", confidence)
//             continue
//           }

//           if (result.isFinal) {
//             // For final results, be more lenient but still filter obvious noise
//             if (transcript.trim().length >= 1) {
//               finalTranscript += transcript + " "
//               transcriptRef.current = finalTranscript
//               console.log("Updated transcriptRef to:", transcriptRef.current)
//             }
            
//             // In continuous mode, when we get a final result, it means speech ended
//             // Send the transcript immediately if we're in continuous mode
//             if (isContinuousModeRef.current && finalTranscript.trim() && !isManuallyStoppedRef.current) {
//               const finalText = cleanTranscript(finalTranscript.trim())
//               // Only send if transcript has meaningful content (more than just noise)
//               if (finalText.length >= 2 && filterNoiseResults(finalText)) {
//                 console.log("Speech ended naturally, sending transcript:", finalText)
                
//                 // Call final result callback if provided
//                 if (options?.onFinalResult) {
//                   // Get average confidence from final results
//                   let avgConfidence: number | undefined = undefined
//                   let confidenceSum = 0
//                   let confidenceCount = 0
//                   for (let i = event.resultIndex; i < event.results.length; i++) {
//                     const result = event.results[i]
//                     if (result.isFinal && result[0].confidence !== undefined) {
//                       confidenceSum += result[0].confidence
//                       confidenceCount++
//                     }
//                   }
//                   if (confidenceCount > 0) {
//                     avgConfidence = confidenceSum / confidenceCount
//                   }
//                   options.onFinalResult(finalText, avgConfidence)
//                 }
                
//                 // Auto-send if enabled
//                 if (options?.autoSend && onFinalTranscript) {
//                   onFinalTranscript(finalText)
//                 } else if (onFinalTranscript && !options) {
//                   onFinalTranscript(finalText)
//                 }
                
//                 // Reset transcript for next utterance
//                 transcriptRef.current = ""
//                 interimTranscriptRef.current = ""
//               } else {
//                 console.log("Filtered out noise-only transcript:", finalText)
//                 transcriptRef.current = ""
//                 interimTranscriptRef.current = ""
//               }
//             }
//           } else {
//             // For interim results, only include if they're substantial enough
//             if (transcript.trim().length >= 2) {
//               interimTranscript += transcript
//             }
//           }
//         }

//         // Combine final and interim transcripts
//         const fullTranscript = (finalTranscript + interimTranscript).trim()
        
//         // Store the latest interim transcript for use when manually stopping
//         interimTranscriptRef.current = fullTranscript
        
//         console.log("Full transcript:", fullTranscript)
        
//         if (fullTranscript) {
//           setTranscript(fullTranscript)

//           // Call interim callback if provided
//           if (options?.onInterimResult) {
//             options.onInterimResult(fullTranscript)
//           }
//         }
//       }

//       // Handle speech end event (fires when user stops speaking)
//       recognition.onspeechend = () => {
//         console.log("Speech ended event fired")
//         // In continuous mode, the onresult handler with final results will handle sending
//         // This event is just for logging/debugging
//       }

//       recognition.onend = () => {
//         console.log("Speech recognition ended", {
//           manuallyStopped: isManuallyStoppedRef.current,
//           continuousMode: isContinuousModeRef.current,
//           finalTranscript: transcriptRef.current,
//           interimTranscript: interimTranscriptRef.current
//         })
        
//         // Clear any pending restart timeout
//         if (restartTimeoutRef.current) {
//           clearTimeout(restartTimeoutRef.current)
//           restartTimeoutRef.current = null
//         }
        
//         // If manually stopped, process final result and stop completely
//         if (isManuallyStoppedRef.current) {
//           setListening(false)
//           shouldProcessResultRef.current = false
//           isContinuousModeRef.current = false
          
//           // Use final transcript if available, otherwise use the last interim transcript
//           let finalText = (transcriptRef.current || interimTranscriptRef.current).trim()
//           finalText = cleanTranscript(finalText)
          
//           if (finalText && filterNoiseResults(finalText)) {
//             console.log("Processing final text (manually stopped):", finalText)
//             setTranscript(finalText)
            
//             // Call final result callback if provided
//             if (options?.onFinalResult) {
//               // Confidence may not be available when manually stopped
//               // Pass undefined and let the callback handle it
//               options.onFinalResult(finalText, undefined)
//             }
            
//             // Auto-send if enabled
//             if (options?.autoSend && onFinalTranscript) {
//               onFinalTranscript(finalText)
//             } else if (onFinalTranscript && !options) {
//               onFinalTranscript(finalText)
//             }
//           } else {
//             console.log("Manually stopped but no text captured")
//             setTranscript("")
//           }
          
//           // Reset transcript refs for next session
//           transcriptRef.current = ""
//           interimTranscriptRef.current = ""
//           return
//         }
        
//         // If in continuous mode and not manually stopped, restart recognition
//         // Note: With continuous=true, onend might fire due to pauses or errors
//         // We need to restart to keep listening
//         if (isContinuousModeRef.current && !isManuallyStoppedRef.current) {
//           console.log("Restarting recognition for continuous listening")
          
//           // Small delay before restart to ensure clean state
//           restartTimeoutRef.current = setTimeout(() => {
//             if (isContinuousModeRef.current && !isManuallyStoppedRef.current && recognitionRef.current) {
//               try {
//                 recognitionRef.current.start()
//                 console.log("Recognition restarted successfully")
//               } catch (e: any) {
//                 if (e.name === "InvalidStateError") {
//                   // Already started, that's fine - recognition is still active
//                   console.log("Recognition already active")
//                 } else {
//                   console.error("Could not restart recognition:", e)
//                   // If restart fails, stop listening
//                   setListening(false)
//                   isContinuousModeRef.current = false
//                 }
//               }
//             }
//           }, 300) // Slightly longer delay for better reliability
//         } else if (!isContinuousModeRef.current) {
//           // Not in continuous mode, stop listening
//           setListening(false)
//           shouldProcessResultRef.current = false
//         }
//       }

//       recognition.onerror = (event: any) => {
//         console.error("Speech recognition error:", event.error, event)
        
//         // Handle different error types
//         if (event.error === "no-speech") {
//           // No speech detected - this is normal, don't stop
//           // This helps filter out background noise
//           console.log("No speech detected yet, continuing...")
//           return
//         }
        
//         if (event.error === "aborted" || event.error === "network") {
//           // These are usually recoverable or expected
//           console.log("Recognition aborted or network issue:", event.error)
//           return
//         }
        
//         // For other errors, stop listening
//         setListening(false)
//         setTranscript("")
//         transcriptRef.current = ""
        
//       // Clean up media stream and audio context on error
//       if (audioLevelCheckIntervalRef.current) {
//         clearInterval(audioLevelCheckIntervalRef.current)
//         audioLevelCheckIntervalRef.current = null
//       }
//       if (audioContextRef.current) {
//         audioContextRef.current.close().catch(() => {})
//         audioContextRef.current = null
//       }
//       analyserRef.current = null
      
//       if (mediaStreamRef.current) {
//         mediaStreamRef.current.getTracks().forEach(track => {
//           track.stop()
//         })
//         mediaStreamRef.current = null
//       }
        
//         if (event.error !== "no-speech") {
//           console.error(`Speech recognition error: ${event.error}`)
//         }
//       }

//       recognition.onnomatch = () => {
//         console.log("No speech match found - continuing to listen")
//       }

//       recognition.start()
//       recognitionRef.current = recognition
//     } catch (error) {
//       console.error("Error starting speech recognition:", error)
//       setListening(false)
//     }
//   }

//   const stop = () => {
//     if (recognitionRef.current && listening) {
//       console.log("Stopping speech recognition manually")
//       // Clear any pending restart timeout
//       if (restartTimeoutRef.current) {
//         clearTimeout(restartTimeoutRef.current)
//         restartTimeoutRef.current = null
//       }
//       // Mark as manually stopped so onend knows to process final result and stop
//       isManuallyStoppedRef.current = true
//       shouldProcessResultRef.current = true
//       isContinuousModeRef.current = false
//       // Immediately update UI state to show recording has stopped
//       setListening(false)
//       try {
//         recognitionRef.current.stop()
//       } catch (e: any) {
//         console.log("Error stopping recognition:", e)
//       }
      
//       // Clean up media stream and audio context
//       if (audioLevelCheckIntervalRef.current) {
//         clearInterval(audioLevelCheckIntervalRef.current)
//         audioLevelCheckIntervalRef.current = null
//       }
//       if (audioContextRef.current) {
//         audioContextRef.current.close().catch(() => {})
//         audioContextRef.current = null
//       }
//       analyserRef.current = null
      
//       if (mediaStreamRef.current) {
//         mediaStreamRef.current.getTracks().forEach(track => {
//           track.stop()
//         })
//         mediaStreamRef.current = null
//       }
//     }
//   }

//   return { start, stop, listening, supported, transcript }
// }


import { useRef, useState } from "react"
import { getNoiseReducedAudioConstraints, filterNoiseResults, cleanTranscript } from "./noiseReduction"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface SpeechRecognitionOptions {
  onInterimResult?: (text: string) => void
  onFinalResult?: (text: string, confidence?: number) => void
  onManualStopComplete?: () => void
  autoSend?: boolean
  continuous?: boolean
  onSpeechStart?: () => void
}

export function useSpeechRecognition(
  onFinalTranscript?: (text: string) => void,
  options?: SpeechRecognitionOptions
) {
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef<string>("")
  const interimTranscriptRef = useRef<string>("")
  const isManuallyStoppedRef = useRef<boolean>(false)
  const shouldProcessResultRef = useRef<boolean>(false)
  const isContinuousModeRef = useRef<boolean>(false)
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioLevelCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  const cleanupAudioResources = () => {
    if (audioLevelCheckIntervalRef.current) {
      clearInterval(audioLevelCheckIntervalRef.current)
      audioLevelCheckIntervalRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }

    analyserRef.current = null

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      mediaStreamRef.current = null
    }
  }

  const requestMicrophonePermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          audio: getNoiseReducedAudioConstraints(),
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        console.log("Microphone permission granted with noise reduction enabled")
        return stream
      }
    } catch (error) {
      console.error("Microphone permission denied:", error)
      alert("Microphone permission is required for voice recognition. Please allow microphone access and try again.")
      throw error
    }
  }

  const start = async () => {
    if (!supported || listening) {
      console.log("Speech recognition not supported or already listening", { supported, listening })
      return
    }

    try {
      const stream = await requestMicrophonePermission()
      if (stream) {
        mediaStreamRef.current = stream

        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const analyser = audioContext.createAnalyser()
          const microphone = audioContext.createMediaStreamSource(stream)

          analyser.fftSize = 256
          analyser.smoothingTimeConstant = 0.3
          microphone.connect(analyser)

          audioContextRef.current = audioContext
          analyserRef.current = analyser

          const bufferLength = analyser.fftSize
          const dataArray = new Uint8Array(bufferLength)
          let lastTriggerTime = 0
          const MIN_TRIGGER_INTERVAL = 200
          let baselineLevel = 0
          let sampleCount = 0
          const BASELINE_SAMPLES = 10

          audioLevelCheckIntervalRef.current = setInterval(() => {
            if (!analyserRef.current || !options?.onSpeechStart) return

            analyser.getByteTimeDomainData(dataArray)

            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
              const normalized = (dataArray[i] - 128) / 128
              sum += normalized * normalized
            }

            const rms = Math.sqrt(sum / dataArray.length)
            const level = rms * 100

            if (sampleCount < BASELINE_SAMPLES) {
              baselineLevel += level
              sampleCount++
              if (sampleCount === BASELINE_SAMPLES) {
                baselineLevel = baselineLevel / BASELINE_SAMPLES
                console.log("Audio baseline level calculated:", baselineLevel)
              }
              return
            }

            const adaptiveThreshold = baselineLevel > 0 ? baselineLevel * 2.5 : 3
            const now = Date.now()

            if (level > adaptiveThreshold && now - lastTriggerTime > MIN_TRIGGER_INTERVAL) {
              console.log(
                "Immediate audio detection - triggering barge-in, level:",
                level.toFixed(2),
                "threshold:",
                adaptiveThreshold.toFixed(2),
                "baseline:",
                baselineLevel.toFixed(2)
              )
              lastTriggerTime = now
              options.onSpeechStart()
            }
          }, 30)

          console.log("Audio level monitoring started for immediate barge-in")
        } catch (error) {
          console.warn("Could not set up audio level detection:", error)
        }
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        console.error("SpeechRecognition API not available")
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = "en-IN"
      recognition.interimResults = true
      recognition.continuous = options?.continuous ?? false
      recognition.maxAlternatives = 1
      recognition.serviceURI = ""

      transcriptRef.current = ""
      interimTranscriptRef.current = ""
      isManuallyStoppedRef.current = false
      isContinuousModeRef.current = options?.continuous ?? false

      recognition.onstart = () => {
        console.log("Speech recognition started")
        setListening(true)
        setTranscript("")
        transcriptRef.current = ""
        interimTranscriptRef.current = ""
        isManuallyStoppedRef.current = false
        shouldProcessResultRef.current = true
      }

      recognition.onspeechstart = () => {
        console.log("Speech recognition detected user started speaking - triggering barge-in")
        options?.onSpeechStart?.()
      }

      recognition.onaudiostart = () => {
        console.log("Audio input detected - user may be speaking")
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = transcriptRef.current

        console.log("onresult fired, processing", event.results.length, "results")

        if (event.resultIndex === 0 && event.results.length > 0 && options?.onSpeechStart) {
          const firstResult = event.results[0]
          const firstTranscript = firstResult[0].transcript.trim()
          if (firstTranscript.length >= 1) {
            console.log("User speech detected in onresult - triggering barge-in, transcript:", firstTranscript)
            options.onSpeechStart()
          }
        }

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          let transcript = result[0].transcript
          const confidence = result[0].confidence

          console.log("Result", i, "- isFinal:", result.isFinal, "text:", transcript, "confidence:", confidence)

          transcript = cleanTranscript(transcript)

          if (!filterNoiseResults(transcript, confidence)) {
            console.log("Filtering out noise result:", transcript, "confidence:", confidence)
            continue
          }

          if (result.isFinal) {
            if (transcript.trim().length >= 1) {
              finalTranscript += transcript + " "
              transcriptRef.current = finalTranscript
              console.log("Updated transcriptRef to:", transcriptRef.current)
            }

            if (isContinuousModeRef.current && finalTranscript.trim() && !isManuallyStoppedRef.current) {
              const finalText = cleanTranscript(finalTranscript.trim())
              if (finalText.length >= 2 && filterNoiseResults(finalText)) {
                console.log("Speech ended naturally, sending transcript:", finalText)

                if (options?.onFinalResult) {
                  let avgConfidence: number | undefined
                  let confidenceSum = 0
                  let confidenceCount = 0

                  for (let j = event.resultIndex; j < event.results.length; j++) {
                    const finalResult = event.results[j]
                    if (finalResult.isFinal && finalResult[0].confidence !== undefined) {
                      confidenceSum += finalResult[0].confidence
                      confidenceCount++
                    }
                  }

                  if (confidenceCount > 0) {
                    avgConfidence = confidenceSum / confidenceCount
                  }

                  options.onFinalResult(finalText, avgConfidence)
                }

                if (options?.autoSend && onFinalTranscript) {
                  onFinalTranscript(finalText)
                } else if (onFinalTranscript && !options) {
                  onFinalTranscript(finalText)
                }

                transcriptRef.current = ""
                interimTranscriptRef.current = ""
                finalTranscript = ""        // <-- ADD THIS: reset the local var too
                interimTranscript = ""      // <-- ADD THIS: prevent stale refull again
              } else {
                console.log("Filtered out noise-only transcript:", finalText)
                transcriptRef.current = ""
                interimTranscriptRef.current = ""
              }
            }
          } else {
            if (transcript.trim().length >= 2) {
              interimTranscript += transcript
            }
          }
        }

        const fullTranscript = (finalTranscript + interimTranscript).trim()
        interimTranscriptRef.current = fullTranscript

        console.log("Full transcript:", fullTranscript)

        if (fullTranscript) {
          setTranscript(fullTranscript)
          options?.onInterimResult?.(fullTranscript)
        }
      }

      recognition.onspeechend = () => {
        console.log("Speech ended event fired")
      }

      recognition.onend = () => {
        console.log("Speech recognition ended", {
          manuallyStopped: isManuallyStoppedRef.current,
          continuousMode: isContinuousModeRef.current,
          finalTranscript: transcriptRef.current,
          interimTranscript: interimTranscriptRef.current,
        })

        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current)
          restartTimeoutRef.current = null
        }

        if (isManuallyStoppedRef.current) {
          setListening(false)
          shouldProcessResultRef.current = false
          isContinuousModeRef.current = false

          let finalText = (transcriptRef.current || interimTranscriptRef.current).trim()
          finalText = cleanTranscript(finalText)

          if (finalText && filterNoiseResults(finalText)) {
            console.log("Processing final text (manually stopped):", finalText)
            setTranscript(finalText)

            if (options?.onFinalResult) {
              options.onFinalResult(finalText, undefined)
            }

            if (options?.autoSend && onFinalTranscript) {
              onFinalTranscript(finalText)
            } else if (onFinalTranscript && !options) {
              onFinalTranscript(finalText)
            }
          } else {
            console.log("Manually stopped but no text captured")
            setTranscript("")
          }

          transcriptRef.current = ""
          interimTranscriptRef.current = ""

          options?.onManualStopComplete?.()
          cleanupAudioResources()
          return
        }

        if (isContinuousModeRef.current && !isManuallyStoppedRef.current) {
          console.log("Restarting recognition for continuous listening")

          cleanupAudioResources()

          restartTimeoutRef.current = setTimeout(() => {
            if (isContinuousModeRef.current && !isManuallyStoppedRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start()
                console.log("Recognition restarted successfully")
              } catch (e: any) {
                if (e.name === "InvalidStateError") {
                  console.log("Recognition already active")
                } else {
                  console.error("Could not restart recognition:", e)
                  setListening(false)
                  isContinuousModeRef.current = false
                }
              }
            }
          }, 300)
        } else if (!isContinuousModeRef.current) {
          setListening(false)
          shouldProcessResultRef.current = false
          cleanupAudioResources()
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error, event)

        if (event.error === "no-speech") {
          console.log("No speech detected yet, continuing...")
          return
        }

        if (event.error === "aborted" || event.error === "network") {
          console.log("Recognition aborted or network issue:", event.error)
          return
        }

        setListening(false)
        setTranscript("")
        transcriptRef.current = ""
        cleanupAudioResources()

        if (event.error !== "no-speech") {
          console.error(`Speech recognition error: ${event.error}`)
        }
      }

      recognition.onnomatch = () => {
        console.log("No speech match found - continuing to listen")
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (error) {
      console.error("Error starting speech recognition:", error)
      setListening(false)
      cleanupAudioResources()
    }
  }

  const stop = () => {
    if (recognitionRef.current && listening) {
      console.log("Stopping speech recognition manually")

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }

      isManuallyStoppedRef.current = true
      shouldProcessResultRef.current = true
      isContinuousModeRef.current = false
      setListening(false)

      try {
        recognitionRef.current.stop()
      } catch (e: any) {
        console.log("Error stopping recognition:", e)
      }
    }
  }

  return { start, stop, listening, supported, transcript }
}

