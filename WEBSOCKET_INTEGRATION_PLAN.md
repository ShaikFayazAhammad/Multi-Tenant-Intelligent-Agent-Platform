# WebSocket Integration Plan: React Frontend ↔ Python Backend

## Overview
This document outlines the plan for connecting the React frontend to both Python backend services (`efs-rag-bot` and `efs_vms_chatbot`) via WebSocket for real-time streaming chat functionality.

---

## Current State Analysis

### Frontend (React)
✅ **Already Implemented:**
- `WebSocketChatTransport.ts` - Complete WebSocket client implementation
- Message protocol: `{ type: "USER_MESSAGE", payload: string }`
- Event handling: `MESSAGE_STREAM`, `MESSAGE_COMPLETE`, `ERROR`
- Heartbeat/ping-pong mechanism (30s interval)
- Auto-reconnection with exponential backoff
- Connection state management
- Message queuing when disconnected
- Configurable via `VITE_WS_URL` environment variable
- Default URL: `ws://localhost:3001/ws` or auto-detected from `window.location`

### Backend - efs-rag-bot (Port 8002)
❌ **Missing:**
- WebSocket endpoint implementation
- Streaming support for LangGraph responses
- WebSocket session management

✅ **Available:**
- FastAPI framework (supports WebSocket)
- `websockets` package in requirements.txt
- LangGraph workflow (`graph.graph.invoke_graph()`)
- REST endpoint `/ask` with conversation tracking
- Session store for conversation history

### Backend - efs_vms_chatbot (Port 8000)
❌ **Missing:**
- WebSocket endpoint implementation
- Streaming support for LangGraph workflow
- WebSocket session management

✅ **Available:**
- FastAPI framework (supports WebSocket)
- Multi-agent LangGraph workflow
- REST endpoint `/chat` with agent orchestration
- Tools: WiFi, Pantry, Meeting Room, etc.

---

## Integration Plan

### Phase 1: Backend WebSocket Implementation

#### 1.1 efs-rag-bot WebSocket Endpoint
**File:** `backend/efs-rag-bot/api.py` (or create `backend/efs-rag-bot/websocket.py`)

**Requirements:**
- WebSocket endpoint at `/ws`
- Handle incoming messages: `{ type: "USER_MESSAGE", payload: string }`
- Support session management via query params or message headers
- Stream LangGraph responses token-by-token
- Send events: `MESSAGE_STREAM`, `MESSAGE_COMPLETE`, `ERROR`
- Handle ping/pong for heartbeat
- Maintain conversation history per WebSocket connection

**Message Protocol:**
```python
# Client → Server
{
    "type": "USER_MESSAGE",
    "payload": "user message text",
    "session_id": "optional-session-id",
    "source": "governance"  # room location
}

# Server → Client (Streaming)
{
    "type": "MESSAGE_STREAM",
    "payload": "token"  # single token or chunk
}

# Server → Client (Complete)
{
    "type": "MESSAGE_COMPLETE"
}

# Server → Client (Error)
{
    "type": "ERROR",
    "payload": "error message"
}

# Heartbeat
{
    "type": "PING"  # Client → Server
}
{
    "type": "PONG"  # Server → Client
}
```

**Implementation Approach:**
1. Use FastAPI's `WebSocket` class
2. Create async generator for LangGraph streaming (if supported) or simulate streaming
3. Use `asyncio` for concurrent message handling
4. Store session state per WebSocket connection
5. Integrate with existing `session_store` for conversation history

#### 1.2 efs_vms_chatbot WebSocket Endpoint
**File:** `backend/efs_vms_chatbot/main.py` (add WebSocket route)

**Requirements:**
- WebSocket endpoint at `/ws`
- Handle multi-agent workflow streaming
- Support authentication token (optional)
- Stream agent responses as they're generated
- Handle tool execution status updates
- Same message protocol as efs-rag-bot

**Additional Considerations:**
- Agent orchestration may produce multiple intermediate responses
- Tool calls may need status updates (`TOOL_CALL_START`, `TOOL_CALL_COMPLETE`)
- Intent detection results could be streamed

---

### Phase 2: Streaming Implementation

#### 2.1 LangGraph Streaming Support
**Challenge:** LangGraph's `invoke()` method returns complete results, not streams.

**Solutions:**

**Option A: Simulate Streaming (Recommended for MVP)**
- Invoke graph normally
- Split response into chunks/tokens
- Stream chunks with delays (e.g., 50ms per chunk)
- Simple to implement, works immediately

**Option B: Use LangGraph Streaming (If Available)**
- Use `astream()` or `astream_events()` if available in LangGraph version
- Stream actual graph execution steps
- More complex but provides real streaming

**Option C: Hybrid Approach**
- Use `astream_events()` to stream graph steps
- Extract and forward relevant tokens/messages
- Provides intermediate updates (intent detection, tool calls, etc.)

**Implementation Priority:**
1. Start with Option A (simulate streaming)
2. Upgrade to Option C if LangGraph version supports it
3. Provides better UX immediately while allowing future enhancement

#### 2.2 Token Chunking Strategy
```python
def chunk_text(text: str, chunk_size: int = 10) -> list[str]:
    """Split text into chunks for streaming"""
    # Word-aware chunking (prefer word boundaries)
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + 1 > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
            current_length += len(word) + 1
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks
```

---

### Phase 3: Session Management

#### 3.1 WebSocket Session Store
**Requirements:**
- Map WebSocket connections to session IDs
- Store conversation history per session
- Handle reconnection (same session ID)
- Cleanup on disconnect (with TTL)

**Implementation:**
```python
class WebSocketSessionStore:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}  # session_id -> WebSocket
        self.sessions: dict[str, dict] = {}  # session_id -> session_data
        self.ws_to_session: dict[WebSocket, str] = {}  # WebSocket -> session_id
    
    async def register(self, ws: WebSocket, session_id: str):
        """Register a WebSocket connection with a session"""
        # Implementation
    
    async def unregister(self, ws: WebSocket):
        """Unregister a WebSocket connection"""
        # Implementation
    
    def get_session_id(self, ws: WebSocket) -> str | None:
        """Get session ID for a WebSocket"""
        # Implementation
```

#### 3.2 Session ID Handling
**Options:**
1. **Query Parameter:** `ws://localhost:8002/ws?session_id=abc123`
2. **First Message:** Client sends session_id in initial message
3. **Auto-Generate:** Server generates session_id on connection

**Recommendation:** Use query parameter for simplicity, fallback to auto-generate.

---

### Phase 4: Error Handling & Resilience

#### 4.1 Error Scenarios
- Graph execution errors
- Network disconnections
- Invalid message format
- Session not found
- Timeout handling

#### 4.2 Error Response Format
```python
{
    "type": "ERROR",
    "payload": "Human-readable error message",
    "code": "ERROR_CODE",  # Optional
    "session_id": "session-id"  # Optional
}
```

#### 4.3 Reconnection Handling
- Frontend already handles reconnection
- Backend should:
  - Accept reconnection with same session_id
  - Restore conversation history
  - Continue from where left off

---

### Phase 5: Configuration & Environment

#### 5.1 Backend Configuration
**efs-rag-bot:**
- WebSocket port: Same as HTTP (8002) or separate port?
- CORS: Allow WebSocket connections from frontend origin
- Timeout: WebSocket connection timeout (e.g., 5 minutes)

**efs_vms_chatbot:**
- WebSocket port: Same as HTTP (8000) or separate port?
- CORS: Allow WebSocket connections from frontend origin
- Authentication: Optional token validation

#### 5.2 Frontend Configuration
**Environment Variables:**
```env
# For efs-rag-bot
VITE_WS_URL_RAG=ws://localhost:8002/ws

# For efs_vms_chatbot
VITE_WS_URL_VMS=ws://localhost:8000/ws

# Or auto-detect from window.location
```

**Update:** `frontend/src/config/env.ts` to support multiple WebSocket URLs if needed.

---

## Implementation Steps

### Step 1: efs-rag-bot WebSocket Endpoint
1. ✅ Create `backend/efs-rag-bot/websocket.py` or add to `api.py`
2. ✅ Implement WebSocket endpoint `/ws`
3. ✅ Add message parsing and validation
4. ✅ Integrate with existing `invoke_graph()` function
5. ✅ Implement streaming (start with simulated streaming)
6. ✅ Add session management
7. ✅ Handle ping/pong
8. ✅ Add error handling
9. ✅ Test with frontend

### Step 2: efs_vms_chatbot WebSocket Endpoint
1. ✅ Add WebSocket route to `main.py`
2. ✅ Implement message handling
3. ✅ Integrate with workflow
4. ✅ Stream agent responses
5. ✅ Handle tool call updates (optional)
6. ✅ Add session management
7. ✅ Test with frontend

### Step 3: Frontend Updates (If Needed)
1. ✅ Verify WebSocket URL configuration
2. ✅ Test connection to both backends
3. ✅ Handle different response formats (if any)
4. ✅ Update error messages for backend-specific errors

### Step 4: Testing & Validation
1. ✅ Test WebSocket connection
2. ✅ Test message sending/receiving
3. ✅ Test streaming responses
4. ✅ Test reconnection
5. ✅ Test error handling
6. ✅ Test session persistence
7. ✅ Load testing (multiple concurrent connections)

---

## Code Structure

### Backend File Structure
```
backend/
├── efs-rag-bot/
│   ├── api.py                    # Existing REST API
│   ├── websocket.py              # NEW: WebSocket endpoint
│   ├── graph/
│   │   └── graph.py             # Existing LangGraph workflow
│   └── requirements.txt          # Already has websockets
│
└── efs_vms_chatbot/
    ├── main.py                   # Add WebSocket route here
    ├── websocket_handler.py      # NEW: WebSocket logic (optional)
    ├── graph/
    │   └── workflow.py          # Existing workflow
    └── requirements.txt          # Add websockets if missing
```

### Frontend (No Changes Needed)
```
frontend/
└── src/
    └── transport/
        ├── WebSocketChatTransport.ts  # Already complete
        └── createTransport.ts         # Already configured
```

---

## Technical Considerations

### 1. FastAPI WebSocket Implementation
```python
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Process message
            # Stream response
    except WebSocketDisconnect:
        # Handle disconnect
```

### 2. CORS for WebSocket
FastAPI's CORS middleware doesn't apply to WebSocket. Need to handle in WebSocket endpoint:
```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Check origin if needed
    origin = websocket.headers.get("origin")
    # Allow or reject based on origin
    await websocket.accept()
```

### 3. Concurrent Connections
- Use async/await for non-blocking I/O
- Consider connection limits
- Monitor resource usage

### 4. Message Queue
- Frontend already queues messages when disconnected
- Backend should process messages in order
- Consider rate limiting

---

## Testing Checklist

### Unit Tests
- [ ] WebSocket connection establishment
- [ ] Message parsing and validation
- [ ] Streaming response generation
- [ ] Session management
- [ ] Error handling

### Integration Tests
- [ ] Frontend ↔ Backend WebSocket communication
- [ ] Streaming message delivery
- [ ] Reconnection with session persistence
- [ ] Multiple concurrent connections
- [ ] Error recovery

### Manual Testing
- [ ] Connect from frontend
- [ ] Send message and receive streaming response
- [ ] Disconnect and reconnect
- [ ] Test with different session IDs
- [ ] Test error scenarios
- [ ] Test with both backends

---

## Future Enhancements

1. **Real LangGraph Streaming:** Upgrade to use `astream_events()` when available
2. **Tool Call Updates:** Stream tool execution status for efs_vms_chatbot
3. **Typing Indicators:** Send typing indicators while processing
4. **Message History:** Fetch conversation history on reconnection
5. **Multi-User Support:** Handle multiple users per session
6. **Rate Limiting:** Implement per-session rate limiting
7. **Metrics:** Add WebSocket connection metrics and monitoring

---

## Dependencies

### Backend
- ✅ `fastapi` - Already installed
- ✅ `websockets` - Already in efs-rag-bot requirements
- ⚠️ `websockets` - May need to add to efs_vms_chatbot requirements
- ✅ `uvicorn[standard]` - Already installed (supports WebSocket)

### Frontend
- ✅ No additional dependencies needed
- ✅ WebSocket API is native browser API

---

## Timeline Estimate

- **Phase 1 (efs-rag-bot):** 2-3 hours
- **Phase 2 (efs_vms_chatbot):** 2-3 hours
- **Phase 3 (Testing & Refinement):** 1-2 hours
- **Total:** 5-8 hours

---

## Notes

1. **Start Simple:** Begin with simulated streaming, upgrade later
2. **Reuse Code:** Both backends can share WebSocket utility functions
3. **Backward Compatibility:** Keep REST endpoints for non-WebSocket clients
4. **Documentation:** Update API docs with WebSocket endpoint information
5. **Monitoring:** Add logging for WebSocket connections and errors

