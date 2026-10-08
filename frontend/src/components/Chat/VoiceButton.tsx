import { Mic, MicOff } from "lucide-react"
import clsx from "clsx"

interface VoiceButtonProps {
  listening: boolean
  supported: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export function VoiceButton({ listening, supported, onStart, onStop, disabled = false }: VoiceButtonProps) {
  if (!supported) return null

  const handleClick = () => {
    if (disabled) return
    
    if (listening) {
      // Second click: stop listening
      onStop()
    } else {
      // First click: start listening
      onStart()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        listening
          ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 focus:ring-red-500 scale-110"
          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500"
      )}
      title={listening ? "Click again to stop recording" : "Click to start speaking"}
    >
      {listening ? (
        <div className="relative">
          <MicOff className="w-5 h-5" />
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 -m-2 rounded-full border-2 border-red-300 animate-ping" />
        </div>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  )
}
