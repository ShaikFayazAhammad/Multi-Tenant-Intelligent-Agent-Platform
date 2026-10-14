import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Project, ProjectConfig, ApiIntegration, KnowledgeDoc
from app.core.guardrails import GuardrailsEngine
from app.orchestrator.dynamic_tools import DynamicToolFactory
from app.orchestrator.rag_service import PerProjectRAGService
from app.services.llm_service import llm

logger = logging.getLogger(__name__)

class ProjectOrchestratorState(dict):
    """LangGraph State Container for multi-tenant sessions"""

class DynamicOrchestrator:
    """
    Config-Driven Multi-Tenant Orchestrator:
    Loads project config, enabled dynamic tools, and KB collection at runtime.
    Executes real OpenRouter LLM calls with two-pass guardrails and RAG context grounding.
    """

    def __init__(self, project_id: str, db: Session):
        self.project_id = project_id
        self.db = db

        # 1. Load project and config from DB
        self.project = db.query(Project).filter(Project.id == project_id).first()
        if not self.project:
            raise ValueError(f"Project not found: {project_id}")

        self.config = db.query(ProjectConfig).filter(ProjectConfig.project_id == project_id).first()
        if not self.config:
            # Fallback default config
            self.system_prompt = "You are a professional BFSI Intelligent Agent. Provide helpful, accurate, and concise assistance."
            self.guardrails = {"blocked_topics": [], "required_disclaimers": [], "pii_masking": True}
            self.agent_settings = {"llm_model": "google/gemini-2.0-flash-001", "temperature": 0.2, "max_tokens": 1000}
            self.voice_settings = {}
        else:
            self.system_prompt = self.config.system_prompt or "You are a professional BFSI Intelligent Agent."
            self.guardrails = self.config.guardrails or {}
            self.agent_settings = self.config.agent_settings or {}
            self.voice_settings = self.config.voice_settings or {}

        # 2. Build dynamic tools from DB integrations
        integrations = db.query(ApiIntegration).filter(
            ApiIntegration.project_id == project_id,
            ApiIntegration.is_enabled == True
        ).all()
        self.dynamic_tools = DynamicToolFactory.build_tools_for_project(integrations)

    async def process_turn(
        self,
        user_query: str,
        session_history: List[Dict[str, str]] = None,
        is_playground: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute full dynamic session turn with two-pass guardrails and real OpenRouter LLM.
        """
        session_history = session_history or []
        start_time = time.time()

        # AGENT LIFECYCLE STATUS GATE (Only Live agents answer client queries)
        status_val = (self.project.status or "Draft").strip()
        # Treat legacy "active" as "Live"
        is_live = status_val.lower() in ["live", "active"]

        if not is_live and not is_playground:
            status_label = "Paused for maintenance" if status_val.lower() == "paused" else "in Draft mode"
            notice = f"⚠️ Notice: Agent '{self.project.name}' is currently {status_label} and unavailable for live inquiries."
            return {
                "answer": notice,
                "intent": "agent_inactive",
                "tool_calls": [],
                "rag_passages": [],
                "tokens_used": 0,
                "model_used": "none",
                "is_flagged": False,
                "should_escalate": False,
                "latency_ms": 5.0,
            }

        # PASS 1: INPUT PRE-CHECK GUARDRAIL
        is_blocked, processed_query, block_reason = GuardrailsEngine.pre_check_input(
            user_query, self.guardrails
        )

        if is_blocked:
            blocked_response = (
                f"I apologize, but I cannot assist with this request as it pertains to restricted topics. "
                f"({block_reason or 'Policy restriction'})"
            )
            final_resp, should_escalate, esc_reason = GuardrailsEngine.post_check_output(
                blocked_response, self.guardrails, sentiment="neutral"
            )
            return {
                "answer": final_resp,
                "intent": "blocked_input",
                "tool_calls": [],
                "rag_passages": [],
                "tokens_used": 0,
                "model_used": "guardrail_filter",
                "is_flagged": True,
                "should_escalate": should_escalate,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }

        # PASS 2: RAG VECTOR STORE QUERY & DYNAMIC TOOL EXECUTION
        intent = "general_query"
        tool_calls = []
        tool_context_str = ""

        # Retrieve isolated per-project RAG KB context
        kb_results_raw = PerProjectRAGService.query_project_kb(self.project_id, processed_query, top_k=5)
        
        # Filter by relevance: Chroma L2 distance — lower is better; discard passages with distance > 1.5
        kb_results = [item for item in kb_results_raw if item.get('score', 99) < 1.5]
        
        logger.info(
            f"[Orchestrator] Project={self.project_id} RAG query='{processed_query[:80]}' "
            f"raw_results={len(kb_results_raw)} filtered_relevant={len(kb_results)}"
        )
        if kb_results:
            for i, item in enumerate(kb_results):
                logger.info(f"  [RAG #{i}] file={item.get('filename')} score={item.get('score')} text={item['text'][:100]}...")
        else:
            logger.warning(f"[Orchestrator] No relevant KB passages found for project={self.project_id}. "
                           f"Check that documents have been uploaded and indexed in Chroma.")
        
        kb_context = "\n".join([f"- [{item.get('filename','doc')}]: {item['text']}" for item in kb_results]) if kb_results else ""

        # Check for dynamic tool matches
        query_lower = processed_query.lower()
        executed_tool = None

        for tool_key, tool_info in self.dynamic_tools.items():
            tool_name_words = tool_key.replace("_", " ").split()
            if any(w in query_lower for w in tool_name_words if len(w) > 3):
                executed_tool = tool_info
                break

        if executed_tool:
            intent = executed_tool["name"]
            tool_res = await executed_tool["executor"]()
            tool_calls.append({"tool": executed_tool["name"], "result": tool_res})
            tool_context_str = f"API Tool Result ({executed_tool['name']}): {tool_res.get('data')}"

        # Combine system prompt with instructions and tool output if present
        prompt_with_instructions = self.system_prompt
        if tool_context_str:
            prompt_with_instructions += f"\n\n[EXTERNAL API TOOL DATA]\n{tool_context_str}\nIncorporate this tool result into your reply."

        # PASS 3: REAL OPENROUTER LLM CALL
        # Format chat history
        formatted_messages = []
        for h in session_history[-4:]:
            if "role" in h and "content" in h:
                formatted_messages.append({"role": h["role"], "content": h["content"]})
        formatted_messages.append({"role": "user", "content": processed_query})

        model_name = self.agent_settings.get("llm_model") or "google/gemini-2.0-flash-001"
        temp = float(self.agent_settings.get("temperature", 0.2))
        max_tok = int(self.agent_settings.get("max_tokens", 1000))

        logger.info(
            f"[Orchestrator] Calling LLM model={model_name} temp={temp} max_tokens={max_tok} "
            f"kb_context_len={len(kb_context)} tool_context={bool(tool_context_str)}"
        )

        llm_response = llm.chat(
            system_prompt=prompt_with_instructions,
            messages=formatted_messages,
            model=model_name,
            temperature=temp,
            max_tokens=max_tok,
            rag_context=kb_context,
        )

        raw_answer = llm_response.get("answer", "")
        tokens_used = llm_response.get("tokens_used", 0)
        model_used = llm_response.get("model_used", model_name)

        if kb_results and intent == "general_query":
            intent = f"{self.project.domain}_rag_faq"

        # PASS 4: OUTPUT POST-CHECK GUARDRAIL
        final_response, should_escalate, esc_reason = GuardrailsEngine.post_check_output(
            raw_answer, self.guardrails, sentiment="neutral"
        )

        latency_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "answer": final_response,
            "intent": intent,
            "tool_calls": tool_calls,
            "rag_passages": kb_results,
            "tokens_used": tokens_used,
            "model_used": model_used,
            "is_flagged": False,
            "should_escalate": should_escalate,
            "latency_ms": latency_ms,
        }

