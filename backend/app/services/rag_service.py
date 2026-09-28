import uuid
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.services.document_service import document_service
from app.services.embedding_service import get_embedding_provider
from app.vectorstore.chroma_store import vector_store


class RAGService:
    async def process_and_store_document(
        self,
        file_bytes: bytes,
        filename: str,
        knowledge_base_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Orchestrates full ingestion pipeline:
        File -> Text Extraction -> Text Cleaning -> Chunking -> Embedding -> Vector DB
        """
        # 1. Validate file
        ext = document_service.validate_file(
            filename,
            len(file_bytes),
            max_size_mb=settings.RAG_MAX_FILE_SIZE_MB
        )

        # 2. Extract text
        raw_text = document_service.extract_text(file_bytes, filename)

        # 3. Clean text
        cleaned_text = document_service.clean_text(raw_text)
        if not cleaned_text:
            raise ValueError("Document contains no usable text after cleaning.")

        # 4. Chunk text
        chunks = document_service.chunk_text(
            cleaned_text,
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP
        )
        if not chunks:
            raise ValueError("Document could not be chunked into meaningful segments.")

        # 5. Generate embeddings
        embedding_provider = get_embedding_provider()
        embeddings = await embedding_provider.embed_texts(chunks)

        # 6. Store in persistent vector DB
        doc_id = str(uuid.uuid4())[:8]
        content_type = ext.lstrip(".").lower()

        vector_store.add_document_chunks(
            knowledge_base_id=knowledge_base_id,
            document_id=doc_id,
            filename=filename,
            content_type=content_type,
            chunks=chunks,
            embeddings=embeddings
        )

        return {
            "id": doc_id,
            "filename": filename,
            "type": content_type,
            "status": "processed",
            "chunks": len(chunks)
        }

    async def retrieve_context_and_sources(
        self,
        query: str,
        knowledge_base_id: str = "default",
        top_k: int = 5
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generates query embedding, performs vector similarity search,
        and constructs grounded context and clean source citations.
        """
        query_text = query.strip()
        if not query_text:
            return "", []

        embedding_provider = get_embedding_provider()
        query_embedding = await embedding_provider.embed_query(query_text)

        matches = vector_store.search_similar(
            knowledge_base_id=knowledge_base_id,
            query_embedding=query_embedding,
            top_k=top_k
        )

        if not matches:
            return "", []

        context_parts: List[str] = []
        sources: List[Dict[str, Any]] = []
        seen_chunks = set()

        for idx, match in enumerate(matches, 1):
            content = match.get("content", "").strip()
            meta = match.get("metadata", {})
            doc_id = meta.get("document_id", "unknown")
            fname = meta.get("filename", "unknown")
            chunk_idx = meta.get("chunk_index", 0)

            chunk_key = f"{doc_id}_{chunk_idx}"
            if chunk_key not in seen_chunks:
                seen_chunks.add(chunk_key)
                sources.append({
                    "document_id": doc_id,
                    "filename": fname,
                    "chunk_index": chunk_idx
                })

            context_parts.append(
                f"[Source {idx} - {fname} (chunk {chunk_idx})]\n{content}"
            )

        combined_context = "\n\n".join(context_parts)
        return combined_context, sources

    def build_grounded_system_prompt(self, context_text: str) -> str:
        """Constructs a grounded RAG system instruction for the AI model."""
        if not context_text:
            return (
                "You are SnapBot, a helpful AI assistant.\n\n"
                "The user requested information from their knowledge base, but no relevant documents "
                "or contents were found. Inform the user politely that the requested information "
                "is not available in the uploaded knowledge base."
            )

        return (
            "You are SnapBot, an intelligent and grounded AI assistant.\n\n"
            "Answer the user's question using the provided knowledge base context below.\n\n"
            "Strict Guidelines:\n"
            "1. Answer based on the provided context.\n"
            "2. Do not invent or hallucinate facts that are not supported by the context.\n"
            "3. If the answer cannot be found in the provided context, state clearly that the "
            "information is not available in the knowledge base.\n"
            "4. Be concise, well-structured, and accurate.\n"
            "5. Cite the source document name when helpful.\n\n"
            "=== KNOWLEDGE BASE CONTEXT ===\n"
            f"{context_text}\n"
            "==============================\n"
        )


rag_service = RAGService()
