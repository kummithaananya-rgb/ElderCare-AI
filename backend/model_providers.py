"""Provider interface and normalized IBM watsonx.ai adapter."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

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
