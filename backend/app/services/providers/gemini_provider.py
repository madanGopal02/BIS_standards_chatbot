"""Google Gemini provider using the current `google-genai` SDK.

Two real-world problems are handled here:

1. **Model names go stale.** Google retires model ids (`gemini-2.5-flash` now
   answers `404 NOT_FOUND`), and newly created keys are refused by older ids.
   When the configured model cannot serve a request, the provider transparently
   falls back to a small list of known-good models instead of failing.
2. **Thinking models eat the token budget.** `gemini-3.x` spends part of
   `max_output_tokens` on internal reasoning, so a small budget can return an
   *empty* body. The thinking budget is therefore pinned to a small value and
   `max_output_tokens` is given headroom.
"""

from __future__ import annotations

import logging

from ..errors import ProviderError, classify_provider_exception
from .base import AIProvider, Message

logger = logging.getLogger("bis_ai.providers.gemini")

# Tried in order when the configured model cannot serve the request.
# Verified against the live `models` endpoint for the current key: the
# flash-lite alias answers in ~1s and the 3-flash preview in ~2s, while the
# other ids return 404/503/504.
FALLBACK_MODELS: tuple[str, ...] = (
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
)

# Internal reasoning tokens reserved for thinking models. The remaining part of
# `max_output_tokens` is what the user actually reads.
THINKING_BUDGET = 512

# Smallest number of tokens guaranteed for the visible answer.
MIN_ANSWER_TOKENS = 512

# Never spend more than this on a single completion, no matter what the .env
# asks for, so a huge `AI_MAX_TOKENS` cannot silently truncate the answer.
MAX_OUTPUT_TOKENS_CEILING = 8192


class GeminiProvider(AIProvider):
    name = "gemini"
    display_name = "Google Gemini"
    env_key = "GEMINI_API_KEY"

    def _get_client(self):
        if self._client is None:
            from google import genai

            self._client = genai.Client(api_key=self.api_key)
        return self._client

    # -- model selection ---------------------------------------------------
    def _candidate_models(self) -> list[str]:
        """The configured model first, then the fallbacks, without repeats."""
        ordered = [self.model] if self.model else []
        for fallback in FALLBACK_MODELS:
            if fallback not in ordered:
                ordered.append(fallback)
        return ordered

    @staticmethod
    def _effective_max_tokens(max_tokens: int) -> int:
        """`max_output_tokens` must leave room for the thinking budget.

        The API rejects a request whose `thinking_budget` is not smaller than
        `max_output_tokens`, so a very small `AI_MAX_TOKENS` is lifted to
        `THINKING_BUDGET + MIN_ANSWER_TOKENS`.
        """
        headroom = max(int(max_tokens), THINKING_BUDGET + MIN_ANSWER_TOKENS)
        return min(headroom, MAX_OUTPUT_TOKENS_CEILING)

    # -- request -----------------------------------------------------------
    def _build_config(self, system_prompt: str, temperature: float, max_tokens: int):
        from google.genai import types

        return types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            max_output_tokens=self._effective_max_tokens(max_tokens),
            # `http_options.timeout` is expressed in milliseconds.
            http_options={"timeout": self.timeout * 1000},
            thinking_config=types.ThinkingConfig(thinking_budget=THINKING_BUDGET),
        )

    @staticmethod
    def _build_contents(messages: list[Message]):
        from google.genai import types

        return [
            types.Content(
                role="model" if message["role"] == "assistant" else "user",
                parts=[types.Part(text=message["content"])],
            )
            for message in messages
        ]

    def _request(self, model, config, contents):
        return self._get_client().models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )

    # -- response ----------------------------------------------------------
    @staticmethod
    def _extract_text(response) -> str:
        # A response can be blocked by safety filters, in which case `.text`
        # raises or comes back empty.
        block_reason = getattr(
            getattr(response, "prompt_feedback", None), "block_reason", None
        )
        if block_reason:
            raise ProviderError(
                "The AI provider could not answer this question. "
                "Please rephrase it and try again.",
                detail=f"gemini_blocked:{block_reason}",
            )
        try:
            return response.text
        except ProviderError:
            raise
        except Exception as exc:  # noqa: BLE001 - normalised below
            raise classify_provider_exception(exc) from exc

    def generate(
        self,
        *,
        system_prompt: str,
        messages: list[Message],
        temperature: float,
        max_tokens: int,
    ) -> str:
        config = self._build_config(system_prompt, temperature, max_tokens)
        contents = self._build_contents(messages)

        candidates = self._candidate_models()
        last_error: ProviderError | None = None

        for index, model in enumerate(candidates):
            try:
                response = self._request(model, config, contents)
            except Exception as exc:  # noqa: BLE001 - normalised below
                error = (
                    exc
                    if isinstance(exc, ProviderError)
                    else classify_provider_exception(exc)
                )
                last_error = error

                is_last = index == len(candidates) - 1
                if is_last or not error.is_retryable:
                    raise error from exc

                logger.warning(
                    "gemini model %s failed (%s); retrying with %s",
                    model,
                    error.detail,
                    candidates[index + 1],
                )
                continue

            self.used_model = model
            text = self._extract_text(response)

            return self._require_text(
                text,
                "The AI provider returned an empty response. Please try again.",
            )

        # Unreachable: the loop either returns or raises.
        raise last_error or ProviderError()  # pragma: no cover


__all__ = ["FALLBACK_MODELS", "THINKING_BUDGET", "GeminiProvider"]
