"""Application level error types and safe error classification.

The goal: the frontend must always receive a short, friendly message and a
stable machine readable `code`, while the real cause (including anything
sensitive) stays in the server logs.

API keys are never part of an error message: provider SDK errors are
classified by status code / exception type instead of being echoed back.
"""

from __future__ import annotations

from typing import Any

# --- Error codes shared with the frontend ----------------------------------
CODE_EMPTY_MESSAGE = "empty_message"
CODE_MESSAGE_TOO_LONG = "message_too_long"
CODE_VALIDATION_ERROR = "validation_error"
CODE_PROVIDER_NOT_CONFIGURED = "provider_not_configured"
CODE_INVALID_API_KEY = "invalid_api_key"
CODE_RATE_LIMITED = "rate_limited"
CODE_TIMEOUT = "timeout"
CODE_PROVIDER_UNAVAILABLE = "provider_unavailable"
CODE_MODEL_UNAVAILABLE = "model_unavailable"
CODE_PROVIDER_ERROR = "provider_error"
CODE_EMPTY_RESPONSE = "empty_response"
CODE_INTERNAL_ERROR = "internal_error"

DEFAULT_STATUS_BY_CODE = {
    CODE_EMPTY_MESSAGE: 400,
    CODE_MESSAGE_TOO_LONG: 413,
    CODE_VALIDATION_ERROR: 422,
    CODE_PROVIDER_NOT_CONFIGURED: 503,
    CODE_INVALID_API_KEY: 502,
    CODE_RATE_LIMITED: 429,
    CODE_TIMEOUT: 504,
    CODE_PROVIDER_UNAVAILABLE: 502,
    CODE_MODEL_UNAVAILABLE: 502,
    CODE_PROVIDER_ERROR: 502,
    CODE_EMPTY_RESPONSE: 502,
    CODE_INTERNAL_ERROR: 500,
}

# HTTP statuses a provider may return for conditions that are worth retrying
# with a *different* model (retired model, capacity spike, transient 5xx).
RETRYABLE_HTTP_STATUSES = frozenset({404, 408, 409, 425, 429, 500, 502, 503, 504})


class AppError(Exception):
    """Base class for every error the API returns to the client."""

    code: str = CODE_INTERNAL_ERROR
    status_code: int = 500
    user_message: str = "Something went wrong. Please try again."
    # HTTP status reported by the upstream provider, when known. `None` means
    # "the failure did not come from a provider HTTP response".
    http_status: int | None = None
    # When True the HTTP status is looked up from `DEFAULT_STATUS_BY_CODE`
    # using the code, so a single code always maps to one status.
    derive_status_from_code: bool = False

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        detail: str | None = None,
        http_status: int | None = None,
    ) -> None:
        self.user_message = message or self.user_message
        if code:
            self.code = code
            if status_code is not None or self.derive_status_from_code:
                self.status_code = status_code or DEFAULT_STATUS_BY_CODE.get(
                    code, self.status_code
                )
        if status_code is not None:
            self.status_code = status_code
        self.http_status = http_status
        # `detail` is for the server log only, it never reaches the browser.
        self.detail = detail
        super().__init__(self.user_message)

    @property
    def is_retryable(self) -> bool:
        """True when retrying the same request could plausibly succeed."""
        return self.http_status in RETRYABLE_HTTP_STATUSES


class ValidationError(AppError):
    code = CODE_VALIDATION_ERROR
    status_code = 422
    user_message = "The request could not be processed."


class ProviderError(AppError):
    """Any failure that happened while talking to an AI provider."""

    code = CODE_PROVIDER_ERROR
    status_code = 502
    derive_status_from_code = True
    user_message = "The AI service is temporarily unavailable. Please try again."


def _http_status_of(exc: Exception) -> int | None:
    """Best-effort extraction of the upstream HTTP status from an SDK error.

    OpenAI/Groq expose `status_code` (directly or on `.response`), the Google
    GenAI SDK exposes an integer `code`. Non-integer codes (for example the
    string `invalid_api_key`) are ignored on purpose.
    """
    response = getattr(exc, "response", None)
    for candidate in (
        getattr(exc, "status_code", None),
        getattr(response, "status_code", None),
        getattr(exc, "status", None),
        getattr(exc, "code", None),
    ):
        if isinstance(candidate, int) and 100 <= candidate <= 599:
            return candidate
    return None


def classify_provider_exception(exc: Exception) -> ProviderError:
    """Translate a provider SDK exception into a safe `ProviderError`.

    Works for the OpenAI, Groq and Google GenAI SDKs because they all surface
    an HTTP `status_code` (or a descriptive exception class name) for the same
    underlying conditions.
    """
    import httpx

    class_name = type(exc).__name__
    lowered_class = class_name.lower()
    text = str(exc).lower()

    status_code = _http_status_of(exc)

    # Never log or forward the raw message: it can embed the key or a URL with
    # credentials. Only the type name is kept.
    detail = f"{class_name}(status_code={status_code})"

    if isinstance(exc, (httpx.TimeoutException, TimeoutError)) or "timeout" in lowered_class or "timed out" in text:
        return ProviderError(
            "The AI provider took too long to respond. Please try again.",
            code=CODE_TIMEOUT,
            detail=detail,
            http_status=status_code,
        )

    # 404 almost always means the *model name* is wrong or has been retired
    # (Google, for example, stops serving `gemini-2.5-flash`). Rephrasing the
    # question can never help, so this is a configuration problem.
    if status_code == 404 or "notfound" in lowered_class or "not_found" in lowered_class:
        return ProviderError(
            "The assistant is temporarily unavailable. Please try again.",
            code=CODE_MODEL_UNAVAILABLE,
            detail=detail,
            http_status=status_code,
        )

    if status_code in (401, 403) or "authentication" in lowered_class or "permission" in lowered_class or "unauthorized" in lowered_class:
        return ProviderError(
            "The assistant is not available right now. Please try again later.",
            code=CODE_INVALID_API_KEY,
            detail=detail,
            http_status=status_code,
        )

    if status_code == 429 or "ratelimit" in lowered_class or "quota" in lowered_class or "resource_exhausted" in lowered_class:
        return ProviderError(
            "Too many requests just now. Please wait a moment and try again.",
            code=CODE_RATE_LIMITED,
            detail=detail,
            http_status=status_code,
        )

    if isinstance(exc, (httpx.ConnectError, httpx.NetworkError)) or "connection" in lowered_class:
        return ProviderError(
            "Unable to connect right now. Please try again.",
            code=CODE_PROVIDER_UNAVAILABLE,
            detail=detail,
            http_status=status_code,
        )

    if isinstance(status_code, int) and status_code >= 500:
        return ProviderError(
            "The assistant is temporarily unavailable. Please try again.",
            code=CODE_PROVIDER_UNAVAILABLE,
            detail=detail,
            http_status=status_code,
        )

    if isinstance(status_code, int) and 400 <= status_code < 500:
        return ProviderError(
            "The assistant could not answer this question. Please try rephrasing it.",
            code=CODE_PROVIDER_ERROR,
            detail=detail,
            http_status=status_code,
        )

    return ProviderError(detail=detail, http_status=status_code)


def error_payload(error: AppError) -> dict[str, Any]:
    """Build the JSON body returned to the frontend."""
    return {
        "error": {
            "code": error.code,
            "message": error.user_message,
        }
    }


__all__ = [
    "AppError",
    "CODE_EMPTY_MESSAGE",
    "CODE_EMPTY_RESPONSE",
    "CODE_INTERNAL_ERROR",
    "CODE_INVALID_API_KEY",
    "CODE_MESSAGE_TOO_LONG",
    "CODE_MODEL_UNAVAILABLE",
    "CODE_PROVIDER_ERROR",
    "CODE_PROVIDER_NOT_CONFIGURED",
    "CODE_PROVIDER_UNAVAILABLE",
    "CODE_RATE_LIMITED",
    "CODE_TIMEOUT",
    "CODE_VALIDATION_ERROR",
    "DEFAULT_STATUS_BY_CODE",
    "ProviderError",
    "RETRYABLE_HTTP_STATUSES",
    "ValidationError",
    "classify_provider_exception",
    "error_payload",
]
