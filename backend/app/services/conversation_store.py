"""Conversation memory.

The frontend is the source of truth for chat history (it stores everything in
`localStorage`), and sends the recent turns with every request. This store is
a small in-memory fallback so `POST /api/chat` also works for a bare API
client that only sends `message` + `conversation_id`.

Swapping this for a real database later only requires implementing
`ConversationStore` again (see the class docstring).
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from typing import Protocol

from .providers.base import Message

MAX_CONVERSATIONS = 500
CONVERSATION_TTL_SECONDS = 60 * 60 * 6  # 6 hours


class ConversationStore(Protocol):
    """Interface a future database-backed store must satisfy."""

    def get(self, conversation_id: str) -> list[Message]: ...

    def append(self, conversation_id: str, turn: tuple[str, str]) -> list[Message]: ...

    def reset(self, conversation_id: str) -> None: ...


class InMemoryConversationStore:
    """Thread-safe, size-capped, TTL-expiring conversation memory."""

    def __init__(
        self,
        max_conversations: int = MAX_CONVERSATIONS,
        ttl_seconds: int = CONVERSATION_TTL_SECONDS,
    ) -> None:
        self._lock = threading.Lock()
        self._data: "OrderedDict[str, tuple[float, list[Message]]]" = OrderedDict()
        self._max_conversations = max_conversations
        self._ttl_seconds = ttl_seconds

    # -- internals --------------------------------------------------------
    def _prune(self, now: float) -> None:
        expired = [
            key
            for key, (updated_at, _) in self._data.items()
            if now - updated_at > self._ttl_seconds
        ]
        for key in expired:
            self._data.pop(key, None)
        while len(self._data) > self._max_conversations:
            self._data.popitem(last=False)

    # -- public API -------------------------------------------------------
    def get(self, conversation_id: str) -> list[Message]:
        with self._lock:
            entry = self._data.get(conversation_id)
            if entry is None:
                return []
            self._prune(time.time())
            return list(entry[1])

    def append(self, conversation_id: str, turn: tuple[str, str]) -> list[Message]:
        """Store a (user_message, assistant_answer) pair and return history."""
        user_text, assistant_text = turn
        with self._lock:
            now = time.time()
            self._prune(now)
            entry = self._data.get(conversation_id)
            history: list[Message] = list(entry[1]) if entry else []
            history.append({"role": "user", "content": user_text})
            history.append({"role": "assistant", "content": assistant_text})
            self._data[conversation_id] = (now, history)
            self._data.move_to_end(conversation_id)
            self._prune(now)
            return list(history)

    def reset(self, conversation_id: str) -> None:
        with self._lock:
            self._data.pop(conversation_id, None)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


store: InMemoryConversationStore = InMemoryConversationStore()


__all__ = [
    "CONVERSATION_TTL_SECONDS",
    "ConversationStore",
    "InMemoryConversationStore",
    "MAX_CONVERSATIONS",
    "store",
]
