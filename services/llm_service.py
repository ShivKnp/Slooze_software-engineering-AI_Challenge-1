from __future__ import annotations

from collections.abc import Iterator

import google.api_core.exceptions as g_exceptions
import google.generativeai as genai


class LLMQuotaError(RuntimeError):
    """Raised when the model quota is exhausted."""


class LLMService:
    """Wraps Gemini generation and exposes streaming tokens."""

    def __init__(self, api_key: str, model_name: str) -> None:
        genai.configure(api_key=api_key)
        self._model_name = model_name
        self._fallback_model_name = "gemini-2.0-flash"
        self._model = genai.GenerativeModel(model_name)

    def generate_stream(self, prompt: str) -> Iterator[str]:
        try:
            yield from self._generate_with_model(prompt)
            return
        except g_exceptions.NotFound:
            if self._model_name != self._fallback_model_name:
                self._model = genai.GenerativeModel(self._fallback_model_name)
                self._model_name = self._fallback_model_name
                yield from self._generate_with_model(prompt)
                return
            raise
        except g_exceptions.ResourceExhausted as exc:
            raise LLMQuotaError("Gemini quota exceeded.") from exc

    def _generate_with_model(self, prompt: str) -> Iterator[str]:
        response_stream = self._model.generate_content(prompt, stream=True)
        for chunk in response_stream:
            text = getattr(chunk, "text", None)
            if text:
                yield text
