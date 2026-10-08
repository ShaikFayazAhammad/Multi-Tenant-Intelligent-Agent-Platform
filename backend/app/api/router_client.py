import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.api.dependencies import get_tenant_context, TenantContext
from app.models import Conversation, Message, Project
from app.orchestrator.dynamic_graph import DynamicOrchestrator

router = APIRouter(prefix="/api/client", tags=["Client Chat & Conversations"])

class ChatRequest(BaseModel):
    project_id: str
    session_id: Optional[str] = None
    message: str
    channel: Optional[str] = "chat"

class ChatResponse(BaseModel):
    session_id: str
    answer: str
    intent: str
    should_escalate: bool
    latency_ms: float

class ConversationSummaryResponse(BaseModel):
    id: str
    org_id: str
    project_id: str
    session_id: str
    channel: str
    status: str
    intent_summary: Optional[str] = None
    start_time: str

    class Config:
        from_attributes = True

class MessageDetailResponse(BaseModel):
    id: str
    sender_type: str
    content: str
    tokens_used: int
    latency_ms: int
    created_at: str

    class Config:
        from_attributes = True

@router.post("/chat", response_model=ChatResponse)
async def http_chat_endpoint(req: ChatRequest, db: Session = Depends(get_db), ctx: TenantContext = Depends(get_tenant_context)):
    """HTTP Chat Endpoint - Multi-Tenant Scoped"""
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project or not ctx.can_access_org(project.org_id):
        raise HTTPException(status_code=403, detail="Unauthorized access to project")

    session_id = req.session_id or str(uuid.uuid4())

    # Get or create conversation row
    conv = db.query(Conversation).filter(Conversation.session_id == session_id).first()
    if not conv:
        conv = Conversation(
            org_id=project.org_id,
            project_id=req.project_id,
            user_id=ctx.user_id,
            session_id=session_id,
            channel=req.channel or "chat",
            status="active"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        org_id=project.org_id,
        project_id=req.project_id,
        sender_type="user",
        content=req.message
    )
    db.add(user_msg)
    db.commit()

    # Process turn with dynamic orchestrator
    orchestrator = DynamicOrchestrator(project_id=req.project_id, db=db)
    result = await orchestrator.process_turn(user_query=req.message)

    # Save assistant message
    asst_msg = Message(
        conversation_id=conv.id,
        org_id=project.org_id,
        project_id=req.project_id,
        sender_type="assistant",
        content=result["answer"],
        latency_ms=int(result.get("latency_ms", 0)),
        tool_calls=result.get("tool_calls", []),
        is_flagged=result.get("is_flagged", False)
    )
    db.add(asst_msg)

    # Update conversation status if escalated
    if result.get("should_escalate"):
        conv.status = "escalated"
    conv.intent_summary = result.get("intent")
    db.commit()

    return ChatResponse(
        session_id=session_id,
        answer=result["answer"],
        intent=result["intent"],
        should_escalate=result["should_escalate"],
        latency_ms=result["latency_ms"]
    )

@router.get("/conversations", response_model=List[ConversationSummaryResponse])
def get_conversations(project_id: Optional[str] = None, db: Session = Depends(get_db), ctx: TenantContext = Depends(get_tenant_context)):
    """Retrieve conversation history scoped by user role"""
    query = db.query(Conversation)
    if not ctx.is_super_admin():
        query = query.filter(Conversation.org_id == ctx.org_id)

    if project_id:
        query = query.filter(Conversation.project_id == project_id)

    convs = query.order_by(Conversation.start_time.desc()).all()
    res = []
    for c in convs:
        res.append(ConversationSummaryResponse(
            id=c.id, org_id=c.org_id, project_id=c.project_id, session_id=c.session_id,
            channel=c.channel, status=c.status, intent_summary=c.intent_summary,
            start_time=c.start_time.isoformat()
        ))
    return res

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageDetailResponse])
def get_conversation_messages(conversation_id: str, db: Session = Depends(get_db), ctx: TenantContext = Depends(get_tenant_context)):
    """Retrieve detailed message transcript for a conversation"""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or not ctx.can_access_org(conv.org_id):
        raise HTTPException(status_code=403, detail="Unauthorized access to conversation")

    msgs = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    return [
        MessageDetailResponse(
            id=m.id, sender_type=m.sender_type, content=m.content,
            tokens_used=m.tokens_used, latency_ms=m.latency_ms, created_at=m.created_at.isoformat()
        ) for m in msgs
    ]
