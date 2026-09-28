from typing import AsyncGenerator, List, Dict
from google import genai
from google.genai import types
from google.genai import errors
from app.config import settings
from app.providers.base import BaseAIProvider

PRIMARY_MODEL = "gemini-3.1-flash-lite"
FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.7-flash"]
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class GeminiProvider(BaseAIProvider):
    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "gemini"

    def validate_credentials(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not configured in backend/.env. "
                "Please configure GEMINI_API_KEY or set AI_PROVIDER=openai / AI_PROVIDER=ollama."
            )

    def _get_client(self) -> genai.Client:
        if self._client is None:
            self.validate_credentials()
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def _build_contents(self, messages: List[Dict[str, str]]) -> List[types.Content]:
        contents: List[types.Content] = []
        for m in messages:
            text = m.get("content", "").strip()
            if not text:
                continue
            role = "model" if m.get("role") == "assistant" else "user"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=text)]
                )
            )
        return contents

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> AsyncGenerator[str, None]:
        client = self._get_client()
        contents = self._build_contents(messages)
        if not contents:
            raise ValueError("No valid message content to send.")

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            max_output_tokens=1000,
            temperature=0.7
        )

        models_to_try = [PRIMARY_MODEL] + FALLBACK_MODELS
        last_error = None

        for idx, model_name in enumerate(models_to_try):
            try:
                response_stream = await client.aio.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                async for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
                return
            except errors.APIError as e:
                last_error = e
                code = getattr(e, "code", None)
                if code in RETRYABLE_STATUS_CODES and idx < len(models_to_try) - 1:
                    continue
                raise e
            except Exception as e:
                last_error = e
                if idx < len(models_to_try) - 1:
                    continue
                raise e

        if last_error:
            raise last_error

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> str:
        full_text = ""
        async for chunk in self.stream_chat(messages, system_instruction):
            full_text += chunk
        return full_text
