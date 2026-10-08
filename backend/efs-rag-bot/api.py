import sys
import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from collections import defaultdict
from datetime import datetime, timedelta
import json
import asyncio
from pathlib import Path
import base64
import uuid  # FIXED missing import
import uvicorn
import re

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
# =============================
# Project Setup
# =============================

root_path = Path(__file__).parent
if str(root_path) not in sys.path:
    sys.path.append(str(root_path))

load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY not found in environment")

from graph.graph import invoke_graph
from elevenlabs_tts import text_to_speech

# =============================
# NEW: Chroma imports (ABC RAG)
# =============================
from langchain_chroma import Chroma
from config import get_embeddings, CHROMA_DIR

# =============================
# FastAPI init
# =============================
app = FastAPI(
    title="EFS RAG Chatbot API",
    version="2.0.0",
    description="Enterprise FAQ Assistant with multi-RAG support"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# Session Store (EFS unchanged)
# =============================
class SessionStore:
    def __init__(self, ttl_minutes=30):
        self.sessions: Dict[str, List[Dict]] = defaultdict(list)
        self.last_activity: Dict[str, datetime] = {}
        self.ttl_minutes = ttl_minutes

    def add_message(self, session_id: str, role: str, content: str):
        self.sessions[session_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        self.last_activity[session_id] = datetime.now()
        self._cleanup_old_sessions()

    def get_history(self, session_id: str):
        self._cleanup_old_sessions()
        return self.sessions.get(session_id, [])

    def clear_session(self, session_id: str):
        self.sessions.pop(session_id, None)
        self.last_activity.pop(session_id, None)

    def _cleanup_old_sessions(self):
        now = datetime.now()
        expired = [
            sid for sid, t in self.last_activity.items()
            if (now - t) > timedelta(minutes=self.ttl_minutes)
        ]
        for sid in expired:
            self.clear_session(sid)

session_store = SessionStore()

# =============================
# WebSocket Store (unchanged)
# =============================
class WebSocketSessionStore:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.ws_to_session: Dict[WebSocket, str] = {}

    async def register(self, ws: WebSocket, session_id: str):
        self.connections[session_id] = ws
        self.ws_to_session[ws] = session_id

    async def unregister(self, ws: WebSocket):
        sid = self.ws_to_session.get(ws)
        if sid:
            self.connections.pop(sid, None)
        self.ws_to_session.pop(ws, None)

ws_session_store = WebSocketSessionStore()

def chunk_text(text: str, chunk_size: int = 10):
    words = text.split()
    chunks, temp, length = [], [], 0

    for w in words:
        if length + len(w) > chunk_size and temp:
            chunks.append(" ".join(temp) + " ")
            temp = [w]
            length = len(w)
        else:
            temp.append(w)
            length += len(w) + 1

    if temp:
        chunks.append(" ".join(temp))

    return chunks

# =============================
# Pydantic Models
# =============================
class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class AskRequest(BaseModel):
    input: str
    session_id: str
    source: Optional[str] = "Governance"
    history: Optional[List[dict]] = None

class AskResponse(BaseModel):
    answer: str
    source_location: str
    needs_followup: bool
    canonical_question: Optional[str] = None
    conversation_history: List[Message]
    performance: dict

# =============================
# HEALTH
# =============================
@app.get("/health")
def health():
    return {"status": "ok", "service": "EFS Assistant"}

# =============================
# EFS ASK (UNCHANGED)
# =============================
@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    start_time = time.time()

    try:
        history = req.history or session_store.get_history(req.session_id)

        result = invoke_graph(
            question=req.input,
            room=req.source,
            conversation_history=history
        )

        session_store.add_message(req.session_id, "user", req.input)
        session_store.add_message(req.session_id, "assistant", result["answer"])

        updated_history = session_store.get_history(req.session_id)

        return AskResponse(
            answer=result["answer"],
            source_location=req.source,
            needs_followup=result.get("needs_followup", False),
            canonical_question=result.get("canonical_question"),
            conversation_history=[
                Message(**m) for m in updated_history
            ],
            performance={
                "response_time": round(time.time() - start_time, 2)
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# NEW: ABC BANK RAG
# =============================

ABC_DB = Chroma(
    collection_name="abc_bank_faqs",
    embedding_function=get_embeddings(),
    persist_directory=CHROMA_DIR
)

def ask_abc_bank(query: str, k: int = 3):
    results = ABC_DB.similarity_search(query, k=k)

    if not results:
        return {
            "answer": "No ABC Bank data found.",
            "source_location": "abc_bank"
        }

    # top = results[0]
    content = results[0].page_content
    match = re.search(
        r"Question:.*?Answer:\s*(.*)",
        content,
        re.DOTALL
    )

    answer = match.group(1).strip() if match else content

    return {
        "answer": answer,
        "source_location": "abc_bank",
        "raw_results": [d.page_content for d in results]
    }

@app.post("/ask-abc")
def ask_abc(req: AskRequest):
    start_time = time.time()

    try:
        result = ask_abc_bank(req.input)

        return {
            "answer": result["answer"],
            "source_location": "abc_bank_faqs",
            "performance": {
                "response_time": round(time.time() - start_time, 2)
            },
            "raw_results": result.get("raw_results", [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# SESSION ENDPOINTS (UNCHANGED)
# =============================
@app.post("/clear-session")
def clear_session(req: AskRequest):
    session_store.clear_session(req.session_id)
    return {"status": "cleared"}

@app.get("/session/{session_id}")
def get_session(session_id: str):
    return session_store.get_history(session_id)

@app.get("/sessions")
def list_sessions():
    return list(session_store.sessions.keys())

# =============================
# LEGACY
# =============================
@app.post("/chat")
def chat_legacy(req: AskRequest):
    return ask(req)

# =============================
# STARTUP
# =============================
@app.on_event("startup")
async def startup():
    print("EFS RAG API Started with ABC Bank support")
    
    
if __name__ == "__main__":
    port = int(os.getenv("RAG_BOT_PORT", 8000))
    print(port)

    # if __name__ == "__main__":
    # port = int(os.getenv("RAG_BOT_PORT", 8000))

    print(f"Starting on port {port}")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )