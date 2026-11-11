"""Unit tests for the provider interface and IBM watsonx adapter."""

import unittest
from unittest.mock import Mock

from model_providers import (
    IBMWatsonxProvider,
    ModelProvider,
    ProviderResponseError,
)


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


if __name__ == "__main__":
    unittest.main()
