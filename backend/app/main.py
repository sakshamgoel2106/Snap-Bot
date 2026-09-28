from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import chat
from app.routes import knowledge

app = FastAPI(
    title="SnapBot API",
    description="Backend API for the embeddable SnapBot AI chatbot widget with Knowledge Base / RAG support.",
    version="0.2.0"
)

# Configure CORS safely based on environment variables
origins = settings.get_cors_origins()
has_wildcard = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=not has_wildcard,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(knowledge.router)


@app.get("/")
async def root():
    return {
        "message": "SnapBot backend is running 🚀",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health():
    """Safe health check endpoint without exposing sensitive credentials."""
    return {
        "status": "ok",
        "provider": settings.AI_PROVIDER,
        "rag_enabled": settings.RAG_ENABLED
    }