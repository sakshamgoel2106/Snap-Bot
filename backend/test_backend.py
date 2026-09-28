import unittest
import io
from starlette.testclient import TestClient
from app.main import app
from app.config import settings
from app.providers.gemini import GeminiProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.ollama import OllamaProvider
from app.services.document_service import document_service
from app.services.rag_service import rag_service
from app.vectorstore.chroma_store import vector_store


class TestSnapBotBackend(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("provider"), settings.AI_PROVIDER)
        self.assertTrue(data.get("rag_enabled"))
        # Ensure no sensitive credentials leaked
        self.assertNotIn("key", str(data).lower())
        self.assertNotIn("secret", str(data).lower())

    def test_empty_message_validation(self):
        response = self.client.post("/api/chat/", json={})
        self.assertEqual(response.status_code, 400)

        response = self.client.post("/api/chat/", json={"message": "   "})
        self.assertEqual(response.status_code, 400)

    def test_oversized_message_validation(self):
        huge_message = "A" * (settings.MAX_MESSAGE_LENGTH + 50)
        response = self.client.post("/api/chat/", json={"message": huge_message})
        self.assertEqual(response.status_code, 422)

    def test_history_validation(self):
        response = self.client.post("/api/chat/", json={
            "history": [{"role": "user", "content": "  "}]
        })
        self.assertEqual(response.status_code, 422)

    def test_provider_selection_and_validation(self):
        gemini = GeminiProvider()
        self.assertEqual(gemini.name, "gemini")

        openai = OpenAIProvider()
        self.assertEqual(openai.name, "openai")

        ollama = OllamaProvider()
        self.assertEqual(ollama.name, "ollama")

    def test_cors_configuration(self):
        origins = settings.get_cors_origins()
        self.assertIsInstance(origins, list)
        self.assertGreater(len(origins), 0)

    # ================= RAG & DOCUMENT TESTS =================

    def test_document_validation(self):
        # Unsupported file type (.exe)
        with self.assertRaises(ValueError):
            document_service.validate_file("malicious.exe", 1024)

        # Empty file (0 bytes)
        with self.assertRaises(ValueError):
            document_service.validate_file("empty.txt", 0)

        # Oversized file (>10MB)
        with self.assertRaises(ValueError):
            document_service.validate_file("big.pdf", 15 * 1024 * 1024, max_size_mb=10)

        # Valid files
        self.assertEqual(document_service.validate_file("doc.txt", 100), ".txt")
        self.assertEqual(document_service.validate_file("doc.md", 100), ".md")
        self.assertEqual(document_service.validate_file("doc.pdf", 100), ".pdf")

    def test_text_cleaning_and_chunking(self):
        raw = "Hello   world!\r\n\r\n\r\n\r\nParagraph two.\n"
        cleaned = document_service.clean_text(raw)
        self.assertEqual(cleaned, "Hello world!\n\nParagraph two.")

        long_text = "Sentence one. " * 100
        chunks = document_service.chunk_text(long_text, chunk_size=200, chunk_overlap=30)
        self.assertGreater(len(chunks), 1)
        for chunk in chunks:
            self.assertLessEqual(len(chunk), 250)

    def test_upload_txt_and_markdown(self):
        # 1. Upload TXT
        txt_content = b"SnapBot is an open-source chatbot widget created for React applications."
        response = self.client.post(
            "/api/knowledge/upload?knowledge_base_id=test_kb",
            files={"file": ("snapbot_info.txt", io.BytesIO(txt_content), "text/plain")}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["filename"], "snapbot_info.txt")
        self.assertEqual(data["type"], "txt")
        self.assertEqual(data["status"], "processed")
        self.assertGreaterEqual(data["chunks"], 1)
        doc1_id = data["id"]

        # 2. Upload Markdown
        md_content = b"# API Guide\n\nSnapBot supports Gemini, OpenAI, and Ollama providers."
        response_md = self.client.post(
            "/api/knowledge/upload?knowledge_base_id=test_kb",
            files={"file": ("api_guide.md", io.BytesIO(md_content), "text/markdown")}
        )
        self.assertEqual(response_md.status_code, 200)
        data_md = response_md.json()
        doc2_id = data_md["id"]

        # 3. List documents
        list_res = self.client.get("/api/knowledge/documents?knowledge_base_id=test_kb")
        self.assertEqual(list_res.status_code, 200)
        docs = list_res.json()
        doc_ids = [d["id"] for d in docs]
        self.assertIn(doc1_id, doc_ids)
        self.assertIn(doc2_id, doc_ids)

        # 4. Delete document
        del_res = self.client.delete(f"/api/knowledge/documents/{doc1_id}?knowledge_base_id=test_kb")
        self.assertEqual(del_res.status_code, 200)

        # Verify deletion
        list_res_after = self.client.get("/api/knowledge/documents?knowledge_base_id=test_kb")
        doc_ids_after = [d["id"] for d in list_res_after.json()]
        self.assertNotIn(doc1_id, doc_ids_after)
        self.assertIn(doc2_id, doc_ids_after)

        # Clean up doc2
        self.client.delete(f"/api/knowledge/documents/{doc2_id}?knowledge_base_id=test_kb")

    def test_rag_chat_with_and_without_knowledge_base(self):
        # Chat without RAG continues working as usual
        res_standard = self.client.post(
            "/api/chat/",
            json={"message": "Respond with PONG", "use_knowledge_base": False, "stream": False}
        )
        self.assertEqual(res_standard.status_code, 200)
        self.assertIn("PONG", res_standard.json().get("reply", "").upper())

        # Chat with RAG on empty KB safely falls back without crash
        res_rag = self.client.post(
            "/api/chat/",
            json={"message": "What is in the secret document?", "use_knowledge_base": True, "knowledge_base_id": "nonexistent_kb", "stream": False}
        )
        self.assertEqual(res_rag.status_code, 200)
        self.assertIn("reply", res_rag.json())


if __name__ == "__main__":
    unittest.main()
