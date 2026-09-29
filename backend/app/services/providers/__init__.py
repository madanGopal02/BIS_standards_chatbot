"""Provider package: one file per AI provider plus the shared base class."""

from .base import AIProvider, Message
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider
from .openai_provider import OpenAIProvider
from .registry import PROVIDERS, get_provider

__all__ = [
    "AIProvider",
    "GeminiProvider",
    "GroqProvider",
    "Message",
    "OpenAIProvider",
    "PROVIDERS",
    "get_provider",
]
