from functools import lru_cache
from app.config import settings
from app.providers.base import BaseAIProvider
from app.providers.gemini import GeminiProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.ollama import OllamaProvider


@lru_cache(maxsize=1)
def get_ai_provider() -> BaseAIProvider:
    """
    Factory function returning the configured AI Provider.
    Only validates credentials for the active provider.
    """
    provider_name = settings.AI_PROVIDER

    if provider_name == "gemini":
        provider = GeminiProvider()
    elif provider_name == "openai":
        provider = OpenAIProvider()
    elif provider_name == "ollama":
        provider = OllamaProvider()
    else:
        raise ValueError(
            f"Unsupported AI_PROVIDER '{provider_name}'. Supported providers: 'gemini', 'openai', 'ollama'."
        )

    # Validate that credentials/configuration for the chosen provider exist
    provider.validate_credentials()
    return provider
