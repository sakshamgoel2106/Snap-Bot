import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings


class ChromaVectorStore:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.VECTOR_DB_PATH
        Path(self.db_path).mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=self.db_path,
            settings=ChromaSettings(anonymized_telemetry=False)
        )

    def _get_collection_name(self, knowledge_base_id: str) -> str:
        clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", knowledge_base_id.strip() or "default")
        # Chroma collection names must be 3-63 characters, start and end with alphanumeric
        col_name = f"kb_{clean_id}"
        if len(col_name) > 63:
            col_name = col_name[:63]
        return col_name

    def _get_collection(self, knowledge_base_id: str):
        col_name = self._get_collection_name(knowledge_base_id)
        # embedding_function=None ensures Chroma uses our custom embedding vectors directly
        return self._client.get_or_create_collection(
            name=col_name,
            embedding_function=None,
            metadata={"hnsw:space": "cosine"}
        )

    def add_document_chunks(
        self,
        knowledge_base_id: str,
        document_id: str,
        filename: str,
        content_type: str,
        chunks: List[str],
        embeddings: List[List[float]],
    ) -> int:
        """Store chunk texts, embeddings, and metadata into ChromaDB."""
        if not chunks or not embeddings or len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings must be non-empty and of matching lengths.")

        col = self._get_collection(knowledge_base_id)
        ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "document_id": document_id,
                "filename": filename,
                "type": content_type,
                "chunk_index": i,
                "knowledge_base_id": knowledge_base_id,
            }
            for i in range(len(chunks))
        ]

        col.add(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas
        )
        return len(chunks)

    def search_similar(
        self,
        knowledge_base_id: str,
        query_embedding: List[float],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Retrieve the top-k most similar chunks for a given query vector."""
        col = self._get_collection(knowledge_base_id)
        count = col.count()
        if count == 0:
            return []

        actual_k = min(top_k, count)
        results = col.query(
            query_embeddings=[query_embedding],
            n_results=actual_k,
            include=["documents", "metadatas", "distances"]
        )

        matched: List[Dict[str, Any]] = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0] if "distances" in results else [0.0] * len(docs)

        for doc, meta, dist in zip(docs, metas, dists):
            matched.append({
                "content": doc,
                "metadata": meta,
                "distance": dist
            })

        return matched

    def list_documents(self, knowledge_base_id: str) -> List[Dict[str, Any]]:
        """List distinct documents and their total chunk counts in the given knowledge base."""
        col = self._get_collection(knowledge_base_id)
        count = col.count()
        if count == 0:
            return []

        # Retrieve metadatas for all chunks in collection
        all_data = col.get(include=["metadatas"])
        metas = all_data.get("metadatas", [])

        docs_map: Dict[str, Dict[str, Any]] = {}
        for m in metas:
            if not m:
                continue
            doc_id = m.get("document_id")
            if not doc_id:
                continue
            if doc_id not in docs_map:
                docs_map[doc_id] = {
                    "id": doc_id,
                    "filename": m.get("filename", "unknown"),
                    "type": m.get("type", "unknown"),
                    "chunks": 0
                }
            docs_map[doc_id]["chunks"] += 1

        return list(docs_map.values())

    def delete_document(self, knowledge_base_id: str, document_id: str) -> bool:
        """Delete all chunks and vectors belonging to the specified document."""
        col = self._get_collection(knowledge_base_id)
        # Check if document chunks exist
        existing = col.get(where={"document_id": document_id}, include=["metadatas"])
        if not existing.get("ids"):
            return False

        col.delete(where={"document_id": document_id})
        return True


vector_store = ChromaVectorStore()
