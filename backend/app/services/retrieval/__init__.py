"""Retrieval layer (future RAG seam).

The MVP deliberately has NO vector database, NO BIS document store and NO
web access. This package exists only to define *where* retrieval will plug in,
so the pipeline in `ai_service.py` does not need to be rewritten later.

Today the pipeline is:

    user question -> [retriever returns no context] -> system prompt -> LLM

Later it can become:

    user question
      -> query classification
      -> BIS metadata search
      -> vector search
      -> reranking
      -> relevant BIS documents
      -> LLM
      -> answer + citations

To add real retrieval later: implement `Retriever`, return a `RetrievalResult`
with `context` and `citations`, and register it in `get_retriever()`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass
class RetrievalResult:
    """What a retriever gives back to the pipeline."""

    context: str = ""
    citations: list[dict[str, str]] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not self.context.strip()


@runtime_checkable
class Retriever(Protocol):
    """Interface every future retrieval strategy must implement."""

    name: str

    def retrieve(self, question: str, **kwargs: object) -> RetrievalResult:
        ...


class NullRetriever:
    """MVP default: returns nothing.

    It never pretends to have looked anything up. Keeping it as the default
    guarantees the assistant can never claim it "checked the BIS database".
    """

    name = "null"

    def retrieve(self, question: str, **kwargs: object) -> RetrievalResult:
        return RetrievalResult()


def get_retriever() -> Retriever:
    """Return the active retriever (overridable when RAG is added)."""
    return NullRetriever()


def build_context_block(result: RetrievalResult) -> str:
    """Render retrieved context for the prompt (empty in the MVP)."""
    if result.is_empty:
        return ""
    lines = ["<retrieved_context>"]
    for citation in result.citations:
        reference = citation.get("reference", "unknown source")
        lines.append(f"- [{reference}]")
    lines.append(result.context)
    lines.append("</retrieved_context>")
    return "\n".join(lines)


__all__ = [
    "NullRetriever",
    "RetrievalResult",
    "Retriever",
    "build_context_block",
    "get_retriever",
]
