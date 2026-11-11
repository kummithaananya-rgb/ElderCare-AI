"""Provider interface and normalized model-provider adapters."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from google import genai
from google.genai import types

from ibm_watsonx_ai.foundation_models import ModelInference


class ProviderResponseError(RuntimeError):
    """Raised when a provider response cannot be normalized to text."""


@runtime_checkable
class ModelProvider(Protocol):
    """Common inference interface consumed by ElderCare AI."""

    def generate(self, messages: list[dict[str, str]]) -> str:
        """Generate a response from role/content messages."""


class IBMWatsonxProvider:
    """Adapt IBM ModelInference chat responses to the shared text contract."""

    def __init__(self, model: ModelInference):
        self._model = model

    def generate(self, messages: list[dict[str, str]]) -> str:
        response = self._model.chat(messages=messages)
        try:
            text = response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise ProviderResponseError(
                "IBM watsonx.ai returned an invalid response."
            ) from None
        if not isinstance(text, str):
            raise ProviderResponseError(
                "IBM watsonx.ai returned an invalid response."
            )
        return text


class GeminiProvider:
    """Adapt Gemini text generation to the shared provider contract."""

    def __init__(self, api_key: str, model_id: str):
        self._client = genai.Client(api_key=api_key)
        self._model_id = model_id

    def generate(self, messages: list[dict[str, str]]) -> str:
        contents = []
        system_instructions = []
        role_mapping = {"user": "user", "assistant": "model"}

        for message in messages:
            if not isinstance(message, dict):
                raise ProviderResponseError(
                    "Gemini received an invalid message."
                )
            role = message.get("role")
            content = message.get("content")
            if not isinstance(content, str):
                raise ProviderResponseError(
                    "Gemini received an invalid message."
                )
            if role == "system":
                system_instructions.append(content)
                continue
            gemini_role = role_mapping.get(role)
            if gemini_role is None:
                raise ProviderResponseError(
                    "Gemini received an invalid message."
                )
            contents.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part.from_text(text=content)],
                )
            )

        if not contents:
            raise ProviderResponseError(
                "Gemini received an invalid message."
            )

        config = None
        if system_instructions:
            config = types.GenerateContentConfig(
                system_instruction="\n\n".join(system_instructions)
            )
        response = self._client.models.generate_content(
            model=self._model_id,
            contents=contents,
            config=config,
        )
        if response is None:
            raise ProviderResponseError(
                "Gemini returned an invalid response."
            )
        try:
            text = response.text
        except (AttributeError, TypeError, ValueError):
            raise ProviderResponseError(
                "Gemini returned an invalid response."
            ) from None
        if text is None:
            return ""
        if not isinstance(text, str):
            raise ProviderResponseError(
                "Gemini returned an invalid response."
            )
        return text
