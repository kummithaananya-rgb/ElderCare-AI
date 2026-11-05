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
import traceback

from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

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


def chat(model: ModelInference, user_message: str, history: list) -> str:
    """
    Sends a message to IBM Granite via ModelInference.chat() and returns
    the assistant's reply as a plain string.

    Parameters
    ----------
    model        : ModelInference instance created by build_model()
    user_message : The user's latest message text
    history      : List of prior turns, each a dict with 'role' and 'content'
                   (roles must be 'user' or 'assistant')

    Returns
    -------
    str  — The assistant's reply text

    Raises
    ------
    RuntimeError  — A generic, credential-free message suitable for
                    propagating toward the client. Full error detail is
                    written to the server log only.
    """
    # Build the messages array: system prompt → prior history → new user turn.
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        response = model.chat(messages=messages)
        # IBM SDK documented response shape:
        #   response["choices"][0]["message"]["content"]
        return response["choices"][0]["message"]["content"]

    except Exception as exc:
        # Write full detail (type, message, traceback) to server log only.
        # Nothing from this block reaches the HTTP response.
        logger.error(
            "watsonx.ai ModelInference.chat() failed.\n"
            "Exception type : %s\n"
            "Message        : %s\n"
            "Traceback      :\n%s",
            type(exc).__name__,
            exc,
            traceback.format_exc(),
        )
        # Raise a generic RuntimeError — no IBM internals, no credentials.
        raise RuntimeError("AI service temporarily unavailable.") from exc
