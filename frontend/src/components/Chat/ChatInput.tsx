// import { useState, useRef, useEffect } from "react"
// import { VoiceButton } from "./VoiceButton"
// import { useSpeechRecognition } from "../../voice/useSpeechRecognition"
// import { useBargeIn } from "../../voice/BargeInContext"
// import { Send, Mic } from "lucide-react"
// import clsx from "clsx"

// interface ChatInputProps {
//   onSend: (msg: string, isVoiceInput?: boolean) => void
//   disabled?: boolean
// }

// export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
//   const [value, setValue] = useState("")
//   const [isVoiceMode, setIsVoiceMode] = useState(false)
//   const isVoiceModeRef = useRef(false)
//   const onSendRef = useRef(onSend)

//   useEffect(() => {
//     isVoiceModeRef.current = isVoiceMode
//   }, [isVoiceMode])

//   useEffect(() => {
//     onSendRef.current = onSend
//   }, [onSend])

//   const { triggerBargeIn, isBotSpeaking } = useBargeIn()

//   // Keep isBotSpeaking in a ref so speech recognition callbacks always see latest value
//   const isBotSpeakingRef = useRef(false)
//   useEffect(() => {
//     isBotSpeakingRef.current = isBotSpeaking
//   }, [isBotSpeaking])

//   const wasBargeInRef = useRef<boolean>(false)

//   const { start, stop, listening, supported } = useSpeechRecognition(
//     undefined,
//     {
//       onInterimResult: (text) => {
//         console.log("Interim result:", text)
//       },
//       onFinalResult: (text, _confidence) => {
//         console.log(
//           "Final result:", text,
//           "isVoiceMode:", isVoiceModeRef.current,
//           "wasBargeIn:", wasBargeInRef.current,
//           "isBotSpeaking:", isBotSpeakingRef.current
//         )

//         // 🚫 GUARD: Ignore anything captured while the bot was speaking.
//         // This prevents the mic from picking up the bot's own audio output
//         // and feeding it back as a user message (echo loop).
//         if (isBotSpeakingRef.current) {
//           console.log("⚠️ Ignoring speech captured during bot playback (echo suppression)")
//           wasBargeInRef.current = false
//           return
//         }

//         // Send speech to backend
//         if (isVoiceModeRef.current && text.trim()) {
//           console.log("Sending voice message to chat:", text.trim())
//           onSendRef.current(text.trim(), true)
//         }

//         // Reset voice mode AFTER sending — only when mic has fully stopped
//         if (!listening) {
//           setIsVoiceMode(false)
//           isVoiceModeRef.current = false
//         }

//         if (wasBargeInRef.current) {
//           wasBargeInRef.current = false
//         }
//       },
//       onSpeechStart: () => {
//         // 🚫 If bot is speaking, this is echo — do NOT trigger barge-in
//         if (isBotSpeakingRef.current) {
//           console.log("⚠️ Speech detected but bot is playing — ignoring echo")
//           return
//         }

//         if (!wasBargeInRef.current) {
//           console.log("User speech detected - triggering barge-in immediately")
//           wasBargeInRef.current = true
//           triggerBargeIn()
//         }
//       },
//       autoSend: false,
//       continuous: true,
//     }
//   )

//   // ── Pause/resume mic around bot speech ──────────────────────────────────
//   // When isBotSpeaking flips true  → stop mic (prevents echo capture)
//   // When isBotSpeaking flips false → restart mic if we're still in voice mode
//   useEffect(() => {
//     if (!supported) return

//     if (isBotSpeaking) {
//       if (listening) {
//         console.log("🔇 Bot speaking — pausing mic")
//         stop()
//       }
//     } else {
//       // Bot finished — restart mic only if user is in voice mode
//       if (isVoiceModeRef.current && !listening) {
//         console.log("🎤 Bot done — resuming mic")
//         start()
//       }
//     }
//   }, [isBotSpeaking]) // intentionally only isBotSpeaking as dep

//   const handleVoiceStart = () => {
//     console.log("Voice start - setting voice mode")
//     setIsVoiceMode(true)
//     isVoiceModeRef.current = true
//     start()
//   }

//   const handleVoiceStop = () => {
//     console.log("Voice stop called - manually stopping mic")
//     stop()
//     // NOTE: Do NOT reset isVoiceMode here — onFinalResult fires asynchronously
//     // after stop() and needs isVoiceMode=true to send the last utterance.
//     // isVoiceMode is reset inside onFinalResult.
//   }

//   const send = () => {
//     if (!value.trim() || disabled) return
//     onSend(value, false)
//     setValue("")
//   }

//   const isDisabled = disabled || listening

//   return (
//     <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
//       <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
//         <div className="flex gap-2 sm:gap-3 items-end">
//           {/* Input Field */}
//           <div className="flex-1 relative">
//             <input
//               type="text"
//               className={clsx(
//                 "w-full px-4 py-3 pr-12 rounded-2xl border-2 transition-all duration-200",
//                 "bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white",
//                 "border-gray-200 dark:border-gray-600",
//                 "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
//                 "placeholder:text-gray-400 dark:placeholder:text-gray-500",
//                 listening && "border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900",
//                 disabled && "opacity-50 cursor-not-allowed"
//               )}
//               value={value}
//               onChange={(e) => setValue(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" && !e.shiftKey) {
//                   e.preventDefault()
//                   send()
//                 }
//               }}
//               placeholder={
//                 disabled
//                   ? "Connecting to server..."
//                   : isBotSpeaking
//                   ? "🔊 Bot is speaking..."
//                   : listening
//                   ? "🎤 Listening..."
//                   : "Ask about facilities, meeting rooms or use voice..."
//               }
//               disabled={isDisabled}
//             />
//             {listening && !isBotSpeaking && (
//               <div className="absolute right-4 top-1/2 -translate-y-1/2">
//                 <div className="flex items-center gap-1.5">
//                   <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
//                   <span className="text-xs text-red-500 font-medium">Recording</span>
//                 </div>
//               </div>
//             )}
//             {isBotSpeaking && (
//               <div className="absolute right-4 top-1/2 -translate-y-1/2">
//                 <div className="flex items-center gap-1.5">
//                   <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
//                   <span className="text-xs text-blue-500 font-medium">Speaking</span>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Voice Button */}
//           {supported && (
//             <VoiceButton
//               listening={listening}
//               supported={supported}
//               onStart={handleVoiceStart}
//               onStop={handleVoiceStop}
//               disabled={disabled}
//             />
//           )}

//           {/* Send Button */}
//           <button
//             onClick={send}
//             disabled={!value.trim() || disabled}
//             className={clsx(
//               "flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-medium",
//               "transition-all duration-200 shadow-md",
//               "disabled:opacity-50 disabled:cursor-not-allowed",
//               value.trim() && !disabled
//                 ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg transform hover:scale-105"
//                 : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
//             )}
//             title="Send message (Enter)"
//           >
//             <Send className="w-4 h-4 sm:w-5 sm:h-5" />
//             <span className="hidden sm:inline">Send</span>
//           </button>
//         </div>

//         {/* Helper Text */}
//         <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
//           <span className="flex items-center gap-1">
//             {supported && !disabled && (
//               <>
//                 <Mic className="w-3 h-3" />
//                 <span>
//                   {isBotSpeaking
//                     ? "Mic paused while bot speaks"
//                     : listening
//                     ? "Mic enabled - Click to stop listening"
//                     : "Click mic to start voice chat"}
//                 </span>
//               </>
//             )}
//           </span>
//           <span>Press Enter to send</span>
//         </div>
//       </div>
//     </div>
//   )
// }

import { useState, useRef, useEffect } from "react"
import { VoiceButton } from "./VoiceButton"
import { useSpeechRecognition } from "../../voice/useSpeechRecognition"
import { useBargeIn } from "../../voice/BargeInContext"
import { Send, Mic } from "lucide-react"
import clsx from "clsx"

interface ChatInputProps {
  onSend: (msg: string, isVoiceInput?: boolean) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const isVoiceModeRef = useRef(false)
  const onSendRef = useRef(onSend)

  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode
  }, [isVoiceMode])

  useEffect(() => {
    onSendRef.current = onSend
  }, [onSend])

  const { triggerBargeIn, isBotSpeaking } = useBargeIn()

  const wasBargeInRef = useRef<boolean>(false)

  const { start, stop, listening, supported } = useSpeechRecognition(
    undefined,
    {
      onInterimResult: (text) => {
        console.log("Interim result:", text)
      },
      onFinalResult: (text, _confidence) => {
        console.log(
          "Final result:", text,
          "isVoiceMode:", isVoiceModeRef.current,
          "wasBargeIn:", wasBargeInRef.current,
          "isBotSpeaking:", isBotSpeaking
        )

        if (isVoiceModeRef.current && text.trim()) {
          console.log("Sending voice message to chat:", text.trim())
          onSendRef.current(text.trim(), true)
        }

        if (wasBargeInRef.current) {
          wasBargeInRef.current = false
        }
      },
      onManualStopComplete: () => {
        console.log("Manual mic stop completed - exiting voice mode")
        setIsVoiceMode(false)
        isVoiceModeRef.current = false
      },
      onSpeechStart: () => {
        if (!wasBargeInRef.current) {
          console.log("User speech detected - triggering barge-in immediately")
          wasBargeInRef.current = true
          triggerBargeIn()
        }
      },
      autoSend: false,
      continuous: true,
    }
  )

  const handleVoiceStart = () => {
    console.log("Voice start - setting voice mode")
    setIsVoiceMode(true)
    isVoiceModeRef.current = true
    start()
  }

  const handleVoiceStop = () => {
    console.log("Voice stop called - manually stopping mic")
    stop()
  }

  const send = () => {
    if (!value.trim() || disabled) return
    onSend(value, false)
    setValue("")
  }

  const isDisabled = disabled || listening

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
            <input
              type="text"
              className={clsx(
                "w-full px-4 py-3 pr-12 rounded-2xl border-2 transition-all duration-200",
                "bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white",
                "border-gray-200 dark:border-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                listening && "border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={
                disabled
                  ? "Connecting to server..."
                  : isBotSpeaking
                  ? "Bot is speaking..."
                  : listening
                  ? "Listening..."
                  : "Ask about accounts, card blocking, loans, insurance, or use voice..."
              }
              disabled={isDisabled}
            />
            {listening && !isBotSpeaking && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-500 font-medium">Recording</span>
                </div>
              </div>
            )}
            {isBotSpeaking && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-xs text-blue-500 font-medium">Speaking</span>
                </div>
              </div>
            )}
          </div>

          {supported && (
            <VoiceButton
              listening={listening}
              supported={supported}
              onStart={handleVoiceStart}
              onStop={handleVoiceStop}
              disabled={disabled}
            />
          )}

          <button
            onClick={send}
            disabled={!value.trim() || disabled}
            className={clsx(
              "flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-medium",
              "transition-all duration-200 shadow-md",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              value.trim() && !disabled
                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg transform hover:scale-105"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
            )}
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span className="flex items-center gap-1">
            {supported && !disabled && (
              <>
                <Mic className="w-3 h-3" />
                <span>
                  {isBotSpeaking
                    ? "Mic enabled while bot speaks"
                    : listening
                    ? "Mic enabled - Click to stop listening"
                    : "Click mic to start voice chat"}
                </span>
              </>
            )}
          </span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  )
}
