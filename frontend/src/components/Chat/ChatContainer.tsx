// import { useEffect, useRef } from "react"
// import { useChatStore } from "../../store/chatStore"
// import { ChatMessage } from "./ChatMessage"

// export function ChatContainer() {
//   const messages = useChatStore((s) => s.messages)
//   const isThinking = useChatStore((s) => s.isThinking)
//   const messagesEndRef = useRef<HTMLDivElement>(null)

//   // Auto-scroll to bottom when new messages arrive or thinking state changes
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages, isThinking])

//   return (
//     <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
//       <div className="max-w-4xl mx-auto flex flex-col gap-4 min-h-full">
//         {messages.length === 0 ? (
//           <div className="flex-1 flex items-center justify-center">
//             <div className="text-center max-w-md px-4">
//               <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
//                 <svg
//                   className="w-8 h-8 text-blue-600 dark:text-blue-300"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
//                   />
//                 </svg>
//               </div>
//               <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
//                 Welcome to Facilities Chat
//               </h3>
//               <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
//                 Ask me anything about your meetings, conference rooms, bookings, amenities, and more!
//               </p>
//             </div>
//           </div>
//         ) : (
//           <>
//             {messages.map((m) => (
//               <ChatMessage key={m.id} message={m} />
//             ))}
//             {isThinking && (
//               <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
//                 {/* Avatar */}
//                 <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
//                   <svg
//                     className="w-4 h-4 text-gray-600 dark:text-gray-300 animate-spin"
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     />
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                     />
//                   </svg>
//                 </div>
//                 {/* Thinking Bubble */}
//                 <div className="max-w-[85%] sm:max-w-[75%] md:max-w-xl rounded-2xl px-4 py-3 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm">
//                   <div className="text-sm text-gray-500 dark:text-gray-400 italic flex items-center gap-1">
//                     <span>Thinking</span>
//                     <span className="flex gap-0.5">
//                       <span className="animate-thinking">.</span>
//                       <span className="animate-thinking [animation-delay:0.2s]">.</span>
//                       <span className="animate-thinking [animation-delay:0.4s]">.</span>
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </>
//         )}
//       </div>
//     </div>
//   )
// }

import { useEffect, useRef } from "react"
import { useChatStore } from "../../store/chatStore"
import { ChatMessage } from "./ChatMessage"

export function ChatContainer() {
  const messages = useChatStore((s) => s.messages)
  const isThinking = useChatStore((s) => s.isThinking)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or thinking state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 min-h-full">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to BFSI Assistant (SaaS)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Ask about account balance, card block, loans, fixed deposits, insurance policies, and customer support.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement
                    if (input) {
                      input.value = "What is my account balance?"
                      input.dispatchEvent(new Event("input", { bubbles: true }))
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Account Balance
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement
                    if (input) {
                      input.value = "How do I block my debit card?"
                      input.dispatchEvent(new Event("input", { bubbles: true }))
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Block Card
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement
                    if (input) {
                      input.value = "Raise a tea request for my room"
                      input.dispatchEvent(new Event("input", { bubbles: true }))
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Tea Request
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement
                    if (input) {
                      input.value = "Show me the banking policy FAQ"
                      input.dispatchEvent(new Event("input", { bubbles: true }))
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Banking FAQ
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {isThinking && (
              <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-gray-300 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                {/* Thinking Bubble */}
                <div className="max-w-[85%] sm:max-w-[75%] md:max-w-xl rounded-2xl px-4 py-3 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic flex items-center gap-1">
                    <span>Thinking</span>
                    <span className="flex gap-0.5">
                      <span className="animate-thinking">.</span>
                      <span className="animate-thinking [animation-delay:0.2s]">.</span>
                      <span className="animate-thinking [animation-delay:0.4s]">.</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  )
}
