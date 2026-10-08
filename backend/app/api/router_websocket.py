import json
import uuid
import asyncio
import base64
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.database import SessionLocal
from app.orchestrator.dynamic_graph import DynamicOrchestrator
from app.models import Conversation, Message, Project
from app.services.tts_service import text_to_speech

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket Chatbot"])

def chunk_text(text: str, chunk_size: int = 8):
    words = text.split()
    chunks = []
    curr = []
    for w in words:
        curr.append(w)
        if len(curr) >= chunk_size:
            chunks.append(" ".join(curr) + " ")
            curr = []
    if curr:
        chunks.append(" ".join(curr))
    return chunks

@router.websocket("/ws")
@router.websocket("/ws/{project_id}")
async def websocket_chat_endpoint(websocket: WebSocket, project_id: str = None):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    logger.info(f"WebSocket Connected: session={session_id}, project={project_id}")

    db = SessionLocal()
    try:
        # Fallback to default project if not provided in URL
        if not project_id:
            first_proj = db.query(Project).first()
            project_id = first_proj.id if first_proj else "default"

        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
                msg_type = msg.get("type")

                if msg_type == "PING":
                    await websocket.send_json({"type": "PONG"})
                    continue

                if msg_type == "USER_MESSAGE":
                    user_text = msg.get("payload", "")
                    req_session_id = msg.get("session_id", session_id)
                    is_voice = msg.get("isVoiceInput", False)

                    # Dynamic Orchestrator Execution
                    orchestrator = DynamicOrchestrator(project_id=project_id, db=db)
                    result = await orchestrator.process_turn(user_query=user_text)

                    answer = result.get("answer", "I apologize, but I couldn't process your request.")

                    # Stream text tokens back to client
                    chunks = chunk_text(answer)
                    for chunk in chunks:
                        await websocket.send_json({"type": "MESSAGE_STREAM", "payload": chunk})
                        await asyncio.sleep(0.03)

                    await websocket.send_json({"type": "MESSAGE_COMPLETE", "intent": result.get("intent")})

                    # If voice input requested, stream TTS audio
                    if is_voice:
                        try:
                            audio_bytes = text_to_speech(answer)
                            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                            await websocket.send_json({"type": "AUDIO_STREAM", "payload": audio_b64})
                        except Exception as tts_err:
                            logger.error(f"TTS Audio error: {tts_err}")

            except json.JSONDecodeError:
                await websocket.send_json({"type": "ERROR", "payload": "Invalid JSON message format"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket Disconnected: session={session_id}")
    finally:
        db.close()
