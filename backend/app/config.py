import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Explicitly load .env from backend root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    # Selected AI Provider: "gemini" | "openai" | "ollama"
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini").strip().lower()

    # Gemini settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()

    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "").strip()
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

    # Ollama settings
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip().rstrip("/")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2").strip()

    # CORS origins
    @classmethod
    def get_cors_origins(cls) -> List[str]:
        raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
        origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
        return origins if origins else ["http://localhost:5173"]

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "30"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    # Security limits
    MAX_MESSAGE_LENGTH: int = 4000
    MAX_HISTORY_LENGTH: int = 30

    # RAG / Knowledge Base Settings
    RAG_ENABLED: bool = os.getenv("RAG_ENABLED", "true").strip().lower() == "true"
    RAG_CHUNK_SIZE: int = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
    RAG_CHUNK_OVERLAP: int = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "5"))
    RAG_MAX_FILE_SIZE_MB: int = int(os.getenv("RAG_MAX_FILE_SIZE_MB", "10"))

    # Embedding settings
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "gemini").strip().lower()
    # gemini-embedding-001 is validated for current Google GenAI API
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001").strip()

    # Vector DB storage path (resolved relative to backend directory)
    VECTOR_DB_PATH: str = os.getenv(
        "VECTOR_DB_PATH",
        str(Path(__file__).resolve().parent.parent / "data" / "chroma")
    ).strip()


settings = Settings()
