import io
import re
from typing import List
from pypdf import PdfReader
from pypdf.errors import PdfReadError


class DocumentService:
    SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}

    def validate_file(self, filename: str, file_size: int, max_size_mb: int = 10) -> str:
        """Validate filename extension and file size."""
        if not filename or "." not in filename:
            raise ValueError("Invalid filename: missing extension.")

        ext = "." + filename.rsplit(".", 1)[-1].lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext}'. Supported file formats: {', '.join(sorted(self.SUPPORTED_EXTENSIONS))}"
            )

        max_bytes = max_size_mb * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(f"File size exceeds maximum allowed limit of {max_size_mb}MB.")

        if file_size == 0:
            raise ValueError("File is empty.")

        return ext

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        """Extract raw text from PDF, TXT, or Markdown documents."""
        ext = "." + filename.rsplit(".", 1)[-1].lower()

        if ext == ".pdf":
            return self._extract_pdf(file_bytes)
        elif ext in (".txt", ".md"):
            return self._extract_text_file(file_bytes)
        else:
            raise ValueError(f"Unsupported file extension '{ext}'.")

    def _extract_pdf(self, file_bytes: bytes) -> str:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            if reader.is_encrypted:
                try:
                    reader.decrypt("")
                except Exception:
                    raise ValueError("Password-protected PDFs are not supported.")

            pages_text: List[str] = []
            for page_idx, page in enumerate(reader.pages):
                try:
                    text = page.extract_text() or ""
                    if text.strip():
                        pages_text.append(text.strip())
                except Exception as page_err:
                    # Continue extracting remaining readable pages
                    continue

            combined = "\n\n".join(pages_text).strip()
            if not combined:
                raise ValueError("This PDF does not contain extractable text. OCR support is not available yet.")

            return combined
        except (PdfReadError, Exception) as e:
            if "does not contain extractable text" in str(e) or "Password-protected" in str(e):
                raise e
            raise ValueError(f"Failed to read or parse PDF: {str(e)}")

    def _extract_text_file(self, file_bytes: bytes) -> str:
        # Try UTF-8 first, fallback to latin-1
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception:
                text = file_bytes.decode("utf-8", errors="replace")

        if not text.strip():
            raise ValueError("Document contains no text content.")
        return text

    def clean_text(self, raw_text: str) -> str:
        """Normalize extracted text without destroying structure."""
        if not raw_text:
            return ""

        # Remove null bytes
        text = raw_text.replace("\x00", "")

        # Normalize line endings
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # Replace excessive whitespace on individual lines
        lines = [re.sub(r"[ \t]+", " ", line).rstrip() for line in text.split("\n")]

        # Recombine lines and collapse 3+ consecutive newlines to 2
        normalized = "\n".join(lines)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)

        return normalized.strip()

    def chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 150
    ) -> List[str]:
        """
        Split normalized text into overlapping chunks using paragraph and sentence boundaries.
        """
        if not text:
            return []

        if len(text) <= chunk_size:
            return [text]

        chunks: List[str] = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = min(start + chunk_size, text_length)

            # If not at the end of the text, look for a clean break point
            if end < text_length:
                # 1. Look for double newline (paragraph break) within last 20% of chunk
                search_region = text[start + int(chunk_size * 0.7) : end]
                para_break = search_region.rfind("\n\n")
                if para_break != -1:
                    end = start + int(chunk_size * 0.7) + para_break + 2
                else:
                    # 2. Look for sentence termination (.!?\n)
                    sentence_match = re.search(r"([.!?]\s+|\n)", search_region)
                    if sentence_match:
                        last_period = search_region.rfind(". ")
                        if last_period != -1:
                            end = start + int(chunk_size * 0.7) + last_period + 2
                        else:
                            last_space = search_region.rfind(" ")
                            if last_space != -1:
                                end = start + int(chunk_size * 0.7) + last_space + 1

            chunk = text[start:end].strip()
            if chunk and len(chunk) > 15:  # Skip trivial micro-chunks
                chunks.append(chunk)

            if end >= text_length:
                break

            # Slide window with overlap
            start = max(end - chunk_overlap, start + 1)

        return chunks


document_service = DocumentService()
