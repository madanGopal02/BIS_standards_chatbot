"""`POST /api/chat` - the single chat endpoint.

It validates the request, calls `ai_service.generate_response(...)` and
translates any `AppError` into the safe JSON error envelope.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from ..models import ChatRequest, ChatResponse, ErrorResponse
from ..services.ai_service import generate_response
from ..services.errors import AppError, error_payload
from ..services.prompts import DISCLAIMER

logger = logging.getLogger("bis_ai.routes.chat")

router = APIRouter(tags=["chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Empty message"},
        413: {"model": ErrorResponse, "description": "Message too long"},
        422: {"model": ErrorResponse, "description": "Invalid request"},
        429: {"model": ErrorResponse, "description": "Provider rate limit"},
        502: {"model": ErrorResponse, "description": "Provider error"},
        503: {"model": ErrorResponse, "description": "Provider not configured"},
        504: {"model": ErrorResponse, "description": "Provider timeout"},
    },
    summary="Ask the BIS Standards AI assistant a question",
)
async def chat(payload: ChatRequest) -> ChatResponse | JSONResponse:
    try:
        # The provider SDKs are synchronous and block for seconds, so they run
        # in a worker thread: /api/health and /api/provider stay responsive
        # while an answer is being generated.
        result = await run_in_threadpool(
            generate_response,
            message=payload.message,
            conversation_id=payload.conversation_id,
            history=[turn.model_dump() for turn in payload.history],
        )
    except AppError as exc:
        logger.warning("chat request failed: code=%s", exc.code)
        return JSONResponse(status_code=exc.status_code, content=error_payload(exc))
    except Exception:  # noqa: BLE001 - last resort safety net
        # The real cause (with stack trace) stays in the server log.
        logger.exception("unexpected error while handling a chat request")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "Something went wrong on the server. Please try again.",
                }
            },
        )

    return ChatResponse(
        answer=result.answer,
        conversation_id=result.conversation_id,
        provider=result.provider,
        provider_display_name=result.provider_display_name,
        model=result.model,
        disclaimer=DISCLAIMER,
    )


__all__ = ["router"]
