from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Dict


class BaseAIProvider(ABC):
    """
    Abstract interface for all SnapBot AI providers.
    Enables swapping between Gemini, OpenAI, Ollama, etc. seamlessly.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique provider identifier (e.g. 'gemini', 'openai', 'ollama')."""
        pass

    @abstractmethod
    def validate_credentials(self) -> None:
        """
        Verify that necessary API keys or configurations exist.
        Raises ValueError or HTTPException if credentials are missing.
        """
        pass

    @abstractmethod
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> AsyncGenerator[str, None]:
        """
        Yield text chunks incrementally for Server-Sent Events (SSE).
        """
        pass

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str
    ) -> str:
        """
        Return the complete response text (non-streaming fallback).
        """
        pass
