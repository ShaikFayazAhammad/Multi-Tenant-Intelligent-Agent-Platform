"""
OpenRouter LLM Service
Uses OpenAI-compatible SDK pointed at OpenRouter's API (https://openrouter.ai/api/v1).
Configured with OPENROUTER_API_KEY.
Primary cheap models:
- google/gemini-2.0-flash-001 / google/gemini-2.5-flash (~$0.10 / 1M tokens)
- meta-llama/llama-3.1-8b-instruct (zero-cost / ultra-cheap fallback)
"""
import logging
import time
from typing import List, Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterLLM:
    """OpenAI-compatible client wired to OpenRouter base URL"""

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )
        self.default_model = settings.OPENROUTER_DEFAULT_MODEL
        self.fallback_models = [
            "google/gemini-2.5-flash",
            "meta-llama/llama-3.1-8b-instruct",
            "meta-llama/llama-3.1-8b-instruct:free",
        ]

    def chat(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        rag_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute a chat completion via OpenRouter.
        Returns dict with: answer, tokens_used, latency_ms, model_used, success
        """
        # Ensure fresh client with current key
        if not self.client.api_key:
            self.client.api_key = settings.OPENROUTER_API_KEY

        effective_system = system_prompt
        if rag_context and rag_context.strip():
            effective_system = (
                f"{system_prompt}\n\n"
                f"=== RETRIEVED KNOWLEDGE BASE CONTEXT (PRIMARY SOURCE) ===\n"
                f"{rag_context.strip()}\n"
                f"==========================================================\n\n"
                f"CRITICAL INSTRUCTIONS FOR ANSWERING:\n"
                f"1. You MUST use the RETRIEVED KNOWLEDGE BASE CONTEXT above as your PRIMARY source of truth when answering the user's question.\n"
                f"2. If the knowledge base context contains information relevant to the user's question, base your answer on that context FIRST.\n"
                f"3. Quote or reference specific details from the knowledge base when applicable.\n"
                f"4. If the knowledge base context does not contain relevant information for the specific question, you may use your general knowledge, but clearly indicate this.\n"
                f"5. Do NOT ignore or skip over the knowledge base context. It represents curated, organization-specific information that takes priority over general knowledge."
            )
            logger.info(f"[LLM] RAG context injected into system prompt ({len(rag_context)} chars)")

        # Build full message list with system prompt
        full_messages = [{"role": "system", "content": effective_system}] + messages

        # Cap max_tokens to prevent 402 OpenRouter budget errors on high-context models
        safe_max_tokens = min(max_tokens if max_tokens and max_tokens > 0 else 1024, 1500)

        # Determine models to try in sequence
        models_to_try = []
        if model and model not in ["gpt-4o-mini", "default"]:
            models_to_try.append(model)
        else:
            models_to_try.append(self.default_model)

        for fb in self.fallback_models:
            if fb not in models_to_try:
                models_to_try.append(fb)

        start = time.time()
        last_error = None

        for target_model in models_to_try:
            try:
                logger.info(f"[OpenRouter] Invoking model: {target_model}")
                response = self.client.chat.completions.create(
                    model=target_model,
                    messages=full_messages,
                    temperature=temperature,
                    max_tokens=safe_max_tokens,
                    extra_headers={
                        "HTTP-Referer": "https://bfsi-platform.ai",
                        "X-Title": "BFSI Multi-Tenant Agent Platform",
                    },
                )
                answer = response.choices[0].message.content or ""
                tokens = response.usage.total_tokens if response.usage else 0
                latency_ms = round((time.time() - start) * 1000, 2)
                logger.info(f"[OpenRouter] SUCCESS model={target_model} tokens={tokens} latency={latency_ms}ms")
                return {
                    "answer": answer,
                    "tokens_used": tokens,
                    "latency_ms": latency_ms,
                    "model_used": target_model,
                    "success": True,
                }
            except Exception as e:
                logger.warning(f"[OpenRouter] Model {target_model} attempt failed: {e}")
                last_error = e
                continue

        latency_ms = round((time.time() - start) * 1000, 2)
        err_msg = str(last_error) if last_error else "All configured models failed"
        logger.error(f"[OpenRouter] All models exhausted. Final error: {err_msg}")
        return {
            "answer": f"I apologize, but our AI service is momentarily unavailable. ({err_msg[:90]})",
            "tokens_used": 0,
            "latency_ms": latency_ms,
            "model_used": models_to_try[0] if models_to_try else "none",
            "success": False,
        }


# Singleton instance
llm = OpenRouterLLM()

