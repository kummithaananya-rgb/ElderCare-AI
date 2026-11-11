"""Unit tests for the provider interface and IBM watsonx adapter."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from model_providers import (
    GeminiProvider,
    IBMWatsonxProvider,
    ModelProvider,
    ProviderResponseError,
)
import model_providers
import watsonx_client


class IBMWatsonxProviderTests(unittest.TestCase):
    def test_adapter_implements_provider_contract_and_normalizes_text(self):
        model = Mock()
        model.chat.return_value = {
            "choices": [{"message": {"content": "Hello there."}}]
        }
        provider = IBMWatsonxProvider(model)

        self.assertIsInstance(provider, ModelProvider)
        self.assertEqual(
            provider.generate([{"role": "user", "content": "Hello"}]),
            "Hello there.",
        )
        model.chat.assert_called_once_with(
            messages=[{"role": "user", "content": "Hello"}]
        )

    def test_adapter_preserves_empty_text_for_existing_safe_fallback(self):
        model = Mock()
        model.chat.return_value = {
            "choices": [{"message": {"content": ""}}]
        }

        self.assertEqual(IBMWatsonxProvider(model).generate([]), "")

    def test_adapter_rejects_malformed_response_without_leaking_content(self):
        malformed_responses = (
            None,
            {},
            {"choices": []},
            {"choices": [{"message": {}}]},
            {"choices": [{"message": {"content": {"private": "data"}}}]},
        )
        for response in malformed_responses:
            with self.subTest(response=response):
                model = Mock()
                model.chat.return_value = response
                with self.assertRaisesRegex(
                    ProviderResponseError,
                    "^IBM watsonx.ai returned an invalid response\\.$",
                ):
                    IBMWatsonxProvider(model).generate([])


class GeminiProviderTests(unittest.TestCase):
    def test_initializes_client_with_api_key_and_model_id(self):
        with patch.object(model_providers.genai, "Client") as client_factory:
            provider = GeminiProvider("test-key", "test-model")

        client_factory.assert_called_once_with(api_key="test-key")
        self.assertEqual(provider._model_id, "test-model")

    def test_converts_system_instruction_and_conversation_roles(self):
        client = Mock()
        client.models.generate_content.return_value = SimpleNamespace(
            text="Gemini response."
        )
        with patch.object(model_providers.genai, "Client", return_value=client):
            provider = GeminiProvider("test-key", "test-model")

        result = provider.generate([
            {"role": "system", "content": "System guidance."},
            {"role": "user", "content": "Hello."},
            {"role": "assistant", "content": "Hi there."},
            {"role": "user", "content": "Follow-up."},
        ])

        self.assertEqual(result, "Gemini response.")
        call = client.models.generate_content.call_args.kwargs
        self.assertEqual(call["model"], "test-model")
        self.assertEqual(
            [
                (item.role, item.parts[0].text)
                for item in call["contents"]
            ],
            [
                ("user", "Hello."),
                ("model", "Hi there."),
                ("user", "Follow-up."),
            ],
        )
        self.assertEqual(call["config"].system_instruction, "System guidance.")

    def test_empty_response_text_is_normalized_to_empty_string(self):
        client = Mock()
        client.models.generate_content.return_value = SimpleNamespace(text="")
        with patch.object(model_providers.genai, "Client", return_value=client):
            provider = GeminiProvider("test-key", "test-model")

        self.assertEqual(
            provider.generate([{"role": "user", "content": "Hello."}]),
            "",
        )

    def test_missing_text_response_is_rejected_safely(self):
        client = Mock()
        client.models.generate_content.return_value = object()
        with patch.object(model_providers.genai, "Client", return_value=client):
            provider = GeminiProvider("test-key", "test-model")

        with self.assertRaisesRegex(
            ProviderResponseError,
            "^Gemini returned an invalid response\\.$",
        ):
            provider.generate([{"role": "user", "content": "Hello."}])

    def test_missing_response_is_rejected_safely(self):
        client = Mock()
        client.models.generate_content.return_value = None
        with patch.object(model_providers.genai, "Client", return_value=client):
            provider = GeminiProvider("test-key", "test-model")

        with self.assertRaisesRegex(
            ProviderResponseError,
            "^Gemini returned an invalid response\\.$",
        ):
            provider.generate([{"role": "user", "content": "Hello."}])

    def test_malformed_messages_are_rejected_without_provider_call(self):
        client = Mock()
        with patch.object(model_providers.genai, "Client", return_value=client):
            provider = GeminiProvider("test-key", "test-model")

        for messages in (
            [{"role": "system", "content": "Instructions only."}],
            [{"role": "invalid", "content": "Hello."}],
            [{"role": "user", "content": None}],
        ):
            with self.subTest(messages=messages):
                with self.assertRaises(ProviderResponseError):
                    provider.generate(messages)
        client.models.generate_content.assert_not_called()


class ProviderSelectionTests(unittest.TestCase):
    def test_gemini_provider_is_selected_and_initialized(self):
        environment = {
            "AI_PROVIDER": "gemini",
            "GEMINI_API_KEY": "test-key",
            "GEMINI_MODEL_ID": "test-model",
        }
        with patch.dict(os.environ, environment, clear=True), patch.object(
            model_providers.genai, "Client"
        ) as client_factory:
            provider = watsonx_client.build_model()

        self.assertIsInstance(provider, GeminiProvider)
        client_factory.assert_called_once_with(api_key="test-key")

    def test_ibm_watsonx_remains_default_when_provider_is_unset(self):
        environment = {
            "WATSONX_API_KEY": "test-key",
            "WATSONX_URL": "https://example.invalid",
            "WATSONX_PROJECT_ID": "test-project",
            "WATSONX_MODEL_ID": "test-model",
        }
        with patch.dict(os.environ, environment, clear=True), patch.object(
            watsonx_client, "Credentials"
        ) as credentials, patch.object(
            watsonx_client, "APIClient"
        ) as api_client, patch.object(
            watsonx_client, "ModelInference"
        ) as model_inference:
            provider = watsonx_client.build_model()

        self.assertIsInstance(provider, IBMWatsonxProvider)
        credentials.assert_called_once_with(
            url="https://example.invalid",
            api_key="test-key",
        )
        api_client.assert_called_once_with(credentials.return_value)
        model_inference.assert_called_once_with(
            model_id="test-model",
            api_client=api_client.return_value,
            project_id="test-project",
        )

    def test_required_configuration_depends_on_selected_provider(self):
        with patch.dict(
            os.environ,
            {"AI_PROVIDER": "gemini"},
            clear=True,
        ):
            self.assertEqual(
                watsonx_client.required_env_vars(),
                ["GEMINI_API_KEY", "GEMINI_MODEL_ID"],
            )
            with self.assertRaisesRegex(
                RuntimeError,
                "GEMINI_API_KEY, GEMINI_MODEL_ID",
            ):
                watsonx_client.build_model()

        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(
                watsonx_client.required_env_vars(),
                watsonx_client.REQUIRED_ENV_VARS,
            )

    def test_unsupported_provider_is_rejected(self):
        with patch.dict(
            os.environ,
            {"AI_PROVIDER": "unsupported"},
            clear=True,
        ):
            with self.assertRaisesRegex(ValueError, "AI_PROVIDER"):
                watsonx_client.configured_provider_name()


if __name__ == "__main__":
    unittest.main()
