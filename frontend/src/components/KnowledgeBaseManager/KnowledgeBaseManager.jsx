import { useState, useEffect, useRef, useCallback } from "react";
import "./KnowledgeBaseManager.css";

const SUPPORTED_EXTENSIONS = [".pdf", ".txt", ".md"];
const MAX_FILE_SIZE_MB = 10;

/**
 * KnowledgeBaseManager - Developer & Admin UI for managing SnapBot RAG documents.
 *
 * @param {Object} props
 * @param {string} [props.apiUrl="http://localhost:8000"] - Base URL of the SnapBot backend.
 * @param {string} [props.knowledgeBaseId="default"] - Target knowledge base identifier.
 * @param {function} [props.onDocumentChange] - Optional callback triggered on upload or deletion.
 */
export function KnowledgeBaseManager({
  apiUrl = "http://localhost:8000",
  knowledgeBaseId = "default",
  onDocumentChange = null,
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/api/knowledge/documents?knowledge_base_id=${encodeURIComponent(
          knowledgeBaseId
        )}`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch documents (${res.status})`);
      }
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch docs error:", err);
      setFeedback({ type: "error", message: "Failed to load document list." });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, knowledgeBaseId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (e) => {
    setFeedback(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Client-side extension check
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setFeedback({
        type: "error",
        message: `Unsupported file format '${ext}'. Please choose a PDF, TXT, or MD document.`,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Client-side size check (10MB limit)
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: `File is too large (${(file.size / (1024 * 1024)).toFixed(
          1
        )}MB). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || uploading) return;

    setUploading(true);
    setFeedback({ type: "info", message: `Processing and embedding '${selectedFile.name}'...` });

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(
        `${apiUrl}/api/knowledge/upload?knowledge_base_id=${encodeURIComponent(
          knowledgeBaseId
        )}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail || `Upload failed with status ${res.status}`);
      }

      setFeedback({
        type: "success",
        message: `Successfully processed '${data.filename}' into ${data.chunks} vector chunks!`,
      });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments();
      if (onDocumentChange) onDocumentChange();
    } catch (err) {
      console.error("Upload error:", err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to upload and process document.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to remove '${filename}' from the knowledge base?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/api/knowledge/documents/${encodeURIComponent(
          docId
        )}?knowledge_base_id=${encodeURIComponent(knowledgeBaseId)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to delete document (${res.status})`);
      }

      setFeedback({
        type: "success",
        message: `Removed '${filename}' and its vector embeddings.`,
      });
      fetchDocuments();
      if (onDocumentChange) onDocumentChange();
    } catch (err) {
      console.error("Delete error:", err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete document.",
      });
    }
  };

  return (
    <div className="snapbot-kb-manager">
      <div className="snapbot-kb-header">
        <div className="snapbot-kb-title-row">
          <span className="snapbot-kb-icon">📚</span>
          <div>
            <h3>Knowledge Base Manager</h3>
            <p>Upload documents (PDF, TXT, MD) to ground SnapBot answers in your custom data.</p>
          </div>
        </div>
        <span className="snapbot-kb-badge">KB: {knowledgeBaseId}</span>
      </div>

      {/* Upload Box */}
      <form className="snapbot-kb-upload-card" onSubmit={handleUpload}>
        <div className="snapbot-kb-dropzone">
          <input
            ref={fileInputRef}
            type="file"
            id="snapbot-kb-file-input"
            accept=".pdf,.txt,.md"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
          />
          <label htmlFor="snapbot-kb-file-input" className="snapbot-kb-file-label">
            <span className="snapbot-kb-upload-icon">📁</span>
            <span className="snapbot-kb-choose-text">
              {selectedFile ? selectedFile.name : "Choose a file (PDF, TXT, MD)"}
            </span>
            <span className="snapbot-kb-size-limit">Max {MAX_FILE_SIZE_MB}MB</span>
          </label>
        </div>

        <button
          type="submit"
          className="snapbot-kb-upload-btn"
          disabled={!selectedFile || uploading}
        >
          {uploading ? "Embedding Document..." : "Upload & Index"}
        </button>
      </form>

      {/* Status Feedback Banner */}
      {feedback && (
        <div className={`snapbot-kb-feedback ${feedback.type}`} role="alert">
          <span>{feedback.type === "success" ? "✓" : feedback.type === "error" ? "⚠" : "ℹ"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Document List */}
      <div className="snapbot-kb-doc-section">
        <div className="snapbot-kb-doc-header">
          <h4>Indexed Documents ({documents.length})</h4>
          <button
            type="button"
            className="snapbot-kb-refresh-btn"
            onClick={fetchDocuments}
            disabled={loading}
            title="Refresh document list"
          >
            ↻
          </button>
        </div>

        {loading ? (
          <div className="snapbot-kb-loading">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="snapbot-kb-empty">
            <span>📄</span>
            <p>No documents uploaded yet. Add a PDF, TXT, or MD file above to enable RAG.</p>
          </div>
        ) : (
          <ul className="snapbot-kb-doc-list">
            {documents.map((doc) => (
              <li key={doc.id} className="snapbot-kb-doc-item">
                <div className="snapbot-kb-doc-info">
                  <span className="snapbot-kb-doc-type-badge">{doc.type.toUpperCase()}</span>
                  <div className="snapbot-kb-doc-meta">
                    <strong className="snapbot-kb-doc-name">{doc.filename}</strong>
                    <span className="snapbot-kb-chunk-tag">{doc.chunks} vector chunks</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="snapbot-kb-delete-btn"
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  title="Delete document and embeddings"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default KnowledgeBaseManager;
