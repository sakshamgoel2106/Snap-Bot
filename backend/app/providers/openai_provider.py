from typing import AsyncGenerator, List, Dict
from openai import AsyncOpenAI, APIError
from app.config import settings
from app.providers.base import BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "openai"

    def validate_credentials(self) -> None:
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not configured in backend/.env. "
                "Please configure OPENAI_API_KEY or set AI_PROVIDER=gemini / AI_PROVIDER=ollama."
            )

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            self.validate_credentials()
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def _build_payload_messages(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> List[Dict[str, str]]:
        formatted = [{"role": "system", "content": system_instruction}]
        for m in messages:
            content = m.get("content", "").strip()
            if not content:
                continue
            role = m.get("role", "user")
            # Normalize role: assistant or user
            role = "assistant" if role in ("assistant", "model") else "user"
            formatted.append({"role": role, "content": content})
        return formatted

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> AsyncGenerator[str, None]:
        client = self._get_client()
        formatted_msgs = self._build_payload_messages(messages, system_instruction)

        try:
            stream = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=formatted_msgs,
                temperature=0.7,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except APIError as e:
            raise RuntimeError(f"OpenAI API Error ({e.status_code}): {e.message}")
        except Exception as e:
            raise RuntimeError(f"OpenAI service error: {str(e)}")

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> str:
        client = self._get_client()
        formatted_msgs = self._build_payload_messages(messages, system_instruction)

        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=formatted_msgs,
                temperature=0.7,
                stream=False
            )
            return response.choices[0].message.content or ""
        except APIError as e:
            raise RuntimeError(f"OpenAI API Error ({e.status_code}): {e.message}")
        except Exception as e:
            raise RuntimeError(f"OpenAI service error: {str(e)}")
