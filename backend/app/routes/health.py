"""Health and provider-info endpoints.

These are the only routes that may be called before an API key is configured,
so the frontend can still render its status indicator and settings screen.
"""

from __future__ import annotations

from fastapi import APIRouter

from .. import __version__
from ..config import settings
from ..models import HealthResponse, ProviderInfoResponse
from ..services.providers.registry import SUPPORTED_PROVIDERS

router = APIRouter(tags=["system"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend health check",
)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        provider=settings.ai_provider,
        provider_display_name=settings.provider_display_name,
        model=settings.current_model,
        configured=settings.is_provider_configured(),
        version=__version__,
        max_message_length=settings.max_message_length,
    )


@router.get(
    "/provider",
    response_model=ProviderInfoResponse,
    summary="Active AI provider details (never includes the API key)",
)
async def provider_info() -> ProviderInfoResponse:
    return ProviderInfoResponse(
        provider=settings.ai_provider,
        provider_display_name=settings.provider_display_name,
        model=settings.current_model,
        configured=settings.is_provider_configured(),
        supported_providers=list(SUPPORTED_PROVIDERS),
        max_message_length=settings.max_message_length,
        app_name=settings.app_name,
        version=__version__,
    )


__all__ = ["router"]
