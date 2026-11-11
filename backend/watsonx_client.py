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


def build_model() -> ModelInference:
    """
    Reads credentials from environment variables and returns a ModelInference
    instance configured for the Granite model.

    Called once at application startup (not per-request).
    Raises KeyError if a required environment variable is missing.
    """
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
    return model


def _invoke(model: ModelInference, system_prompt: str, user_message: str, history: list) -> str:
    """
    Core inference helper — builds the messages array and calls the IBM SDK.
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
        response = model.chat(messages=messages)
        # IBM SDK documented response shape:
        #   response["choices"][0]["message"]["content"]
        return guardrails.sanitize_model_output(
            response["choices"][0]["message"]["content"],
            protected_texts=(system_prompt, guardrails.MODEL_SAFETY_INSTRUCTION),
        )

    except Exception as exc:
        logger.error(
            "watsonx.ai ModelInference.chat() failed; exception type: %s",
            type(exc).__name__,
        )
        raise RuntimeError("AI service temporarily unavailable.") from None


def chat(model: ModelInference, user_message: str, history: list) -> str:
    """
    Sends a message using the default ElderCare AI companion system prompt.
    Used by the existing /api/chat endpoint — unchanged behaviour.
    """
    return _invoke(model, SYSTEM_PROMPT, user_message, history)


def chat_with_prompt(
    model: ModelInference,
    system_prompt: str,
    user_message: str,
    history: list,
) -> str:
    """
    Sends a message using a caller-supplied system prompt.
    Used by specialised agents (Phase 2+) so each agent has its own persona.

    Parameters
    ----------
    model         : ModelInference instance from build_model()
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
