"""Service layer: AI orchestration, providers, prompts, conversation memory."""

from .ai_service import generate_response, new_conversation_id
from .prompts import BIS_SYSTEM_PROMPT

__all__ = ["BIS_SYSTEM_PROMPT", "generate_response", "new_conversation_id"]
