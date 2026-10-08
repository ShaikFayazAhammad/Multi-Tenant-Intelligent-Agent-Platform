import sys
import os
from dotenv import load_dotenv
import re
# Load environment variables early
load_dotenv()

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Add current directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from models.schemas import ChatRequest, ChatResponse
from models.state import AgentState
from graph.workflow import create_workflow
from datetime import datetime
from config.api_config import API_HEADERS
from services.database_service import db_service  # DB integration
import logging
import traceback
import json
import asyncio
import uuid
import base64
from elevenlabs_tts import text_to_speech

import jwt
from fastapi import Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import auth_config

security = HTTPBearer()

# Initialize JWKS Client when available. This backend also supports local fallback mode.
try:
    jwks_client = jwt.PyJWKClient(auth_config.OIDC_JWKS_URL)
except AttributeError:
    jwks_client = None

async def verify_token():
    return {
        "sub": "test-user-001",
        "email": "test@haloocom.com",
        "name": "Test User"
    }

def parse_ws_token(token: str) -> dict:
    """
    Decode JWT payload from WebSocket message body WITHOUT signature verification.
    Safe for extracting user identity (sub, email) for DB storage only.
    Returns the payload dict on success, or empty dict on failure.
    """
    if not token or not token.strip():
        return {}
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False},
        )
        return payload
    except Exception as e:
        logger.warning(f"[WS] Token parse error: {e}")
        return {}


# Configure logging
LOG_DIR = os.path.join(os.getcwd(), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "main_backend.log")

console_handler = logging.StreamHandler()
file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')

log_format = '%(levelname)s:%(name)s:%(message)s'
logging.basicConfig(
    level=logging.INFO,
    format=log_format,
    handlers=[console_handler, file_handler]
)

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.INFO)
logging.getLogger("graph").setLevel(logging.INFO)
logging.getLogger("agents").setLevel(logging.INFO)
logging.getLogger("tools").setLevel(logging.INFO)
logging.getLogger("services").setLevel(logging.INFO)

# Import auth router
from routers import auth as auth_router

app = FastAPI(title="EFS VMS Chatbot - Multi-Agent System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router.router)

# Create workflow
workflow = create_workflow()


# ----------- WebSocket Session Store -----------

class WebSocketSessionStore:
    """Manages WebSocket connections and their associated sessions"""
    def __init__(self):
        self.connections = {}
        self.ws_to_session = {}

    async def register(self, ws: WebSocket, session_id: str):
        self.connections[session_id] = ws
        self.ws_to_session[ws] = session_id
        logger.info(f"WebSocket registered for session: {session_id}")

    async def unregister(self, ws: WebSocket):
        if ws in self.ws_to_session:
            session_id = self.ws_to_session[ws]
            del self.ws_to_session[ws]
            if session_id in self.connections:
                del self.connections[session_id]
            logger.info(f"WebSocket unregistered for session: {session_id}")

    def get_session_id(self, ws: WebSocket):
        return self.ws_to_session.get(ws)

ws_session_store = WebSocketSessionStore()


# ----------- WebSocket Utility Functions -----------

def chunk_text(text: str, chunk_size: int = 10):
    """Split text into word-aware chunks for streaming, preserving newlines and whitespace"""
    tokens = re.split(r'(\s+)', text)
    chunks = []
    current_chunk = ""

    for token in tokens:
        current_chunk += token
        if len(current_chunk) >= chunk_size and not token.isspace():
            chunks.append(current_chunk)
            current_chunk = ""

    if current_chunk:
        chunks.append(current_chunk)

    return chunks

# ----------- DB Helper Functions -----------

def load_session_history(session_id: str) -> tuple[list, list]:
    """Load messages from DB (single table). Falls back to in-memory."""
    try:
        row = db_service.get_session(session_id)
        if row and row.get('chat_history'):
            messages = row['chat_history']
            logger.info(f"Loaded {len(messages)} messages from DB: {session_id}")
            conv_history = SESSION_STORE.get(session_id, {}).get("conversation_history", [])
            return messages, conv_history
    except Exception as e:
        logger.warning(f"DB load failed, using in-memory: {e}")

    stored = SESSION_STORE.get(session_id, {})
    return stored.get("messages", []), stored.get("conversation_history", [])


def persist_session(session_id, user_id, user_email, access_token, room_location,
                    user_input, assistant_response, final_state,
                    local_storage_info=None):

    # Build the full updated message list
    messages = final_state.get("messages", [])

    # Append assistant reply if not already there
    if not messages or messages[-1].get("role") != "assistant":
        messages = messages + [{"role": "assistant", "content": assistant_response}]

    # Update in-memory store
    SESSION_STORE[session_id] = {
        "messages": messages,
        "conversation_history": final_state.get("conversation_history", []),
    }

    refresh_token = None
    if local_storage_info:
        refresh_token = (
            local_storage_info.get("refreshToken")
            or (local_storage_info.get("vms_user_session") or {})
               .get("user", {}).get("refresh_token")
        )

    try:
        logger.info(
            f"Persisting session: {session_id} | "
            f"user={user_id} | room={room_location} | "
            f"local_storage={'YES' if local_storage_info else 'NO'} | "
            f"refresh_token={'YES' if refresh_token else 'NO'}"
        )

        db_service.save_session(
            session_id=session_id,
            user_id=user_id,
            user_email=user_email,
            access_token=access_token,
            refresh_token=refresh_token,
            room_location=room_location,
            chat_history=messages,
            local_storage_info=local_storage_info,
            api_data=final_state.get("api_data"),
        )
        logger.info(f"Session persisted - {len(messages)} messages: {session_id}")
    except Exception as e:
        logger.warning(f"DB persist failed (in-memory still updated): {e}")

# Global in-memory session store (fallback / cache)
SESSION_STORE = {}


# ----------- HTTP Chat Endpoint -----------

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, user_payload: dict = Depends(verify_token)):
    """Main chat endpoint - Requires Valid OIDC Token"""

    user_id = user_payload.get("sub", request.user_id)
    user_email = user_payload.get("email", "unknown")

    logger.info(f"New request from user: {user_email} ({user_id})")
    logger.info(f"Query: {request.input[:100]}...")
    logger.info(f"Location: {request.room}")

    try:
        if request.access_token and request.access_token.strip():
            API_HEADERS["Authorization"] = f"Bearer {request.access_token}"
        else:
            API_HEADERS["Authorization"] = ""

        session_id = request.session_id

        current_history, conv_history = load_session_history(session_id)
        current_history.append({"role": "user", "content": request.input})

        initial_state: AgentState = {
            "session_id": session_id,
            "user_id": user_id,
            "user_email": user_email,
            "access_token": request.access_token,
            "room_location": request.room,
            "messages": current_history,
            "current_query": request.input,
            "next_agent": "orchestrator",
            "intent": None,
            "tool_calls": [],
            "tool_results": [],
            "api_data": {},
            "final_response": None,
            "error": None,
            "timestamp": datetime.now(),
            "conversation_history": conv_history,
        }

        logger.info("Starting multi-agent workflow...")
        final_state = await workflow.ainvoke(initial_state)

        intent = final_state.get("intent", "unknown")
        history = final_state.get("conversation_history", [])
        agent_used = history[-1].get("agent", "unknown") if history else "unknown"
        answer = final_state.get("final_response") or "I couldn't process that request."

        persist_session(
            session_id=session_id,
            user_id=user_id,
            user_email=user_email,
            access_token=request.access_token,
            room_location=request.room,
            user_input=request.input,
            assistant_response=answer,
            final_state=final_state,
            local_storage_info=request.local_storage_info,
        )

        logger.info(f"Workflow complete | Intent: {intent} | Agent: {agent_used}")

        return ChatResponse(
            answer=answer,
            session_id=session_id,
            intent=intent,
            agent_used=agent_used,
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Fatal error in chat endpoint: {str(e)}")
        logger.error(error_trace)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": str(e),
                "traceback": error_trace if os.getenv("DEBUG_MODE", "true").lower() == "true" else None,
            },
        )


# ----------- Health / Root Endpoints -----------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EFS VMS Multi-Agent Chatbot",
        "architecture": "LangGraph with Orchestrator + API Agent",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/")
def root():
    return {
        "service": "EFS VMS Multi-Agent Chatbot",
        "version": "2.0.0",
        "architecture": {
            "orchestrator": "Routes queries to specialized agents",
            "api_agent": "Handles queries requiring external API calls",
            "faq_agent": "Handles FAQ queries via RAG",
        },
        "endpoints": {
            "POST /chat": "Main chat endpoint",
            "POST /api/auth/signup": "Register new user",
            "POST /api/auth/login": "Login and get JWT",
            "GET /health": "Health check",
            "GET /": "This documentation",
        },
    }


# ----------- WebSocket Endpoint -----------

@app.websocket("/")
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, session_id: str = None, access_token: str = None):
    """
    WebSocket endpoint for real-time streaming chat.
    Protocol:
      Client -> Server: {"type": "USER_MESSAGE", "payload": str, "session_id": str, "source": str}
      Server -> Client: {"type": "MESSAGE_STREAM", "payload": str}
      Server -> Client: {"type": "MESSAGE_COMPLETE"}
      Server -> Client: {"type": "ERROR", "payload": str}
      Client -> Server: {"type": "PING"}
      Server -> Client: {"type": "PONG"}
    """
    await websocket.accept()

    if not session_id:
        session_id = str(uuid.uuid4())

    await ws_session_store.register(websocket, session_id)

    logger.info(f"\n{'='*80}")
    logger.info(f"WebSocket Connected - Session: {session_id}")
    logger.info(f"   Access token from URL: {'***' + access_token[-10:] if access_token else 'NONE'}")
    logger.info(f"{'='*80}")

    try:
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                msg_type = message.get("type")

                # Handle PING
                if msg_type == "PING":
                    await websocket.send_json({"type": "PONG"})
                    continue

                logger.info(f"Message keys: {list(message.keys())}")

                # Handle USER_MESSAGE
                if msg_type == "USER_MESSAGE":
                    payload = message.get("payload", "")
                    msg_session_id = message.get("session_id", session_id)
                    msg_access_token = message.get("access_token") or access_token or ""
                    room = message.get("source", "Governance")

                    token_payload = parse_ws_token(msg_access_token)
                    user_id    = token_payload.get("sub")   or message.get("user_id", "websocket_user")
                    user_email = token_payload.get("email", "unknown")

                    local_storage_info = message.get("local_storage_info")

                    if not local_storage_info and token_payload:
                        local_storage_info = {
                            "userId":    token_payload.get("sub"),
                            "userEmail": token_payload.get("email"),
                            "firstName": token_payload.get("firstName"),
                            "lastName":  token_payload.get("lastName"),
                            "fullName":  token_payload.get("fullName"),
                            "rid":       token_payload.get("rid"),
                            "roles":     token_payload.get("roles"),
                            "room":      room,
                            "source":    "jwt_fallback",
                        }
                        logger.info(f"[WS] local_storage_info built from JWT fallback | user: {user_email}")
                    else:
                        logger.info(f"[WS] local_storage_info from frontend: {'YES' if local_storage_info else 'None'}")

                    logger.info(f"\nWebSocket Message | Session: {msg_session_id} | User: {user_email} ({user_id})")
                    logger.info(f"   Query: {payload[:100]}...")

                    try:
                        if msg_access_token and msg_access_token.strip():
                            API_HEADERS["Authorization"] = f"Bearer {msg_access_token}"
                        else:
                            API_HEADERS["Authorization"] = ""
                            logger.warning("No access token - notification API calls may fail with 401")

                        current_ws_history, ws_conv_history = load_session_history(msg_session_id)
                        current_ws_history.append({"role": "user", "content": payload})

                        initial_state = {
                            "session_id": msg_session_id,
                            "user_id": user_id,
                            "user_email": user_email,
                            "access_token": msg_access_token,
                            "room_location": room,
                            "messages": current_ws_history,
                            "current_query": payload,
                            "next_agent": "orchestrator",
                            "intent": None,
                            "tool_calls": [],
                            "tool_results": [],
                            "api_data": {},
                            "final_response": None,
                            "error": None,
                            "timestamp": datetime.now(),
                            "conversation_history": ws_conv_history,
                        }

                        logger.info("Starting multi-agent workflow...")
                        final_state = await workflow.ainvoke(initial_state)

                        intent = final_state.get("intent", "unknown")
                        history = final_state.get("conversation_history", [])
                        agent_used = history[-1].get("agent", "unknown") if history else "unknown"
                        answer = final_state.get("final_response") or "I couldn't process that request."

                        if not isinstance(answer, str):
                            answer = "I apologize, but I couldn't generate a proper response."

                        persist_session(
                            session_id=msg_session_id,
                            user_id=user_id,
                            user_email=user_email,
                            access_token=msg_access_token,
                            room_location=room,
                            user_input=payload,
                            assistant_response=answer,
                            final_state=final_state,
                            local_storage_info=local_storage_info,
                        )

                        logger.info(f"Workflow complete | Intent: {intent} | Agent: {agent_used}")

                        chunks = chunk_text(answer, chunk_size=10)
                        logger.info(f"Streaming {len(chunks)} chunks...")

                        for chunk in chunks:
                            await websocket.send_json({"type": "MESSAGE_STREAM", "payload": chunk})
                            await asyncio.sleep(0.05)

                        await websocket.send_json({"type": "MESSAGE_COMPLETE"})

                        if message.get("isVoiceInput", False):
                            try:
                                logger.info(f"Generating ElevenLabs TTS for: {answer[:50]}...")
                                audio_bytes = text_to_speech(answer)
                                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
                                await websocket.send_json({"type": "AUDIO_STREAM", "payload": audio_base64})
                                logger.info("Audio sent successfully")
                            except Exception as audio_error:
                                logger.error(f"TTS error: {str(audio_error)}")

                        logger.info(f"{'='*80}\n")

                    except Exception as e:
                        error_trace = traceback.format_exc()
                        logger.error(f"Error processing message: {str(e)}\n{error_trace}")
                        await websocket.send_json({
                            "type": "ERROR",
                            "payload": f"Error processing request: {str(e)}",
                            "debug": error_trace if os.getenv("DEBUG_MODE", "true").lower() == "true" else None,
                        })

                else:
                    await websocket.send_json({"type": "ERROR", "payload": f"Unknown message type: {msg_type}"})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "ERROR", "payload": "Invalid JSON format"})

    except WebSocketDisconnect:
        logger.info(f"\nWebSocket Disconnected: {session_id}")
        await ws_session_store.unregister(websocket)
    except Exception as e:
        logger.error(f"WebSocket Error: {str(e)}")
        await ws_session_store.unregister(websocket)


if __name__ == "__main__":
    import uvicorn

    PORT = int(os.getenv("EFS_BACKEND_PORT", "8000"))

    print("\n" + "="*80)
    print("EFS VMS CHATBOT - MULTI-AGENT ARCHITECTURE")
    print("="*80)
    print("\nArchitecture:")
    print("  |- Orchestrator Agent (Router)")
    print("  |- API Agent (Tools)")
    print("  └- FAQ Agent (RAG)")
    print("\nDatabase: MySQL (persistent conversation history)")
    print(f"\nStarting on port {PORT}")
    print(f"WebSocket: ws://0.0.0.0:{PORT}/ws")
    print(f"HTTP:      http://0.0.0.0:{PORT}")
    print(f"Auth:      POST /api/auth/signup | POST /api/auth/login")
    print("="*80 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=PORT)
