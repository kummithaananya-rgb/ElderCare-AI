"""
watsonx_client.py
─────────────────
IBM watsonx.ai ModelInference wrapper for ElderCare AI.

Credentials are read exclusively from environment variables.
No credential is ever returned to callers or included in raised exceptions.
Full error details are written to the server log (stderr) only.
"""

import logging
import os

from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

import guardrails
from model_providers import (
    GeminiProvider,
    IBMWatsonxProvider,
    ModelProvider,
)

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────
# Defines the assistant's persona for every conversation.
SYSTEM_PROMPT = (
    "You are ElderCare AI, a warm, patient, and caring health companion "
    "designed to support elderly users. "
    "Always communicate in clear, simple, friendly language. "
    "Provide practical health guidance, gentle reminders, and emotional support. "
    "For any medical concern or symptom, always recommend consulting a qualified doctor. "
    "Keep responses concise, easy to read, and encouraging."
)

# Required environment variable names — validated at startup by main.py.
REQUIRED_ENV_VARS = [
    "WATSONX_API_KEY",
    "WATSONX_URL",
    "WATSONX_PROJECT_ID",
    "WATSONX_MODEL_ID",
]


def configured_provider_name() -> str:
    """Return the selected provider name, defaulting to IBM watsonx."""
    provider_name = os.getenv("AI_PROVIDER", "watsonx").strip().lower()
    if provider_name not in {"watsonx", "gemini"}:
        raise ValueError("AI_PROVIDER must be 'watsonx' or 'gemini'.")
    return provider_name


def required_env_vars() -> list[str]:
    """Return required configuration names for the selected provider."""
    if configured_provider_name() == "gemini":
        return ["GEMINI_API_KEY", "GEMINI_MODEL_ID"]
    return REQUIRED_ENV_VARS.copy()


def build_model() -> ModelProvider:
    """
    Build the configured provider, defaulting to IBM watsonx.ai.

    Called once at application startup (not per-request).
    Raises a generic configuration error if required settings are missing.
    """
    provider_name = configured_provider_name()
    missing = [
        key for key in required_env_vars()
        if not os.getenv(key)
    ]
    if missing:
        raise RuntimeError(
            f"Missing required provider configuration: {', '.join(missing)}"
        )

    if provider_name == "gemini":
        return GeminiProvider(
            api_key=os.environ["GEMINI_API_KEY"],
            model_id=os.environ["GEMINI_MODEL_ID"],
        )

    api_key    = os.environ["WATSONX_API_KEY"]
    url        = os.environ["WATSONX_URL"]
    project_id = os.environ["WATSONX_PROJECT_ID"]
    model_id   = os.environ["WATSONX_MODEL_ID"]

    credentials = Credentials(url=url, api_key=api_key)
    client = APIClient(credentials)

    model = ModelInference(
        model_id=model_id,
        api_client=client,
        project_id=project_id,
    )

    # Log the model ID at startup (server-side only — never sent to clients).
    logger.info("ModelInference initialised with model: %s", model_id)
    return IBMWatsonxProvider(model)


def _invoke(
    model: ModelProvider | ModelInference,
    system_prompt: str,
    user_message: str,
    history: list,
) -> str:
    """
    Core inference helper — builds messages, invokes the provider, and sanitizes output.
    Raises RuntimeError (generic, credential-free) on any failure.
    Full error detail is written to the server log only.
    """
    safety = guardrails.assess_request(user_message, history)
    if not safety.can_proceed:
        if safety.safe_response is None:
            raise RuntimeError("Safety check blocked the request without a response.")
        return safety.safe_response

    messages = [{
        "role": "system",
        "content": f"{system_prompt}\n\n{guardrails.MODEL_SAFETY_INSTRUCTION}",
    }]
    messages.extend(
        guardrails.filter_resolved_safety_history(history, user_message)
    )
    messages.append({"role": "user", "content": user_message})

    try:
        provider = (
            IBMWatsonxProvider(model)
            if isinstance(model, ModelInference)
            else model
        )
        generated_text = provider.generate(messages)
        return guardrails.sanitize_model_output(
            generated_text,
            protected_texts=(system_prompt, guardrails.MODEL_SAFETY_INSTRUCTION),
        )

    except Exception as exc:
        logger.error(
            "Model provider inference failed; exception type: %s",
            type(exc).__name__,
        )
        raise RuntimeError("AI service temporarily unavailable.") from None


def chat(
    model: ModelProvider | ModelInference,
    user_message: str,
    history: list,
) -> str:
    """
    Sends a message using the default ElderCare AI companion system prompt.
    Used by the existing /api/chat endpoint — unchanged behaviour.
    """
    return _invoke(model, SYSTEM_PROMPT, user_message, history)


def chat_with_prompt(
    model: ModelProvider | ModelInference,
    system_prompt: str,
    user_message: str,
    history: list,
) -> str:
    """
    Sends a message using a caller-supplied system prompt.
    Used by specialised agents (Phase 2+) so each agent has its own persona.

    Parameters
    ----------
    model         : Provider implementing the shared inference interface
    system_prompt : The agent-specific system prompt string
    user_message  : The user's latest message text
    history       : List of prior turns {'role': ..., 'content': ...}

    Returns
    -------
    str  — The assistant's reply text

    Raises
    ------
    RuntimeError  — Generic message only; full detail logged server-side.
    """
    return _invoke(model, system_prompt, user_message, history)
