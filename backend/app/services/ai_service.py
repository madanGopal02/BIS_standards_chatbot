"""The AI service: the single entry point for generating an answer.

The API route calls `generate_response(...)` and knows nothing about Groq,
OpenAI or Gemini.

Pipeline (MVP)
--------------
    user question
      -> validate & normalise
      -> (retrieval hook, currently a no-op)
      -> BIS system prompt
      -> selected AI provider
      -> answer

Pipeline (future)
-----------------
    user question
      -> query classification
      -> BIS metadata search
      -> vector search
      -> reranking
      -> relevant BIS documents + citations
      -> LLM
      -> answer + citations
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field

from ..config import settings
from .conversation_store import store
from .errors import (
    CODE_EMPTY_MESSAGE,
    CODE_MESSAGE_TOO_LONG,
    AppError,
    ProviderError,
    ValidationError,
)
from .prompts import BIS_SYSTEM_PROMPT
from .providers import Message, get_provider
from .retrieval import build_context_block, get_retriever

logger = logging.getLogger("bis_ai.ai_service")

SYSTEM_ROLE = "system"


@dataclass
class AIResult:
    """What the chat route needs to build its response."""

    answer: str
    conversation_id: str
    provider: str
    provider_display_name: str
    model: str
    retrieval_used: bool = False
    context: str = ""
    metadata: dict[str, object] = field(default_factory=dict)


def new_conversation_id() -> str:
    return uuid.uuid4().hex


# ---------------------------------------------------------------------------
# Input handling
# ---------------------------------------------------------------------------
def normalise_question(raw_message: str) -> str:
    """Validate and clean the user message.

    Raises `AppError` subclasses so the route can return precise status codes.
    """
    if not isinstance(raw_message, str):
        raise ValidationError("The message must be text.")

    message = raw_message.strip()
    if not message:
        raise AppError(
            "Please type a question before sending.",
            code=CODE_EMPTY_MESSAGE,
            status_code=400,
        )
    if len(message) > settings.max_message_length:
        raise AppError(
            f"Your message is too long. Please keep it under "
            f"{settings.max_message_length} characters.",
            code=CODE_MESSAGE_TOO_LONG,
            status_code=413,
        )
    return message


def _clean_history(history: list[Message] | None) -> list[Message]:
    """Keep the last N user/assistant turns, newest last, within limits."""
    if not history:
        return []

    cleaned: list[Message] = []
    for turn in history:
        role = (turn.get("role") or "").lower()
        content = (turn.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        if len(content) > settings.max_message_length:
            content = content[: settings.max_message_length]
        cleaned.append({"role": role, "content": content})

    limit = max(0, settings.max_history_messages)
    if limit and len(cleaned) > limit:
        cleaned = cleaned[-limit:]
    return cleaned


def build_system_prompt(retrieved_context: str = "") -> str:
    """System prompt + (future) retrieved context."""
    if not retrieved_context.strip():
        return BIS_SYSTEM_PROMPT
    return (
        f"{BIS_SYSTEM_PROMPT}\n\n"
        "The following excerpts were retrieved from a reference library. Use "
        "them when they are relevant, cite them by their reference, and never "
        "invent sources that are not listed here.\n\n"
        f"{retrieved_context}"
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def generate_response(
    message: str,
    conversation_id: str | None = None,
    history: list[Message] | None = None,
) -> AIResult:
    """Generate an assistant answer for `message`.

    `history` (optional) is the recent conversation sent by the client. When it
    is absent the in-memory conversation store is used instead.
    """
    question = normalise_question(message)
    conversation_id = (conversation_id or "").strip() or new_conversation_id()

    client_history = _clean_history(history)
    if client_history:
        context_messages = client_history
    else:
        context_messages = store.get(conversation_id)

    # The client owns the transcript, so the same question can arrive twice
    # (regenerate / resend). Never repeat it inside the context.
    if context_messages and context_messages[-1] == {"role": "user", "content": question}:
        context_messages = context_messages[:-1]
    elif (
        len(context_messages) >= 2
        and context_messages[-1]["role"] == "assistant"
        and context_messages[-2] == {"role": "user", "content": question}
    ):
        # The previous answer to this exact question is being replaced.
        context_messages = context_messages[:-2]

    conversation: list[Message] = [
        *context_messages,
        {"role": "user", "content": question},
    ]

    # Stage 1 (future): retrieve supporting BIS material. Today: always empty.
    retrieval = get_retriever().retrieve(question)
    retrieved_context = build_context_block(retrieval)

    provider = get_provider()
    system_prompt = build_system_prompt(retrieved_context)

    started_at = time.perf_counter()
    try:
        answer = provider.generate(
            system_prompt=system_prompt,
            messages=conversation,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
        )
    except ProviderError:
        # Never log the question itself.
        logger.error(
            "provider=%s failed while generating a response (%s)",
            provider.name,
            "error",
        )
        raise

    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    used_model = getattr(provider, "used_model", provider.model)
    # Metadata only: no user content, no secrets.
    logger.info(
        "provider=%s model=%s history=%d context=%s duration_ms=%d",
        provider.name,
        used_model,
        len(context_messages),
        "yes" if retrieved_context else "no",
        elapsed_ms,
    )

    store.append(conversation_id, (question, answer))

    return AIResult(
        answer=answer,
        conversation_id=conversation_id,
        provider=provider.name,
        provider_display_name=provider.display_name,
        model=used_model,
        retrieval_used=not retrieval.is_empty,
        context=retrieved_context,
        metadata={"duration_ms": elapsed_ms},
    )


__all__ = [
    "AIResult",
    "build_system_prompt",
    "generate_response",
    "new_conversation_id",
    "normalise_question",
]
