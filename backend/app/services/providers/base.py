"""Provider abstraction.

Every AI provider implements `AIProvider`. The rest of the application only
ever talks to this interface, so adding a provider (or swapping SDKs) never
touches the API routes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Literal

Role = Literal["user", "assistant"]

Message = dict[str, str]


class AIProvider(ABC):
    """Minimal contract every provider must satisfy."""

    name: str = ""
    display_name: str = ""
    env_key: str = ""

    def __init__(self, api_key: str, model: str, timeout: int = 60) -> None:
        if not api_key:
            raise ValueError(f"{self.display_name}: API key is required")
        self.api_key = api_key
        self.model = model
        # The model that actually answered the last request. It differs from
        # `model` when a provider had to fall back to another one, and it is
        # what the API reports back to the client.
        self.used_model = model
        self.timeout = timeout
        self._client = None

    # -- status -----------------------------------------------------------
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def describe(self) -> dict[str, str | bool]:
        return {
            "provider": self.name,
            "provider_display_name": self.display_name,
            "model": self.model,
            "configured": self.is_configured(),
        }

    # -- generation --------------------------------------------------------
    @abstractmethod
    def generate(
        self,
        *,
        system_prompt: str,
        messages: list[Message],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Return the assistant text for the given conversation.

        Must raise `services.errors.ProviderError` (or a subclass) on failure.
        """
        raise NotImplementedError

    # -- helpers -----------------------------------------------------------
    @staticmethod
    def _require_text(text: str | None, fallback: str) -> str:
        cleaned = (text or "").strip()
        if not cleaned:
            from ..errors import (
                CODE_EMPTY_RESPONSE,
                ProviderError,
            )

            raise ProviderError(
                fallback,
                code=CODE_EMPTY_RESPONSE,
                detail="provider returned an empty completion",
            )
        return cleaned


__all__ = ["AIProvider", "Message", "Role"]
