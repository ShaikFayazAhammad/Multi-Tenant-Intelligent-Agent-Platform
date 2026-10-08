import re
from typing import Dict, Any, List, Tuple

class GuardrailsEngine:
    """
    Two-pass Guardrail Engine:
    1. Input Pre-Check: Blocked topic detection, input PII masking.
    2. Output Post-Check: Output PII masking, disclaimer enforcement, escalation rules.
    """

    @staticmethod
    def pre_check_input(user_input: str, guardrail_config: Dict[str, Any]) -> Tuple[bool, str, str]:
        """
        Run input pre-check.
        Returns: (is_blocked: bool, processed_input: str, block_reason: str)
        """
        if not user_input or not guardrail_config:
            return False, user_input, ""

        blocked_topics = guardrail_config.get("blocked_topics", [])
        input_lower = user_input.lower()

        # 1. Blocked topics check
        for topic in blocked_topics:
            if topic.lower() in input_lower:
                return True, user_input, f"Query matched blocked topic: '{topic}'"

        # 2. PII masking on input (if enabled)
        processed_text = user_input
        if guardrail_config.get("pii_masking", True):
            processed_text = GuardrailsEngine.mask_pii(processed_text)

        return False, processed_text, ""

    @staticmethod
    def post_check_output(assistant_response: str, guardrail_config: Dict[str, Any], sentiment: str = "neutral") -> Tuple[str, bool, str]:
        """
        Run output post-check.
        Returns: (final_response: str, should_escalate: bool, escalation_reason: str)
        """
        if not assistant_response:
            return assistant_response, False, ""

        processed_output = assistant_response
        should_escalate = False
        escalation_reason = ""

        # 1. PII masking on output
        if guardrail_config.get("pii_masking", True):
            processed_output = GuardrailsEngine.mask_pii(processed_output)

        # 2. Required disclaimers
        disclaimers = guardrail_config.get("required_disclaimers", [])
        if disclaimers:
            disclaimer_text = "\n\n*Disclaimer: " + " ".join(disclaimers) + "*"
            if disclaimer_text not in processed_output:
                processed_output += disclaimer_text

        # 3. Escalation rules
        escalation_rules = guardrail_config.get("escalation_rules", {})
        if sentiment == "negative" and escalation_rules.get("negative_sentiment_turns"):
            should_escalate = True
            escalation_reason = "Customer negative sentiment detected"

        return processed_output, should_escalate, escalation_reason

    @staticmethod
    def mask_pii(text: str) -> str:
        """Mask emails, phone numbers, and card/account numbers"""
        if not text:
            return text

        # 1. Credit Card / Account Numbers (16 digits)
        text = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[REDACTED_CARD]', text)
        # 2. Emails
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]', text)
        # 3. Phone numbers
        text = re.sub(r'\+?\d{2,4}[-.\s]\d{3,4}[-.\s]\d{4}\b', '[REDACTED_PHONE]', text)

        return text
