"""BIS Standards AI - FastAPI application entry point.

Run with:

    uvicorn app.main:app --reload

from inside the `backend` folder.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import __version__
from .config import settings
from .routes import chat_router, health_router
from .services.errors import (
    CODE_INTERNAL_ERROR,
    CODE_VALIDATION_ERROR,
    AppError,
    error_payload,
)
from .utils.logging import get_logger, setup_logging

logger = get_logger("bis_ai")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging(settings.log_level)
    logger.info(
        "%s v%s starting | provider=%s | model=%s | configured=%s",
        settings.app_name,
        settings.app_version,
        settings.ai_provider,
        settings.current_model,
        "yes" if settings.is_provider_configured() else "no",
    )
    if not settings.is_provider_configured():
        logger.warning(
            "No API key found for provider '%s'. Add it to the .env file "
            "before asking a question.",
            settings.ai_provider,
        )
    yield
    logger.info("%s stopped", settings.app_name)


DESCRIPTION = """
AI assistant for **Bureau of Indian Standards (BIS)** concepts: Indian Standards,
certification, marking, testing, compliance and BIS terminology.

* The frontend never talks to an AI provider directly - it only calls this API.
* API keys are read from `.env` on the server and are never returned.
* This is an independent educational project and is **not affiliated with BIS**.

Docs: `/docs` (Swagger) and `/redoc`.
"""

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=DESCRIPTION.strip(),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS (development friendly, configurable through CORS_ORIGINS) ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
    max_age=600,
)


# --- Exception handlers -----------------------------------------------------
@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    logger.warning("%s -> %s", request.url.path, exc.code)
    return JSONResponse(status_code=exc.status_code, content=error_payload(exc))


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return a clean, user safe validation error (no echo of the input)."""
    fields = sorted(
        {
            ".".join(str(part) for part in error.get("loc", ())[1:]) or "body"
            for error in exc.errors()
        }
    )
    logger.warning("validation error on %s: fields=%s", request.url.path, fields)
    return JSONResponse(
        status_code=422,
        content=error_payload(
            AppError(
                "The request could not be processed. Please check your message and try again.",
                code=CODE_VALIDATION_ERROR,
            )
        ),
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    if exc.status_code == 404:
        detail = "Endpoint not found."
    elif exc.status_code == 405:
        detail = "Method not allowed for this endpoint."
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "http_error", "message": detail}},
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Log the stack trace, return a generic message (never the trace)."""
    # `exc_info=exc` instead of `logger.exception(...)`: the handler is not
    # necessarily called from inside an `except` block, so `sys.exc_info()`
    # can be empty and the traceback would be lost.
    logger.error(
        "unhandled error on %s", request.url.path, exc_info=exc
    )
    return JSONResponse(
        status_code=500,
        content=error_payload(
            AppError(
                "Something went wrong on the server. Please try again.",
                code=CODE_INTERNAL_ERROR,
            )
        ),
    )


# --- Routes -----------------------------------------------------------------
app.include_router(health_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/", tags=["system"], summary="Service information")
async def root() -> dict[str, object]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Backend for the BIS Standards AI assistant.",
        "docs": "/docs",
        "endpoints": ["/api/health", "/api/provider", "/api/chat"],
    }


@app.get("/api", tags=["system"], include_in_schema=False)
async def api_index() -> dict[str, object]:
    return {
        "name": settings.app_name,
        "provider": settings.ai_provider,
        "configured": settings.is_provider_configured(),
        "endpoints": ["/api/health", "/api/provider", "/api/chat"],
    }


__all__ = ["app"]
