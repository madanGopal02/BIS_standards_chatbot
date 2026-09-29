"""Provider registry.

Maps `AI_PROVIDER` from the environment to a concrete provider instance.
This is the ONLY place that knows which provider classes exist.
"""

from __future__ import annotations

from ...config import settings
from ..errors import (
    CODE_PROVIDER_NOT_CONFIGURED,
    ProviderError,
)
from .base import AIProvider
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider
from .openai_provider import OpenAIProvider

PROVIDERS: dict[str, type[AIProvider]] = {
    GroqProvider.name: GroqProvider,
    OpenAIProvider.name: OpenAIProvider,
    GeminiProvider.name: GeminiProvider,
}

SUPPORTED_PROVIDERS = tuple(PROVIDERS)


def get_provider(name: str | None = None) -> AIProvider:
    """Return a ready-to-use provider instance.

    Raises `ProviderError` with the `provider_not_configured` code when the
    selected provider has no API key, so the frontend can show the exact
    "add your key to .env" message.
    """
    provider_name = (name or settings.ai_provider).lower()
    provider_class = PROVIDERS.get(provider_name)

    if provider_class is None:
        raise ProviderError(
            f"AI_PROVIDER '{provider_name}' is not supported. "
            f"Use one of: {', '.join(SUPPORTED_PROVIDERS)}.",
            code=CODE_PROVIDER_NOT_CONFIGURED,
            detail=f"unknown provider: {provider_name}",
        )

    api_key = settings.api_keys.get(provider_name, "")
    if not api_key:
        raise ProviderError(
            "The assistant is not available right now. Please try again later.",
            code=CODE_PROVIDER_NOT_CONFIGURED,
            detail=f"missing {provider_class.env_key}",
        )

    try:
        return provider_class(
            api_key=api_key,
            model=settings.models.get(provider_name, ""),
            timeout=settings.request_timeout,
        )
    except ValueError as exc:
        raise ProviderError(
            "The assistant is not available right now. Please try again later.",
            code=CODE_PROVIDER_NOT_CONFIGURED,
            detail=str(exc),
        ) from exc


__all__ = ["PROVIDERS", "SUPPORTED_PROVIDERS", "get_provider"]
