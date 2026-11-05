"""
mcp_server.py
─────────────
ElderCare AI — Phase 3: MCP (Model Context Protocol) integration.

Exposes three read-only tools via the official MCP Python SDK v2 (MCPServer).
Transport: Streamable HTTP, mounted at /mcp on the parent FastAPI application.

Tools
-----
get_system_status        — Server health, registered agents, UTC timestamp.
get_agent_capabilities   — Agent names, descriptions, and routing topic examples.
get_eldercare_guidance   — Curated general eldercare lifestyle guidance by topic.

Security / Privacy notes
------------------------
- No personal data is accessed or returned by any tool.
- All data is static and sourced server-side; no browser localStorage is read.
- No write tools, no authentication bypass, no shared user state.
- The SDK enables DNS-rebinding protection automatically when host="127.0.0.1"
  is passed to streamable_http_app(). This protects the MCP sub-app's own
  transport layer from DNS-rebinding attacks.
- Network exposure is controlled by the Uvicorn bind address, not by this
  parameter. Running uvicorn with --host 0.0.0.0 would expose the entire
  application (including /mcp) to the network. For local development the
  server should be started with --host 127.0.0.1. Public deployment requires
  suitable authentication and access controls to be added before use.

The model used is Meta Llama 3.3 70B via IBM watsonx.ai.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Literal

from mcp.server import MCPServer

logger = logging.getLogger(__name__)

# ── Agent metadata (mirrors the frontend AGENT_INFO constant) ─────────────────
# Kept here server-side so MCP clients get accurate routing information without
# needing to parse the React source.

_AGENTS = [
    {
        "name": "HealthMonitor",
        "label": "Health Monitor",
        "description": "Health, wellness & vitals specialist",
        "example_topics": [
            "blood pressure",
            "symptoms",
            "sleep hygiene",
            "diet and nutrition",
            "exercise and steps",
            "health diary",
            "doctor appointments",
        ],
    },
    {
        "name": "MedicineAdvisor",
        "label": "Medicine Advisor",
        "description": "Medication schedules & general guidance",
        "example_topics": [
            "medicine reminders",
            "dosage schedules",
            "missed doses",
            "medicine side effects",
            "pharmacy refills",
            "vitamin supplements",
        ],
    },
    {
        "name": "WellbeingCompanion",
        "label": "Wellbeing Companion",
        "description": "Emotional support & daily wellbeing",
        "example_topics": [
            "loneliness",
            "low mood",
            "sleep difficulties",
            "daily routines",
            "hobbies and relaxation",
            "social connections",
            "family",
        ],
    },
]

# ── Eldercare guidance content (general, non-clinical, non-personal) ──────────
# These are general lifestyle reminders only, not medical advice.
# Every topic block includes an explicit disclaimer.

_DISCLAIMER = (
    "\n\n⚠️  IMPORTANT: This information is general lifestyle guidance only. "
    "It does not replace professional medical advice. Always consult a qualified "
    "healthcare professional for personal medical decisions."
)

_GUIDANCE: dict[str, str] = {
    "health": (
        "General Health & Wellness Tips for Older Adults\n"
        "─────────────────────────────────────────────────\n"
        "• Stay hydrated: aim for 6–8 glasses of water a day, more in hot weather.\n"
        "• Keep regular check-up appointments with your doctor and dentist.\n"
        "• Light daily movement — such as a short walk — supports circulation and mood.\n"
        "• Get adequate sleep: most adults need 7–9 hours; a consistent bedtime helps.\n"
        "• Keep a simple health diary to track how you feel each day — patterns help "
        "  doctors understand your wellbeing over time.\n"
        "• If you notice new or changing symptoms, contact your doctor promptly rather "
        "  than waiting to see if they go away.\n"
        + _DISCLAIMER
    ),
    "medicine": (
        "General Medicine & Medication Reminders\n"
        "─────────────────────────────────────────\n"
        "• Take medicines at the same time each day to build a reliable routine.\n"
        "• Use a pill organiser or phone alarm to reduce the chance of missing doses.\n"
        "• Never stop or change a prescribed medicine without speaking to your doctor "
        "  or pharmacist first.\n"
        "• Keep an up-to-date list of all medicines (including vitamins and supplements) "
        "  to share at every medical appointment.\n"
        "• Store medicines in a cool, dry place, away from direct sunlight, unless the "
        "  label says otherwise (e.g. 'keep refrigerated').\n"
        "• If you miss a dose, follow the instructions on the medicine leaflet or ask "
        "  your pharmacist — do not double up without guidance.\n"
        + _DISCLAIMER
    ),
    "wellbeing": (
        "General Wellbeing & Daily Life Tips\n"
        "──────────────────────────────────────\n"
        "• Social connection matters: a regular call or visit with family or friends "
        "  can meaningfully lift mood.\n"
        "• Gentle hobbies — reading, gardening, puzzles, music — provide purpose "
        "  and mental stimulation.\n"
        "• Short outdoor time each day (even 10–15 minutes) supports mood and vitamin D.\n"
        "• If feelings of sadness or loneliness persist for more than two weeks, speak "
        "  to your doctor; effective support is available.\n"
        "• A predictable daily routine — regular meal times, sleep times, and activities "
        "  — provides stability and reduces anxiety.\n"
        "• Relaxation techniques such as slow breathing or gentle stretching can help "
        "  with stress and sleep.\n"
        + _DISCLAIMER
    ),
}

# ── MCPServer instance ────────────────────────────────────────────────────────

mcp = MCPServer(
    name="eldercare-ai-mcp",
    version="1.0.0",
    description=(
        "ElderCare AI MCP server. Provides read-only tools for system status, "
        "agent capability discovery, and general eldercare guidance. "
        "No personal user data is accessible through this server."
    ),
)


@mcp.tool()
def get_system_status() -> dict:
    """
    Returns the current status of the ElderCare AI backend.

    Includes: service name, version, UTC timestamp, list of registered agent
    names, and a confirmation that the service is operational. Use this tool
    to verify connectivity and check which agents are available before routing
    a request.
    """
    return {
        "service": "ElderCare AI Backend",
        "mcp_server": "eldercare-ai-mcp",
        "version": "1.0.0",
        "status": "operational",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "registered_agents": [a["name"] for a in _AGENTS],
        "model": "Meta Llama 3.3 70B via IBM watsonx.ai",
        "note": "No personal user data is accessible via MCP tools.",
    }


@mcp.tool()
def get_agent_capabilities() -> dict:
    """
    Returns the full list of specialist AI agents registered in ElderCare AI,
    including each agent's name, display label, description, and example topic
    categories.

    Use this tool to understand how user questions are routed, or to help
    decide which agent domain a question belongs to before sending it via the
    /api/agents/run endpoint.
    """
    return {
        "agents": _AGENTS,
        "routing_note": (
            "Questions are routed automatically by keyword matching. "
            "Medicine-related keywords take priority over general health keywords. "
            "Unmatched questions fall back to the WellbeingCompanion agent."
        ),
    }


@mcp.tool()
def get_eldercare_guidance(
    topic: Literal["health", "medicine", "wellbeing"],
) -> str:
    """
    Returns curated general eldercare guidance for the specified topic.

    Topics:
    - "health"     — hydration, check-ups, movement, sleep, health diary tips.
    - "medicine"   — medication routine reminders and safe storage guidance.
    - "wellbeing"  — social connection, hobbies, mood, and daily routine tips.

    All content is general lifestyle information only and does not constitute
    medical advice. Every response includes an explicit disclaimer.
    """
    return _GUIDANCE[topic]


def get_mcp_app():
    """
    Returns the Starlette ASGI app for the MCP Streamable HTTP transport.

    Called once at module import time in main.py so that session_manager
    is initialised before the FastAPI lifespan context manager runs.

    streamable_http_path="/" is intentional: combined with app.mount("/mcp", ...)
    the final endpoint is http://127.0.0.1:8000/mcp — not /mcp/mcp.
    """
    return mcp.streamable_http_app(streamable_http_path="/", host="127.0.0.1")
