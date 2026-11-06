"""
main.py
───────
ElderCare AI — FastAPI backend.

Endpoints
---------
GET  /api/health        Liveness check (no credentials in response)
POST /api/chat          Send a message using the default companion persona
POST /api/agents/run    Send a message through the agent orchestrator
POST /mcp               MCP Streamable HTTP transport (read-only tools, local only)

Security
--------
- All IBM credentials are read from environment variables only.
- No credential, model ID, endpoint URL, or IBM error detail is ever
  included in HTTP responses sent to the client.
- Full error information is written to the server log (stderr) only.
- CORS origins are read from ALLOWED_ORIGINS env var (comma-separated).
  Default: http://localhost:3000 (CRA dev server).
- The MCP endpoint is disabled in production via MCP_ENABLED=false.
- API docs (/docs, /redoc) are disabled in production via DISABLE_DOCS=true.
- Rate limiting: 10 requests/minute per IP on AI endpoints.
"""

import contextlib
import logging
import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from typing import List

# ── Load .env and configure logging before importing app modules ──────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

import watsonx_client
import orchestrator
import mcp_server as _mcp_module

# ── Build the MCP ASGI sub-app at import time so session_manager is
#    initialised before the lifespan context manager runs.
#    Returns None when MCP_ENABLED=false — mount is skipped below.
_mcp_app = _mcp_module.get_mcp_app()

# ── Module-level model instance — created once at startup ─────────────────────
_model = None

# ── Required environment variable names ──────────────────────────────────────
REQUIRED_ENV = [
    "WATSONX_API_KEY",
    "WATSONX_URL",
    "WATSONX_PROJECT_ID",
    "WATSONX_MODEL_ID",
]

# ── CORS origins — read from env, default to localhost for local development ──
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── API docs — disabled in production via DISABLE_DOCS=true ──────────────────
_disable_docs = os.getenv("DISABLE_DOCS", "false").lower() == "true"

# ── Rate limiter — 10 requests/minute per IP on AI endpoints ─────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Lifespan: replaces the deprecated @app.on_event("startup") ───────────────
# Manages both the watsonx model client and the MCP session manager.
# The MCP session manager MUST be started here — FastAPI's app.mount()
# does not propagate lifespan events into sub-applications.
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    global _model

    # 1. Validate required environment variables.
    missing = [key for key in REQUIRED_ENV if not os.getenv(key)]
    if missing:
        logger.error(
            "Server startup failed — missing required environment variables: %s. "
            "Copy backend/.env.example to backend/.env and fill in your values.",
            ", ".join(missing),
        )
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

    logger.info("All required environment variables are present.")

    # 2. Initialise the watsonx.ai model client.
    try:
        _model = watsonx_client.build_model()
        logger.info("IBM watsonx.ai ModelInference client ready.")
    except Exception:
        logger.error(
            "Failed to initialise IBM watsonx.ai client:\n%s",
            traceback.format_exc(),
        )
        raise

    # 3. Start the MCP session manager only when MCP is enabled.
    if _mcp_module.MCP_ENABLED:
        logger.info("Starting MCP Streamable HTTP session manager.")
        async with _mcp_module.mcp.session_manager.run():
            logger.info("MCP session manager running — /mcp endpoint is live.")
            yield  # Application is now fully started.
    else:
        logger.info("MCP disabled (MCP_ENABLED=false) — skipping session manager.")
        yield  # Application is now fully started.

    # Cleanup is handled automatically when the context managers above exit.
    logger.info("Server shutdown complete.")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="ElderCare AI Backend",
    description=(
        "ElderCare AI backend powered by Meta Llama 3.3 70B via IBM watsonx.ai. "
        "Exposes REST endpoints for chat and agent routing, and an MCP endpoint "
        "for local tool access (disabled in production)."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if _disable_docs else "/docs",
    redoc_url=None if _disable_docs else "/redoc",
    openapi_url=None if _disable_docs else "/openapi.json",
)

# ── Rate limiter state + exception handler ────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — origins controlled by ALLOWED_ORIGINS env var ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ── Mount the MCP Streamable HTTP sub-application at /mcp (when enabled) ──────
# streamable_http_path="/" in get_mcp_app() means the internal route is "/".
# Combined with this mount prefix, the final endpoint is /mcp — not /mcp/mcp.
if _mcp_app is not None:
    app.mount("/mcp", _mcp_app)


# ── Request / Response models ─────────────────────────────────────────────────

class HistoryItem(BaseModel):
    """A single prior conversation turn."""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str

class ChatRequest(BaseModel):
    """Request body for POST /api/chat."""
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[HistoryItem] = Field(default_factory=list, max_length=20)

class AgentRequest(BaseModel):
    """Request body for POST /api/agents/run."""
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[HistoryItem] = Field(default_factory=list, max_length=20)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """
    Liveness check.
    Returns only a status string — no credentials, model ID, or endpoint URL.
    """
    return {"status": "ok", "service": "ElderCare AI Backend"}


@app.post("/api/chat")
@limiter.limit("10/minute")
async def chat_endpoint(request: Request, req: ChatRequest):
    """
    Accepts a user message and optional conversation history.
    Returns the Meta Llama 3.3 70B (IBM watsonx.ai) assistant reply.

    Rate limited to 10 requests per minute per IP address.
    Error responses contain only a generic user-facing message.
    Full error details are written to the server log only.
    """
    if _model is None:
        logger.error("/api/chat called but model client is not initialised.")
        raise HTTPException(
            status_code=503,
            detail="AI service is not available. Check server startup logs.",
        )

    # Convert Pydantic models to plain dicts for the SDK.
    history = [{"role": h.role, "content": h.content} for h in req.history]

    try:
        reply = watsonx_client.chat(_model, req.message, history)
        return {"reply": reply}

    except RuntimeError as exc:
        # watsonx_client.chat() raises RuntimeError with a generic message.
        # The original IBM exception is already logged inside the wrapper.
        raise HTTPException(status_code=503, detail=str(exc))

    except Exception:
        # Unexpected error — log fully, return nothing sensitive.
        logger.error(
            "Unexpected error in /api/chat:\n%s", traceback.format_exc()
        )
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred."
        )


@app.post("/api/agents/run")
@limiter.limit("10/minute")
async def agents_run(request: Request, req: AgentRequest):
    """
    Routes the message through the agent orchestrator.
    Returns the reply plus metadata identifying which agent responded.
    Rate limited to 10 requests per minute per IP address.

    Response shape:
        {
            "reply":       "<agent response text>",
            "agent_name":  "<internal name>",
            "agent_label": "<display name with emoji>",
            "agent_desc":  "<short role description>"
        }

    Error responses contain only a generic message — no credentials or
    IBM error internals are returned to the client.
    """
    if _model is None:
        logger.error("/api/agents/run called but model client is not initialised.")
        raise HTTPException(
            status_code=503,
            detail="AI service is not available. Check server startup logs.",
        )

    history = [{"role": h.role, "content": h.content} for h in req.history]

    try:
        result = orchestrator.run(_model, req.message, history)
        return result

    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    except Exception:
        logger.error(
            "Unexpected error in /api/agents/run:\n%s", traceback.format_exc()
        )
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred."
        )
