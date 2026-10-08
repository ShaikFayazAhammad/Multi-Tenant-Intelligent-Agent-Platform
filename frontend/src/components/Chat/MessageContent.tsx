// import { useMemo } from "react"

// interface MessageContentProps {
//   content: string
//   streaming?: boolean
// }

// /**
//  * Converts file:// URLs to HTTP URLs for the floor map server
//  * Example: file:///C:/Users/.../all_floors.html?start=X&dest=Y
//  *          → http://localhost:8000/floor/all_floors.html?start=X&dest=Y
//  */
// function convertFileUrlToHttp(fileUrl: string): string | null {
//   try {
//     // Extract the file path and query parameters
//     // Match file:/// followed by path and optional query params
//     const urlMatch = fileUrl.match(/file:\/\/\/(.+?)(\?.*)?$/)

//     if (!urlMatch) {
//       return null
//     }

//     const filePath = urlMatch[1]
//     const queryParams = urlMatch[2] || ""

//     // Check if it's the all_floors.html file or any HTML file in Floor_map directory
//     if (filePath.includes("all_floors.html") ||
//       filePath.includes("Floor_map") ||
//       filePath.includes("static/floor") ||
//       filePath.includes("floor")) {
//       // Extract query parameters if they exist
//       const params = queryParams.startsWith("?") ? queryParams : ""

//       // Convert to HTTP URL for the floor map server
//       // Using port 8003 for floor map server as fallback
//       let baseUrl = import.meta.env.VITE_FLOOR_MAP_URL || "http://localhost:8003"

//       // Robustly construct the URL to avoid double slashes and incorrect paths
//       // 1. Remove all trailing slashes
//       baseUrl = baseUrl.replace(/\/+$/, '')

//       // 2. Ensure /floor is included if not already part of the domain base
//       if (!baseUrl.endsWith('/floor')) {
//         baseUrl = `${baseUrl}/floor`
//       }

//       const finalUrl = `${baseUrl}/all_floors.html${params}`
//       console.log("Floor Map URL converted:", { original: fileUrl, converted: finalUrl })

//       return finalUrl
//     }

//     return null
//   } catch (error) {
//     console.error("Error converting file URL:", error)
//     return null
//   }
// }

// /**
//  * Extracts file URLs from markdown links or plain text
//  * Returns the URL and the text before it
//  */
// function extractFileUrl(text: string): { url: string | null; textBefore: string; textAfter: string } {
//   // Try to match markdown link: [text](file:///...)
//   // Match everything between ( and ) for the URL part, including spaces
//   // The URL can contain spaces, so we need to match until the closing )
//   const markdownLinkRegex = /\[([^\]]+)\]\((file:\/\/\/[^\)]+)\)/g
//   let markdownMatch = markdownLinkRegex.exec(text)

//   if (markdownMatch) {
//     const fullMatch = markdownMatch[0]
//     const url = markdownMatch[2]
//     const index = text.indexOf(fullMatch)
//     return {
//       url,
//       textBefore: text.substring(0, index).trim(),
//       textAfter: text.substring(index + fullMatch.length).trim()
//     }
//   }

//   // Reset regex lastIndex for next search
//   markdownLinkRegex.lastIndex = 0

//   // Try to match plain file:// URL (without markdown formatting)
//   // Look for file:/// and capture everything up to .html? or .html followed by space/paren/newline
//   const plainUrlRegex = /(file:\/\/\/[^\)\n]+?\.html(?:\?[^\)\s\n]*)?)/g
//   let plainMatch = plainUrlRegex.exec(text)

//   if (plainMatch) {
//     const url = plainMatch[1]
//     const index = text.indexOf(url)
//     return {
//       url,
//       textBefore: text.substring(0, index).trim(),
//       textAfter: text.substring(index + url.length).trim()
//     }
//   }

//   return { url: null, textBefore: text, textAfter: "" }
// }

// export function MessageContent({ content, streaming }: MessageContentProps) {
//   const parsedContent = useMemo(() => {
//     const { url, textBefore, textAfter } = extractFileUrl(content)

//     if (!url) {
//       // No file URL found, return plain text
//       return { hasIframe: false, textBefore: content, iframeUrl: null, textAfter: "" }
//     }

//     const httpUrl = convertFileUrlToHttp(url)

//     if (!httpUrl) {
//       // Couldn't convert to HTTP URL, return plain text
//       return { hasIframe: false, textBefore: content, iframeUrl: null, textAfter: "" }
//     }

//     return {
//       hasIframe: true,
//       textBefore: textBefore.trim(),
//       iframeUrl: httpUrl,
//       textAfter: textAfter.trim()
//     }
//   }, [content])

//   return (
//     <div className="space-y-3">
//       {/* Text content before the iframe */}
//       {parsedContent.textBefore && (
//         <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
//           {parsedContent.textBefore}
//           {streaming && (
//             <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
//           )}
//         </div>
//       )}

//       {/* Iframe for HTML files */}
//       {parsedContent.hasIframe && parsedContent.iframeUrl && (
//         <div className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
//           <iframe
//             src={parsedContent.iframeUrl}
//             className="w-full border-0"
//             style={{
//               height: "70vh",
//               minHeight: "400px",
//               maxHeight: "800px"
//             }}
//             title="Navigation Map"
//             sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
//             loading="lazy"
//             allow="fullscreen"
//           />
//         </div>
//       )}

//       {/* Text content after the iframe */}
//       {parsedContent.textAfter && (
//         <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
//           {parsedContent.textAfter}
//           {streaming && (
//             <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
//           )}
//         </div>
//       )}

//       {/* Fallback: if no iframe was created but there's content, show it */}
//       {!parsedContent.hasIframe && !parsedContent.textBefore && (
//         <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
//           {content}
//           {streaming && (
//             <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

import { useMemo } from "react"

interface MessageContentProps {
  content: string
  streaming?: boolean
}

/**
 * Converts file:// URLs to HTTP URLs for the floor map server
 * Example: file:///C:/Users/.../all_floors.html?start=X&dest=Y
 *          → http://localhost:8000/floor/all_floors.html?start=X&dest=Y
 */
function renderTextWithBold(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function convertFileUrlToHttp(fileUrl: string): string | null {
  try {
    // Extract the file path and query parameters
    // Match file:/// followed by path and optional query params
    const urlMatch = fileUrl.match(/file:\/\/\/(.+?)(\?.*)?$/)
    
    if (!urlMatch) {
      return null
    }

    const filePath = urlMatch[1]
    const queryParams = urlMatch[2] || ""

    // Check if it's the all_floors.html file or any HTML file in Floor_map directory
    if (filePath.includes("all_floors.html") || 
        filePath.includes("Floor_map") || 
        filePath.includes("static/floor") ||
        filePath.includes("floor")) {
      // Extract query parameters if they exist
      const params = queryParams.startsWith("?") ? queryParams : ""
      
      // Convert to HTTP URL for the floor map server
      // This is necessary because browsers block file:// URLs in iframes
      // Using port 8003 for floor map server (8000 is used by main chatbot server)
      const baseUrl = import.meta.env.VITE_FLOOR_MAP_URL || "http://localhost:8003"
      
      // Always use all_floors.html since that's what the server serves at /floor/
      return `${baseUrl}/floor/all_floors.html${params}`
    }

    return null
  } catch (error) {
    console.error("Error converting file URL:", error)
    return null
  }
}

/**
 * Extracts file URLs from markdown links or plain text
 * Returns the URL and the text before it
 */
function extractFileUrl(text: string): { url: string | null; textBefore: string; textAfter: string } {
  // Try to match markdown link: [text](file:///...)
  // Match everything between ( and ) for the URL part, including spaces
  // The URL can contain spaces, so we need to match until the closing )
  const markdownLinkRegex = /\[([^\]]+)\]\((file:\/\/\/[^\)]+)\)/g
  let markdownMatch = markdownLinkRegex.exec(text)
  
  if (markdownMatch) {
    const fullMatch = markdownMatch[0]
    const url = markdownMatch[2]
    const index = text.indexOf(fullMatch)
    return {
      url,
      textBefore: text.substring(0, index).trim(),
      textAfter: text.substring(index + fullMatch.length).trim()
    }
  }

  // Reset regex lastIndex for next search
  markdownLinkRegex.lastIndex = 0

  // Try to match plain file:// URL (without markdown formatting)
  // Look for file:/// and capture everything up to .html? or .html followed by space/paren/newline
  const plainUrlRegex = /(file:\/\/\/[^\)\n]+?\.html(?:\?[^\)\s\n]*)?)/g
  let plainMatch = plainUrlRegex.exec(text)
  
  if (plainMatch) {
    const url = plainMatch[1]
    const index = text.indexOf(url)
    return {
      url,
      textBefore: text.substring(0, index).trim(),
      textAfter: text.substring(index + url.length).trim()
    }
  }

  return { url: null, textBefore: text, textAfter: "" }
}

export function MessageContent({ content, streaming }: MessageContentProps) {
  const parsedContent = useMemo(() => {
    const { url, textBefore, textAfter } = extractFileUrl(content)
    
    if (!url) {
      // No file URL found, return plain text
      return { hasIframe: false, textBefore: content, iframeUrl: null, textAfter: "" }
    }

    const httpUrl = convertFileUrlToHttp(url)
    
    if (!httpUrl) {
      // Couldn't convert to HTTP URL, return plain text
      return { hasIframe: false, textBefore: content, iframeUrl: null, textAfter: "" }
    }

    return {
      hasIframe: true,
      textBefore: textBefore.trim(),
      iframeUrl: httpUrl,
      textAfter: textAfter.trim()
    }
  }, [content])

  return (
    <div className="space-y-3">
      {/* Text content before the iframe */}
      {parsedContent.textBefore && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {renderTextWithBold(parsedContent.textBefore)}
          {streaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
          )}
        </div>
      )}

      {/* Iframe for HTML files */}
      {parsedContent.hasIframe && parsedContent.iframeUrl && (
        <div className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <iframe
            src={parsedContent.iframeUrl}
            className="w-full border-0"
            style={{ height: "600px", minHeight: "500px" }}
            title="Navigation Map"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            loading="lazy"
            allow="fullscreen"
          />
        </div>
      )}

      {/* Text content after the iframe */}
      {parsedContent.textAfter && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {renderTextWithBold(parsedContent.textAfter)}
          {streaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
          )}
        </div>
      )}

      {/* Fallback: if no iframe was created but there's content, show it */}
      {!parsedContent.hasIframe && !parsedContent.textBefore && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {renderTextWithBold(content)}
          {streaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  )
}

