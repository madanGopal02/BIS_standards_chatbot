"""Request / response models for the chat endpoint."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .common import ErrorResponse

HistoryRole = Literal["user", "assistant"]


class HistoryMessage(BaseModel):
    """One previous turn sent by the client for conversational context."""

    role: HistoryRole
    content: str = Field(..., max_length=20000)

    @field_validator("content")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class ChatRequest(BaseModel):
    """`POST /api/chat` request body."""

    message: str = Field(
        ...,
        description="The user's question.",
        examples=["What is IS 456?"],
    )
    conversation_id: str | None = Field(
        default=None,
        max_length=128,
        description="Client generated id so the backend can keep context.",
    )
    history: list[HistoryMessage] = Field(
        default_factory=list,
        max_length=40,
        description="Recent turns from this conversation (optional).",
    )

    @field_validator("message")
    @classmethod
    def _clean_message(cls, value: str) -> str:
        return value if isinstance(value, str) else ""

    @field_validator("conversation_id")
    @classmethod
    def _clean_conversation_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ChatResponse(BaseModel):
    """`POST /api/chat` success body."""

    answer: str
    conversation_id: str
    provider: str
    provider_display_name: str
    model: str
    disclaimer: str


__all__ = [
    "ChatRequest",
    "ChatResponse",
    "ErrorResponse",
    "HistoryMessage",
    "HistoryRole",
]
