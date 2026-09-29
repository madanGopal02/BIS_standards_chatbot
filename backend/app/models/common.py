"""Shared Pydantic response models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str = Field(
        ...,
        description="Stable machine readable error code the frontend can map.",
        examples=["provider_not_configured"],
    )
    message: str = Field(
        ...,
        description="Human readable, user safe message.",
        examples=["AI service is not configured. Please add your API key to the backend .env file."],
    )


class ErrorResponse(BaseModel):
    """Every failure is returned in this shape. Never includes stack traces."""

    error: ErrorBody


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["ok"])
    provider: str = Field(..., examples=["groq"])
    provider_display_name: str = Field(..., examples=["Groq"])
    model: str = Field(..., examples=["llama-3.3-70b-versatile"])
    configured: bool = Field(
        ...,
        description="True when the active provider has an API key configured.",
    )
    version: str = Field(..., examples=["1.0.0"])
    max_message_length: int = Field(..., examples=[5000])


class ProviderInfoResponse(BaseModel):
    """Secret-free provider details for the Settings screen."""

    provider: str
    provider_display_name: str
    model: str
    configured: bool
    supported_providers: list[str]
    max_message_length: int
    app_name: str
    version: str
    notice: str = (
        "Provider details are read from the backend .env file. "
        "API keys are never sent to the browser."
    )


class ClearResponse(BaseModel):
    ok: bool = True
    message: str = "Cleared."


def error_body(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, **extra}}


__all__ = [
    "ClearResponse",
    "ErrorBody",
    "ErrorResponse",
    "HealthResponse",
    "ProviderInfoResponse",
    "error_body",
]
