# EFS-VMS Chat UI

A modern, React-based chat interface for Facillities Management System with real-time message streaming, voice recognition, and a clean, responsive UI.

## Features

- 💬 **Real-time Chat Interface** - Stream messages as they're generated
- 🎤 **Voice Recognition** - Use your voice to send messages (Web Speech API)
- 🔊 **Text-to-Speech** - Hear responses read aloud
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- ⚡ **Fast & Modern** - Built with Vite, React, and TypeScript
- 🎨 **Beautiful UI** - Styled with Tailwind CSS
- 🔄 **State Management** - Powered by Zustand for efficient state handling
- 🧩 **Modular Architecture** - Transport layer abstraction for easy backend integration
- 🌐 **WebSocket Ready** - Built-in WebSocket transport with auto-reconnection

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Web Speech API** - Voice recognition & text-to-speech

## Project Structure

```
vms-chat-ui/
├── src/
│   ├── app/
│   │   └── ChatPage.tsx              # Main chat page component
│   ├── components/
│   │   └── Chat/
│   │       ├── ChatContainer.tsx     # Message display container
│   │       ├── ChatInput.tsx         # Input field with voice support
│   │       ├── ChatMessage.tsx       # Individual message component
│   │       ├── ChatStream.tsx        # Streaming message hook
│   │       ├── ConnectionStatus.tsx  # Connection status indicator
│   │       └── VoiceButton.tsx       # Voice input button
│   ├── config/
│   │   └── env.ts                    # Environment configuration
│   ├── store/
│   │   └── chatStore.ts              # Zustand store for chat state
│   ├── transport/
│   │   ├── ChatTransport.ts          # Transport interface
│   │   ├── MockChatTransport.ts      # Mock implementation for development
│   │   ├── WebSocketChatTransport.ts # WebSocket implementation for production
│   │   ├── createTransport.ts        # Transport factory
│   │   └── TransportContext.tsx      # React context for transport
│   ├── types/
│   │   └── chat.ts                   # TypeScript type definitions
│   ├── voice/
│   │   ├── useSpeechRecognition.ts   # Voice recognition hook
│   │   └── useSpeechSynthesis.ts     # Text-to-speech hook
│   ├── styles/
│   │   └── index.css                 # Global styles (Tailwind)
│   ├── App.tsx                       # Root component
│   ├── main.tsx                      # Application entry point
│   └── vite-env.d.ts                 # Vite environment types
├── dist/                             # Production build output
├── index.html                        # HTML entry point
├── package.json                      # Dependencies and scripts
├── vite.config.ts                    # Vite configuration
├── tsconfig.json                     # TypeScript configuration
├── tailwind.config.js                # Tailwind CSS configuration
└── postcss.config.js                 # PostCSS configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vms-chat-ui
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The application will open at `http://localhost:3000` with hot module replacement enabled.

### Building for Production

Build the production bundle:
```bash
npm run build
```

This will:
- Type-check the code with TypeScript
- Build optimized production assets
- Output files to the `dist/` folder

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

This serves the `dist/` folder at `http://localhost:4173`.

## Environment Configuration

Create a `.env.local` file in the project root to configure the application:

```env
# WebSocket URL for backend connection
# In production, this should point to your Node.js backend
# If not set, defaults to ws(s)://<current-host>/ws
VITE_WS_URL=ws://localhost:3001/ws

# Use mock transport for development without backend
# Set to "false" to connect to real WebSocket backend
VITE_USE_MOCK=true

# Enable debug logging
VITE_DEBUG=true
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WS_URL` | Auto-detected | WebSocket server URL |
| `VITE_USE_MOCK` | `true` | Use mock transport (no backend required) |
| `VITE_DEBUG` | `true` (dev) | Enable debug logging |

## Backend Integration

### Serving the UI from Node.js

After building (`npm run build`), serve the `dist/` folder as static files:

```javascript
// server.js (Node.js with Express)
const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// WebSocket server on /ws path
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    if (message.type === 'PING') {
      ws.send(JSON.stringify({ type: 'PONG' }));
      return;
    }

    if (message.type === 'USER_MESSAGE') {
      // Process the message and stream response
      const response = "Your response here";
      
      // Stream tokens
      for (const char of response) {
        ws.send(JSON.stringify({
          type: 'MESSAGE_STREAM',
          payload: char
        }));
      }
      
      // Complete message
      ws.send(JSON.stringify({ type: 'MESSAGE_COMPLETE' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### WebSocket Protocol

The chat UI expects the following message format:

**Client → Server:**
```typescript
// User message
{ type: "USER_MESSAGE", payload: "Hello, how are you?" }

// Heartbeat ping
{ type: "PING" }
```

**Server → Client:**
```typescript
// Stream a single token/character
{ type: "MESSAGE_STREAM", payload: "H" }

// Mark message as complete
{ type: "MESSAGE_COMPLETE" }

// Error message
{ type: "ERROR", payload: "Error description" }

// Heartbeat response
{ type: "PONG" }
```

### Development with Backend

For development with a local backend:

1. Set environment variables:
```env
VITE_USE_MOCK=false
VITE_WS_URL=ws://localhost:3001/ws
```

2. The Vite dev server is configured to proxy `/ws` to `localhost:3001` automatically.

## Transport Layer

The chat uses a transport layer abstraction (`ChatTransport` interface) that allows you to easily swap between different backends:

### Available Transports

- **MockChatTransport** - Development/testing without backend
- **WebSocketChatTransport** - Production WebSocket connection with:
  - Auto-reconnection with exponential backoff
  - Connection state management
  - Message queuing during disconnection
  - Heartbeat/ping-pong for connection health

### Creating Custom Transport

Implement the `ChatTransport` interface:

```typescript
import { ChatTransport } from './transport/ChatTransport'
import { ChatEvent } from './types/chat'

class CustomTransport implements ChatTransport {
  connect() { /* your implementation */ }
  disconnect() { /* your implementation */ }
  sendMessage(message: string) { /* your implementation */ }
  onEvent(callback: (event: ChatEvent) => void) { /* your implementation */ }
}
```

## State Management

The chat state is managed using Zustand. Access the store:

```typescript
import { useChatStore } from './store/chatStore'

// In a component
const messages = useChatStore((s) => s.messages)
const addUserMessage = useChatStore((s) => s.addUserMessage)
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Modern browsers with ES2020 support
- Voice recognition requires browsers with Web Speech API support:
  - Chrome/Edge (recommended)
  - Safari (partial support)
  - Firefox (not supported)

## Configuration

### Vite Configuration

Edit `vite.config.ts` to customize:
- Build output directory
- Server port
- Path aliases
- Code splitting
- WebSocket proxy settings

### Tailwind Configuration

Edit `tailwind.config.js` to customize:
- Theme colors and spacing
- Custom utilities
- Plugins

## Development Notes

- The project uses TypeScript strict mode
- ESLint is configured for code quality
- Path aliases are set up (`@/` maps to `src/`)
- Source maps are enabled in production builds
- WebSocket proxy is configured for development

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure code passes linting (`npm run lint`)
4. Test in development mode
5. Submit a pull request

## License

[Add your license here]

## Author

[Add author information here]
