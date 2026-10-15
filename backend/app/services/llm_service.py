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
    """OpenAI-compatible client wired to OpenRouter base URL with streaming support"""

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )
        self.default_model = settings.OPENROUTER_DEFAULT_MODEL or "meta-llama/llama-3.1-8b-instruct"
        self.fallback_models = [
            "meta-llama/llama-3.1-8b-instruct",
            "google/gemini-2.5-flash",
        ]

    def _prepare_messages(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        rag_context: Optional[str] = None
    ) -> List[Dict[str, str]]:
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

        return [{"role": "system", "content": effective_system}] + messages

    def _get_candidate_models(self, requested_model: Optional[str] = None) -> List[str]:
        models_to_try = []
        if requested_model and requested_model not in ["gpt-4o-mini", "default", "google/gemini-2.0-flash-001"]:
            models_to_try.append(requested_model)
        else:
            models_to_try.append(self.default_model)

        for fb in self.fallback_models:
            if fb not in models_to_try:
                models_to_try.append(fb)
        return models_to_try

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
        Execute a standard chat completion via OpenRouter.
        Returns dict with: answer, tokens_used, latency_ms, model_used, success
        """
        if not self.client.api_key:
            self.client.api_key = settings.OPENROUTER_API_KEY

        full_messages = self._prepare_messages(system_prompt, messages, rag_context)
        safe_max_tokens = min(max_tokens if max_tokens and max_tokens > 0 else 1024, 1500)
        models_to_try = self._get_candidate_models(model)

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

    def chat_stream(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        rag_context: Optional[str] = None,
    ):
        """
        Execute a streaming chat completion via OpenRouter.
        Yields chunk dicts:
          - {"type": "token", "payload": delta_text}
          - {"type": "complete", "answer": full_text, "latency_ms": ms, "model_used": model, "tokens_used": est}
          - {"type": "error", "answer": err_msg, "latency_ms": ms, "model_used": "none"}
        """
        if not self.client.api_key:
            self.client.api_key = settings.OPENROUTER_API_KEY

        full_messages = self._prepare_messages(system_prompt, messages, rag_context)
        safe_max_tokens = min(max_tokens if max_tokens and max_tokens > 0 else 1024, 1500)
        models_to_try = self._get_candidate_models(model)

        start = time.time()
        last_error = None

        for target_model in models_to_try:
            try:
                logger.info(f"[OpenRouter Stream] Initiating stream for model: {target_model}")
                stream = self.client.chat.completions.create(
                    model=target_model,
                    messages=full_messages,
                    temperature=temperature,
                    max_tokens=safe_max_tokens,
                    stream=True,
                    extra_headers={
                        "HTTP-Referer": "https://bfsi-platform.ai",
                        "X-Title": "BFSI Multi-Tenant Agent Platform",
                    },
                )

                accumulated: List[str] = []
                for chunk in stream:
                    delta = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                    if delta:
                        accumulated.append(delta)
                        yield {"type": "token", "payload": delta}

                full_answer = "".join(accumulated)
                latency_ms = round((time.time() - start) * 1000, 2)
                # Approximate token count: ~4 chars per token
                approx_tokens = max(len(full_answer) // 4, len(accumulated))
                logger.info(f"[OpenRouter Stream] SUCCESS model={target_model} tokens~={approx_tokens} latency={latency_ms}ms")

                yield {
                    "type": "complete",
                    "answer": full_answer,
                    "tokens_used": approx_tokens,
                    "latency_ms": latency_ms,
                    "model_used": target_model,
                    "success": True,
                }
                return

            except Exception as e:
                logger.warning(f"[OpenRouter Stream] Model {target_model} stream failed: {e}")
                last_error = e
                continue

        latency_ms = round((time.time() - start) * 1000, 2)
        err_msg = str(last_error) if last_error else "All streaming models failed"
        logger.error(f"[OpenRouter Stream] All models failed. Error: {err_msg}")
        yield {
            "type": "error",
            "answer": f"I apologize, but our AI service is momentarily unavailable. ({err_msg[:90]})",
            "latency_ms": latency_ms,
            "model_used": models_to_try[0] if models_to_try else "none",
            "success": False,
        }


# Singleton instance
llm = OpenRouterLLM()

