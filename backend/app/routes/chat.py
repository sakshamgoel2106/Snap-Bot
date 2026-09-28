import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from app.config import settings
from app.services.chat_service import chat_service
from app.services.rag_service import rag_service
from app.middleware.rate_limiter import check_rate_limit

logger = logging.getLogger("snapbot.chat")

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
    dependencies=[Depends(check_rate_limit)]
)


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text")

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message content cannot be empty.")
        if len(v) > settings.MAX_MESSAGE_LENGTH:
            raise ValueError(f"Message exceeds maximum allowed length of {settings.MAX_MESSAGE_LENGTH} characters.")
        return v.strip()


class ChatRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None
    history: Optional[List[ChatMessage]] = None
    session_id: Optional[str] = None
    stream: Optional[bool] = True
    use_knowledge_base: Optional[bool] = False
    knowledge_base_id: Optional[str] = "default"

    @field_validator("message")
    @classmethod
    def validate_single_message(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_stripped = v.strip()
            if len(v_stripped) > settings.MAX_MESSAGE_LENGTH:
                raise ValueError(f"Message exceeds maximum allowed length of {settings.MAX_MESSAGE_LENGTH} characters.")
            return v_stripped
        return v


@router.post("/")
async def chat_endpoint(request: ChatRequest):
    dict_messages = [m.model_dump() for m in request.messages] if request.messages else None
    dict_history = [m.model_dump() for m in request.history] if request.history else None

    try:
        sanitized = chat_service.sanitize_and_prepare_messages(
            new_message=request.message,
            messages=dict_messages,
            history=dict_history
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    # RAG Retrieval: If requested and enabled, retrieve relevant context chunks
    system_instruction = None
    sources: List[Dict[str, Any]] = []

    if request.use_knowledge_base and settings.RAG_ENABLED:
        try:
            # Extract latest user message for similarity search
            user_queries = [m["content"] for m in sanitized if m.get("role") == "user"]
            latest_query = user_queries[-1] if user_queries else (request.message or "")

            kb_id = (request.knowledge_base_id or "default").strip()
            context_text, retrieved_sources = await rag_service.retrieve_context_and_sources(
                query=latest_query,
                knowledge_base_id=kb_id,
                top_k=settings.RAG_TOP_K
            )
            sources = retrieved_sources
            system_instruction = rag_service.build_grounded_system_prompt(context_text)
        except Exception as rag_err:
            logger.warning(f"RAG retrieval warning (falling back to standard generation): {str(rag_err)}")
            # Do not crash chat completely if RAG retrieval experiences an issue

    # 1. Streaming response (SSE)
    if request.stream:
        async def event_generator():
            try:
                # If sources found, send metadata event first
                if sources:
                    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

                async for chunk_text in chat_service.stream_chat_response(
                    sanitized,
                    system_instruction=system_instruction
                ):
                    data = json.dumps({"text": chunk_text})
                    yield f"data: {data}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Chat streaming error: {str(e)}")
                err_msg = str(e)
                if "API_KEY" in err_msg or "apikey" in err_msg.lower():
                    err_msg = "AI service credentials error. Please contact the administrator."
                err_data = json.dumps({"error": err_msg})
                yield f"data: {err_data}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    # 2. Non-streaming fallback response
    try:
        full_text = await chat_service.generate_chat_response(
            sanitized,
            system_instruction=system_instruction
        )
        return {
            "reply": full_text,
            "response": full_text,
            "sources": sources,
            "session_id": request.session_id
        }
    except Exception as e:
        logger.error(f"Chat non-streaming error: {str(e)}")
        err_msg = str(e)
        if "API_KEY" in err_msg or "apikey" in err_msg.lower():
            err_msg = "AI service credentials error."
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err_msg
        )