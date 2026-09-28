import json
from typing import AsyncGenerator, List, Dict
import httpx
from app.config import settings
from app.providers.base import BaseAIProvider


class OllamaProvider(BaseAIProvider):
    @property
    def name(self) -> str:
        return "ollama"

    def validate_credentials(self) -> None:
        # Local Ollama does not require an API key
        if not settings.OLLAMA_BASE_URL:
            raise ValueError("OLLAMA_BASE_URL must be specified (e.g. http://localhost:11434).")

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
            role = "assistant" if role in ("assistant", "model") else "user"
            formatted.append({"role": role, "content": content})
        return formatted

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> AsyncGenerator[str, None]:
        self.validate_credentials()
        url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "messages": self._build_payload_messages(messages, system_instruction),
            "stream": True,
            "options": {
                "temperature": 0.7
            }
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        err_text = await response.aread()
                        raise RuntimeError(f"Ollama returned HTTP {response.status_code}: {err_text.decode('utf-8', errors='ignore')}")

                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                            if data.get("error"):
                                raise RuntimeError(f"Ollama error: {data['error']}")
                            msg = data.get("message", {})
                            content_piece = msg.get("content", "")
                            if content_piece:
                                yield content_piece
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            raise RuntimeError(
                f"Unable to connect to Ollama at {settings.OLLAMA_BASE_URL}. "
                "Make sure Ollama is installed and running (e.g. run 'ollama serve')."
            )
        except Exception as e:
            raise RuntimeError(f"Ollama provider error: {str(e)}")

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> str:
        full_text = ""
        async for chunk in self.stream_chat(messages, system_instruction):
            full_text += chunk
        return full_text
