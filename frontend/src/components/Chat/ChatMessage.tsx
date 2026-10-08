// import { ChatMessage as Msg } from "../../types/chat"
// import clsx from "clsx"
// import { User, Bot } from "lucide-react"
// import { MessageContent } from "./MessageContent"
// import { useMemo } from "react"

// export function ChatMessage({ message }: { message: Msg }) {
//   const isUser = message.role === "user"
  
//   // Check if message contains a file URL that will be rendered as an iframe
//   const hasIframe = useMemo(() => {
//     if (isUser) return false
//     const fileUrlRegex = /file:\/\/\/[^\s\)\n]+/
//     return fileUrlRegex.test(message.content)
//   }, [message.content, isUser])

//   return (
//     <div
//       className={clsx(
//         "flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300",
//         isUser && "flex-row-reverse"
//       )}
//     >
//       {/* Avatar */}
//       <div
//         className={clsx(
//           "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md",
//           isUser
//             ? "bg-gradient-to-br from-blue-500 to-blue-600"
//             : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600"
//         )}
//       >
//         {isUser ? (
//           <User className="w-4 h-4 text-white" />
//         ) : (
//           <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
//         )}
//       </div>

//       {/* Message Bubble */}
//       <div
//         className={clsx(
//           "w-full rounded-2xl px-4 py-3 shadow-sm",
//           "transition-all duration-200",
//           hasIframe 
//             ? "max-w-[95%] sm:max-w-[90%] md:max-w-4xl lg:max-w-5xl" 
//             : "max-w-[85%] sm:max-w-[75%] md:max-w-xl",
//           isUser
//             ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm"
//             : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm"
//         )}
//       >
//         <MessageContent content={message.content} streaming={message.streaming} />
//       </div>
//     </div>
//   )
// }

import { ChatMessage as Msg } from "../../types/chat"
import clsx from "clsx"
import { User, Bot } from "lucide-react"
import { MessageContent } from "./MessageContent"
import { useMemo } from "react"

export function ChatMessage({ message }: { message: Msg }) {
  const isUser = message.role === "user"
  
  // Check if message contains a file URL that will be rendered as an iframe
  const hasIframe = useMemo(() => {
    if (isUser) return false
    const fileUrlRegex = /file:\/\/\/[^\s\)\n]+/
    return fileUrlRegex.test(message.content)
  }, [message.content, isUser])

  return (
    <div
      className={clsx(
        "flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md",
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600"
            : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        )}
      </div>

      {/* Message Bubble */}
      <div
  className={clsx(
    "w-full rounded-2xl px-4 py-3 shadow-sm",
    "transition-all duration-200",
    hasIframe 
      ? "max-w-[95%] sm:max-w-[90%] md:max-w-4xl lg:max-w-5xl" 
      : "max-w-[85%] sm:max-w-[75%] md:max-w-xl",
    isUser
      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm"
      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm"
  )}

      >
        <MessageContent content={message.content} streaming={message.streaming} />
      </div>
    </div>
  )
}