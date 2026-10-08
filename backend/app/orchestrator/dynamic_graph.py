import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Project, ProjectConfig, ApiIntegration, KnowledgeDoc
from app.core.guardrails import GuardrailsEngine
from app.orchestrator.dynamic_tools import DynamicToolFactory
from app.orchestrator.rag_service import PerProjectRAGService

logger = logging.getLogger(__name__)

class ProjectOrchestratorState(dict):
    """LangGraph State Container for multi-tenant sessions"""

class DynamicOrchestrator:
    """
    Config-Driven Multi-Tenant Orchestrator:
    Loads project config, enabled dynamic tools, and KB collection at runtime.
    Executes two-pass guardrailed processing.
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
            self.system_prompt = "You are a helpful BFSI Intelligent Agent."
            self.guardrails = {"blocked_topics": [], "required_disclaimers": [], "pii_masking": True}
            self.agent_settings = {"llm_model": "gpt-4o-mini"}
            self.voice_settings = {}
        else:
            self.system_prompt = self.config.system_prompt
            self.guardrails = self.config.guardrails or {}
            self.agent_settings = self.config.agent_settings or {}
            self.voice_settings = self.config.voice_settings or {}

        # 2. Build dynamic tools from DB integrations
        integrations = db.query(ApiIntegration).filter(
            ApiIntegration.project_id == project_id,
            ApiIntegration.is_enabled == True
        ).all()
        self.dynamic_tools = DynamicToolFactory.build_tools_for_project(integrations)

    async def process_turn(self, user_query: str, session_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Execute full dynamic session turn with two-pass guardrails
        """
        session_history = session_history or []
        start_time = datetime.utcnow()

        # PASS 1: INPUT PRE-CHECK GUARDRAIL
        is_blocked, processed_query, block_reason = GuardrailsEngine.pre_check_input(
            user_query, self.guardrails
        )

        if is_blocked:
            blocked_response = "I apologize, but I cannot assist with this request as it pertains to restricted topics."
            final_resp, should_escalate, esc_reason = GuardrailsEngine.post_check_output(
                blocked_response, self.guardrails, sentiment="neutral"
            )
            return {
                "answer": final_resp,
                "intent": "blocked_input",
                "tool_calls": [],
                "is_flagged": True,
                "should_escalate": should_escalate,
                "latency_ms": 10.0
            }

        # PASS 2: INTENT ROUTING & DYNAMIC TOOL / RAG EXECUTION
        intent = "general_query"
        tool_calls = []
        raw_response = ""

        # Check per-project RAG KB
        kb_results = PerProjectRAGService.query_project_kb(self.project_id, processed_query)
        kb_context = "\n".join([f"- {item['text']}" for item in kb_results]) if kb_results else ""

        # Check for dynamic tool matches (e.g. balance check, card block, loan)
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
            
            if tool_res.get("status") == "success":
                raw_response = f"Successfully processed {executed_tool['name']} request: {tool_res.get('data')}"
            else:
                raw_response = f"Attempted {executed_tool['name']}, but external service returned error: {tool_res.get('data')}"
        elif kb_context:
            intent = f"{self.project.domain}_faq"
            raw_response = f"Based on knowledge base:\n{kb_context}"
        else:
            intent = f"{self.project.domain}_support"
            raw_response = f"Thank you for contacting our {self.project.domain.title()} service. How can I assist you further?"

        # PASS 3: OUTPUT POST-CHECK GUARDRAIL
        final_response, should_escalate, esc_reason = GuardrailsEngine.post_check_output(
            raw_response, self.guardrails, sentiment="neutral"
        )

        return {
            "answer": final_response,
            "intent": intent,
            "tool_calls": tool_calls,
            "is_flagged": False,
            "should_escalate": should_escalate,
            "latency_ms": 45.0
        }
