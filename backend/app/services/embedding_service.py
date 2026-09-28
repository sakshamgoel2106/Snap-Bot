from abc import ABC, abstractmethod
from typing import List
from google import genai
from app.config import settings


class BaseEmbeddingProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def validate_credentials(self) -> None:
        pass

    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        pass


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "gemini"

    def validate_credentials(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not configured. An API key is required to generate vector embeddings."
            )

    def _get_client(self) -> genai.Client:
        if self._client is None:
            self.validate_credentials()
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        client = self._get_client()
        # Batch in chunks of 50 to respect API rate and payload guidelines
        all_embeddings: List[List[float]] = []
        batch_size = 50

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                res = await client.aio.models.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    contents=batch
                )
                for emb in res.embeddings:
                    all_embeddings.append(list(emb.values))
            except Exception as e:
                raise RuntimeError(f"Gemini embedding generation failed: {str(e)}")

        return all_embeddings

    async def embed_query(self, query: str) -> List[float]:
        results = await self.embed_texts([query])
        if not results:
            raise RuntimeError("Failed to generate embedding for search query.")
        return results[0]


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "openai"

    def validate_credentials(self) -> None:
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not configured for OpenAI embeddings."
            )

    def _get_client(self):
        if self._client is None:
            self.validate_credentials()
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        client = self._get_client()
        model_name = settings.EMBEDDING_MODEL if "text-embedding" in settings.EMBEDDING_MODEL else "text-embedding-3-small"
        try:
            response = await client.embeddings.create(
                input=texts,
                model=model_name
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            raise RuntimeError(f"OpenAI embedding generation failed: {str(e)}")

    async def embed_query(self, query: str) -> List[float]:
        results = await self.embed_texts([query])
        if not results:
            raise RuntimeError("Failed to generate embedding for query.")
        return results[0]


def get_embedding_provider() -> BaseEmbeddingProvider:
    provider_name = settings.EMBEDDING_PROVIDER.lower()
    if provider_name == "gemini":
        provider = GeminiEmbeddingProvider()
    elif provider_name == "openai":
        provider = OpenAIEmbeddingProvider()
    else:
        # Default to Gemini
        provider = GeminiEmbeddingProvider()

    provider.validate_credentials()
    return provider
