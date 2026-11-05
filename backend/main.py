"""
main.py
───────
ElderCare AI — FastAPI backend.

Endpoints
---------
GET  /api/health   Liveness check (no credentials in response)
POST /api/chat     Send a message to IBM Granite; receive a reply

Security
--------
- All IBM credentials are read from environment variables only.
- No credential, model ID, endpoint URL, or IBM error detail is ever
  included in HTTP responses sent to the client.
- Full error information is written to the server log (stderr) only.
- CORS is restricted to http://localhost:3000 (CRA dev server).
"""

import logging
import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

import watsonx_client

# ── Load .env (if present) before anything else reads os.environ ──────────────
load_dotenv()

# ── Logging — writes to stderr; visible in the terminal where uvicorn runs ────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="ElderCare AI Backend",
    description="IBM watsonx.ai Granite integration for ElderCare AI",
    version="1.0.0",
    # Disable automatic /docs and /redoc in production if desired;
    # left enabled here for development convenience.
)

# ── CORS — allow only the local CRA dev server ────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ── Module-level model instance — created once at startup ─────────────────────
_model = None

# ── Required environment variable names ──────────────────────────────────────
REQUIRED_ENV = [
    "WATSONX_API_KEY",
    "WATSONX_URL",
    "WATSONX_PROJECT_ID",
    "WATSONX_MODEL_ID",
]


# ── Startup: validate env vars and initialise the model client ────────────────
@app.on_event("startup")
async def startup_event():
    global _model

    # Check all required vars are present before attempting SDK calls.
    missing = [key for key in REQUIRED_ENV if not os.getenv(key)]
    if missing:
        # Log missing var names (not their values) and abort.
        logger.error(
            "Server startup failed — missing required environment variables: %s. "
            "Copy backend/.env.example to backend/.env and fill in your values.",
            ", ".join(missing),
        )
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

    logger.info("All required environment variables are present.")

    try:
        _model = watsonx_client.build_model()
        logger.info("IBM watsonx.ai ModelInference client ready.")
    except Exception:
        logger.error(
            "Failed to initialise IBM watsonx.ai client:\n%s",
            traceback.format_exc(),
        )
        raise


# ── Request / Response models ─────────────────────────────────────────────────

class HistoryItem(BaseModel):
    """A single prior conversation turn."""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str

class ChatRequest(BaseModel):
    """Request body for POST /api/chat."""
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
async def chat_endpoint(req: ChatRequest):
    """
    Accepts a user message and optional conversation history.
    Returns the IBM Granite assistant reply.

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
