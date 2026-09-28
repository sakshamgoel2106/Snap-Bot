import os
import re
import logging
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status
from pydantic import BaseModel
from app.config import settings
from app.services.rag_service import rag_service
from app.vectorstore.chroma_store import vector_store

logger = logging.getLogger("snapbot.knowledge")

router = APIRouter(
    prefix="/api/knowledge",
    tags=["knowledge"]
)


class DocumentSummary(BaseModel):
    id: str
    filename: str
    type: str
    chunks: int


class UploadResponse(BaseModel):
    id: str
    filename: str
    type: str
    status: str
    chunks: int


class DeleteResponse(BaseModel):
    status: str
    document_id: str


def sanitize_filename(filename: str) -> str:
    """Strip directories and special characters to prevent path traversal."""
    base = os.path.basename(filename)
    # Remove potentially dangerous characters
    cleaned = re.sub(r"[^\w\.\-\s]", "_", base).strip()
    return cleaned or "document.txt"


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    knowledge_base_id: Optional[str] = Query("default", description="Target knowledge base ID")
):
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RAG / Knowledge base functionality is currently disabled on this server."
        )

    clean_kb_id = (knowledge_base_id or "default").strip()
    safe_filename = sanitize_filename(file.filename or "uploaded_file")

    try:
        content_bytes = await file.read()
        if not content_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty."
            )

        result = await rag_service.process_and_store_document(
            file_bytes=content_bytes,
            filename=safe_filename,
            knowledge_base_id=clean_kb_id
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to process uploaded document '{safe_filename}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )


@router.get("/documents", response_model=List[DocumentSummary])
async def list_documents(
    knowledge_base_id: Optional[str] = Query("default", description="Target knowledge base ID")
):
    clean_kb_id = (knowledge_base_id or "default").strip()
    try:
        docs = vector_store.list_documents(clean_kb_id)
        return docs
    except Exception as e:
        logger.error(f"Error listing documents for KB '{clean_kb_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document list."
        )


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
async def delete_document(
    document_id: str,
    knowledge_base_id: Optional[str] = Query("default", description="Target knowledge base ID")
):
    clean_kb_id = (knowledge_base_id or "default").strip()
    clean_doc_id = document_id.strip()

    try:
        deleted = vector_store.delete_document(clean_kb_id, clean_doc_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{clean_doc_id}' not found in knowledge base '{clean_kb_id}'."
            )
        return {
            "status": "deleted",
            "document_id": clean_doc_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document '{clean_doc_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document."
        )
