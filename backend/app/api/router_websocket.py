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

                    # Dynamic Orchestrator Execution with Real-Time Token Streaming
                    orchestrator = DynamicOrchestrator(project_id=project_id, db=db)
                    final_result = None

                    async for stream_event in orchestrator.process_turn_stream(user_query=user_text, is_playground=False):
                        if stream_event["type"] == "token":
                            # Stream live token chunk directly to client
                            await websocket.send_json({
                                "type": "MESSAGE_STREAM",
                                "payload": stream_event["payload"]
                            })
                        elif stream_event["type"] == "complete":
                            final_result = stream_event

                    if not final_result:
                        final_result = {
                            "answer": "I apologize, but I couldn't process your request.",
                            "intent": "general_query",
                            "tokens_used": 0,
                            "latency_ms": 0.0,
                            "model_used": "unknown",
                            "should_escalate": False,
                            "tool_calls": [],
                        }

                    answer = final_result.get("answer", "")

                    # Send completion event with full metadata
                    await websocket.send_json({
                        "type": "MESSAGE_COMPLETE",
                        "intent": final_result.get("intent"),
                        "model_used": final_result.get("model_used"),
                        "latency_ms": final_result.get("latency_ms"),
                    })

                    # Persist conversation & messages for history and analytics
                    try:
                        proj_obj = db.query(Project).filter(Project.id == project_id).first()
                        org_id = proj_obj.org_id if proj_obj else "default"
                        conv = db.query(Conversation).filter(Conversation.session_id == req_session_id).first()
                        if not conv:
                            conv = Conversation(
                                org_id=org_id,
                                project_id=project_id,
                                session_id=req_session_id,
                                channel="voice" if is_voice else "chat",
                                status="escalated" if final_result.get("should_escalate") else "active",
                                intent_summary=final_result.get("intent")
                            )
                            db.add(conv)
                            db.commit()
                            db.refresh(conv)

                        # Add User message
                        db.add(Message(
                            conversation_id=conv.id,
                            org_id=org_id,
                            project_id=project_id,
                            sender_type="user",
                            content=user_text,
                        ))
                        # Add Assistant message
                        db.add(Message(
                            conversation_id=conv.id,
                            org_id=org_id,
                            project_id=project_id,
                            sender_type="assistant",
                            content=answer,
                            tokens_used=final_result.get("tokens_used", 0),
                            latency_ms=int(final_result.get("latency_ms", 0)),
                            tool_calls=final_result.get("tool_calls", []),
                            is_flagged=final_result.get("is_flagged", False)
                        ))
                        if final_result.get("should_escalate"):
                            conv.status = "escalated"
                        conv.intent_summary = final_result.get("intent")
                        db.commit()
                    except Exception as persist_err:
                        logger.warning(f"Failed to persist WS conversation turn: {persist_err}")

                    # If voice input requested, stream TTS audio
                    if is_voice and answer:
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
