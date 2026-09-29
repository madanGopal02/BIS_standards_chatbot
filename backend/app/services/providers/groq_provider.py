"""Groq provider (OpenAI-compatible chat completions API)."""

from __future__ import annotations

from ..errors import classify_provider_exception
from .base import AIProvider, Message


class GroqProvider(AIProvider):
    name = "groq"
    display_name = "Groq"
    env_key = "GROQ_API_KEY"

    def _get_client(self):
        if self._client is None:
            from groq import Groq

            self._client = Groq(api_key=self.api_key, timeout=self.timeout)
        return self._client

    def generate(
        self,
        *,
        system_prompt: str,
        messages: list[Message],
        temperature: float,
        max_tokens: int,
    ) -> str:
        payload: list[Message] = [{"role": "system", "content": system_prompt}]
        payload.extend(messages)

        try:
            response = self._get_client().chat.completions.create(
                model=self.model,
                messages=payload,  # type: ignore[arg-type]
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=self.timeout,
            )
        except Exception as exc:  # noqa: BLE001 - normalised below
            raise classify_provider_exception(exc) from exc

        try:
            text = response.choices[0].message.content
        except (AttributeError, IndexError, KeyError, TypeError) as exc:
            raise classify_provider_exception(
                TypeError("malformed_response")
            ) from exc

        return self._require_text(
            text,
            "The AI provider returned an empty response. Please try again.",
        )


__all__ = ["GroqProvider"]
