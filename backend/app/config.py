"""Application configuration.

Everything that can be tuned through environment variables lives here.
Secrets are read from `.env` files and are NEVER returned to the frontend.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import dotenv_values

# app/config.py -> app/ -> backend/ -> <project root>
BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent

# Later files override earlier ones. The root `.env` is the primary place a
# user edits, the backend one is a convenience override.
ENV_FILES = (
    ROOT_DIR / ".env",
    BACKEND_DIR / ".env",
)

SUPPORTED_PROVIDERS = ("groq", "openai", "gemini")

PROVIDER_ENV_KEYS = {
    "groq": "GROQ_API_KEY",
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
}

DEFAULT_MODELS = {
    "groq": "llama-3.3-70b-versatile",
    "openai": "gpt-4o-mini",
    # Model availability is per API key, so the defaults are verified against
    # the live `models` endpoint rather than assumed:
    #   gemini-2.5-flash / gemini-2.5-flash-lite -> 404 for the current key
    #   gemini-flash-latest / gemini-3.7-flash   -> 503 (no capacity)
    #   gemini-3.6-flash / gemini-3.5-flash      -> 504 after 30s (gateway)
    # `gemini-3-flash-preview` answers reliably in ~2s and is the primary;
    # `gemini-flash-lite-latest` is the proven fallback in the provider.
    "gemini": "gemini-3-flash-preview",
}


def _collect_dotenv_values() -> dict[str, str]:
    """Merge every `.env` file into a single mapping (later files win)."""
    merged: dict[str, str] = {}
    for env_file in ENV_FILES:
        if env_file.is_file():
            merged.update(
                {
                    key: value
                    for key, value in dotenv_values(env_file).items()
                    if value is not None
                }
            )
    return merged


_DOTENV_VALUES: dict[str, str] = _collect_dotenv_values()


def _get(key: str, default: str = "") -> str:
    """Read a setting: real environment variables win over `.env` files."""
    import os

    if key in os.environ:
        return os.environ[key].strip()
    return _DOTENV_VALUES.get(key, default).strip()


def _get_int(key: str, default: int) -> int:
    raw = _get(key, str(default))
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def _get_float(key: str, default: float) -> float:
    raw = _get(key, str(default))
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def _get_bool(key: str, default: bool) -> bool:
    raw = _get(key, "").lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    """Immutable snapshot of the application configuration."""

    # --- Application -----------------------------------------------------
    app_name: str = "BIS Standards AI"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # --- AI provider -----------------------------------------------------
    ai_provider: str = "groq"
    api_keys: dict[str, str] = None  # type: ignore[assignment]
    models: dict[str, str] = None  # type: ignore[assignment]

    # --- Generation settings --------------------------------------------
    temperature: float = 0.3
    max_tokens: int = 1400
    request_timeout: int = 60

    # --- Limits ----------------------------------------------------------
    max_message_length: int = 5000
    max_history_messages: int = 12

    # --- CORS ------------------------------------------------------------
    cors_origins: list[str] = None  # type: ignore[assignment]

    # --- Derived helpers -------------------------------------------------
    @property
    def current_api_key(self) -> str:
        return self.api_keys.get(self.ai_provider, "")

    @property
    def current_model(self) -> str:
        return self.models.get(self.ai_provider, "")

    @property
    def provider_display_name(self) -> str:
        return {
            "groq": "Groq",
            "openai": "OpenAI",
            "gemini": "Google Gemini",
        }.get(self.ai_provider, self.ai_provider.title())

    def is_provider_configured(self) -> bool:
        """True when the active provider has a non-empty API key."""
        return bool(self.current_api_key)

    def provider_status(self) -> dict[str, Any]:
        """Public (secret-free) description of the provider configuration."""
        return {
            "provider": self.ai_provider,
            "provider_display_name": self.provider_display_name,
            "model": self.current_model,
            "configured": self.is_provider_configured(),
            "max_message_length": self.max_message_length,
        }


def _normalise_origins(raw: str) -> list[str]:
    origins = [origin.strip().rstrip("/") for origin in raw.split(",")]
    return [origin for origin in origins if origin]


def _load() -> Settings:
    provider = _get("AI_PROVIDER", "groq").lower()
    if provider not in SUPPORTED_PROVIDERS:
        provider = "groq"

    api_keys = {
        "groq": _get("GROQ_API_KEY"),
        "openai": _get("OPENAI_API_KEY"),
        "gemini": _get("GEMINI_API_KEY"),
    }
    models = {
        "groq": _get("GROQ_MODEL", DEFAULT_MODELS["groq"]) or DEFAULT_MODELS["groq"],
        "openai": _get("OPENAI_MODEL", DEFAULT_MODELS["openai"])
        or DEFAULT_MODELS["openai"],
        "gemini": _get("GEMINI_MODEL", DEFAULT_MODELS["gemini"])
        or DEFAULT_MODELS["gemini"],
    }

    return Settings(
        app_name=_get("APP_NAME", "BIS Standards AI") or "BIS Standards AI",
        app_version=_get("APP_VERSION", "1.0.0") or "1.0.0",
        environment=_get("ENVIRONMENT", "development") or "development",
        debug=_get_bool("DEBUG", True),
        log_level=(_get("LOG_LEVEL", "INFO") or "INFO").upper(),
        ai_provider=provider,
        api_keys=api_keys,
        models=models,
        temperature=_get_float("AI_TEMPERATURE", 0.3),
        max_tokens=_get_int("AI_MAX_TOKENS", 1400),
        request_timeout=_get_int("AI_REQUEST_TIMEOUT", 60),
        max_message_length=_get_int("MAX_MESSAGE_LENGTH", 5000),
        max_history_messages=_get_int("MAX_HISTORY_MESSAGES", 12),
        cors_origins=_normalise_origins(
            _get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        ),
    )


settings = _load()

__all__ = [
    "BACKEND_DIR",
    "ROOT_DIR",
    "DEFAULT_MODELS",
    "PROVIDER_ENV_KEYS",
    "SUPPORTED_PROVIDERS",
    "Settings",
    "settings",
]
