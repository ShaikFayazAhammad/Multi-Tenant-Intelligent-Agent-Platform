import { useTransport } from "../../transport/TransportContext"
import { ConnectionState } from "../../transport/createTransport"
import { Wifi, WifiOff, Loader2, AlertCircle } from "lucide-react"
import clsx from "clsx"

const statusConfig: Record<ConnectionState, {
  icon: typeof Wifi
  label: string
  className: string
  animate?: boolean
}> = {
  connected: {
    icon: Wifi,
    label: "Connected",
    className: "text-green-500 dark:text-green-400",
  },
  connecting: {
    icon: Loader2,
    label: "Connecting...",
    className: "text-yellow-500 dark:text-yellow-400",
    animate: true,
  },
  disconnected: {
    icon: WifiOff,
    label: "Disconnected",
    className: "text-gray-400 dark:text-gray-500",
  },
  error: {
    icon: AlertCircle,
    label: "Connection Error",
    className: "text-red-500 dark:text-red-400",
  },
}

interface ConnectionStatusProps {
  showLabel?: boolean
  className?: string
}

export function ConnectionStatus({ showLabel = true, className }: ConnectionStatusProps) {
  const { connectionState } = useTransport()
  const config = statusConfig[connectionState]
  const Icon = config.icon

  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 text-xs font-medium",
        config.className,
        className
      )}
      title={config.label}
    >
      <Icon
        className={clsx(
          "w-3.5 h-3.5",
          config.animate && "animate-spin"
        )}
      />
      {showLabel && (
        <span className="hidden sm:inline">{config.label}</span>
      )}
    </div>
  )
}

