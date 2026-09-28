import { useState, useRef, useEffect, useCallback } from "react";
import "./SnapBotWidget.css";
import { MarkdownRenderer } from "./MarkdownRenderer.jsx";

/**
 * Helper to generate a lightweight unique session ID.
 */
function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * SnapBotWidget - Production-ready, embeddable, customizable floating AI chatbot widget.
 *
 * @param {Object} props
 * @param {string} [props.apiUrl="http://localhost:8000"] - Backend API URL.
 * @param {string} [props.botName="SnapBot"] - Display name for the chatbot.
 * @param {string} [props.welcomeMessage="How can I help you today?"] - Initial greeting message.
 * @param {string} [props.placeholder="Ask something..."] - Input textfield placeholder.
 * @param {string} [props.primaryColor="#111827"] - Main brand color (header, button, user bubble, focus ring).
 * @param {"bottom-right" | "bottom-left"} [props.position="bottom-right"] - Corner screen positioning.
 * @param {number | string} [props.width=380] - Modal window width in pixels.
 * @param {number | string} [props.height=560] - Modal window height in pixels.
 * @param {string[]} [props.suggestedPrompts=[]] - Optional quick prompt chips for empty state.
 * @param {boolean} [props.persistChat=false] - Whether to persist chat history in localStorage.
 * @param {string} [props.storageKey=""] - Custom localStorage key.
 * @param {"light" | "dark" | "auto"} [props.theme="light"] - Theme mode.
 * @param {boolean} [props.showClearButton=true] - Whether to show the clear chat button.
 * @param {boolean} [props.showBranding=true] - Whether to display the "Powered by SnapBot" badge.
 * @param {boolean} [props.useKnowledgeBase=false] - Enable RAG / Knowledge Base grounding.
 * @param {string} [props.knowledgeBaseId="default"] - Knowledge Base identifier to query.
 * @param {boolean} [props.allowFileUpload=true] - Allow uploading PDF, TXT, and Markdown documents directly in the widget.
 */
export function SnapBotWidget({
  apiUrl = "http://localhost:8000",
  botName = "SnapBot",
  welcomeMessage = "How can I help you today?",
  placeholder = "Ask something...",
  primaryColor = "#111827",
  position = "bottom-right",
  width = 380,
  height = 560,
  suggestedPrompts = [],
  persistChat = false,
  storageKey = "",
  theme = "light",
  showClearButton = true,
  showBranding = true,
  useKnowledgeBase = false,
  knowledgeBaseId = "default",
  allowFileUpload = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  // In-widget document upload & RAG state
  const [uploading, setUploading] = useState(false);
  const [uploadingFilename, setUploadingFilename] = useState("");
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [kbDocs, setKbDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [effectiveUseKnowledgeBase, setEffectiveUseKnowledgeBase] = useState(useKnowledgeBase);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setEffectiveUseKnowledgeBase(useKnowledgeBase);
  }, [useKnowledgeBase]);

  // Dynamic storage keys based on configuration
  const resolvedStorageKey =
    storageKey ||
    `snapbot_chat_${botName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  const sessionKey = `${resolvedStorageKey}_session`;

  // Restore messages from localStorage if persistence is enabled
  const [messages, setMessages] = useState(() => {
    if (persistChat && typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = localStorage.getItem(resolvedStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (err) {
        console.warn("SnapBot: Could not read persisted chat from localStorage", err);
      }
    }
    return [];
  });

  // Session ID state
  const [sessionId, setSessionId] = useState(() => {
    if (persistChat && typeof window !== "undefined" && window.localStorage) {
      try {
        const savedSession = localStorage.getItem(sessionKey);
        if (savedSession) return savedSession;
      } catch (_) {}
    }
    const newId = createSessionId();
    if (persistChat && typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(sessionKey, newId);
      } catch (_) {}
    }
    return newId;
  });

  // Sync completed messages to localStorage
  useEffect(() => {
    if (!persistChat || typeof window === "undefined" || !window.localStorage) return;
    try {
      const persistable = messages.filter((m) => m && m.content);
      if (persistable.length > 0) {
        localStorage.setItem(resolvedStorageKey, JSON.stringify(persistable));
      } else {
        localStorage.removeItem(resolvedStorageKey);
      }
    } catch (err) {
      console.warn("SnapBot: Failed to persist chat to localStorage", err);
    }
  }, [messages, persistChat, resolvedStorageKey]);

  // Positioning & Dimensions
  const isLeft = position === "bottom-left";
  const positionClass = isLeft ? "pos-left" : "pos-right";
  const resolvedWidth = typeof width === "number" ? `${width}px` : width;
  const resolvedHeight = typeof height === "number" ? `${height}px` : height;

  const styleVariables = {
    "--snapbot-primary": primaryColor,
    "--snapbot-width": resolvedWidth,
    "--snapbot-height": resolvedHeight,
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isStreaming, isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setInput("");
    setLoading(false);
    setIsStreaming(false);

    const newId = createSessionId();
    setSessionId(newId);

    if (persistChat && typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(resolvedStorageKey);
        localStorage.setItem(sessionKey, newId);
      } catch (_) {}
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = (text, index) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedIdx(index);
        setTimeout(() => setCopiedIdx(null), 2000);
      }).catch(() => {});
    }
  };

  const handleUploadFile = async (file) => {
    if (!file) return;

    const allowedExts = [".pdf", ".txt", ".md"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Upload Error**: Unsupported file type "${ext}". Please upload a PDF, TXT, or Markdown (.md) file.`,
          sources: [],
        },
      ]);
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Upload Error**: File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed size is 10MB.`,
          sources: [],
        },
      ]);
      return;
    }

    setUploading(true);
    setUploadingFilename(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${apiUrl}/api/knowledge/upload?knowledge_base_id=${encodeURIComponent(knowledgeBaseId)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Upload failed with status ${res.status}`);
      }

      setEffectiveUseKnowledgeBase(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `📄 **Document indexed**: \`${data.filename}\` (${data.chunks} chunks).\n\nKnowledge base is active for this conversation. You can now ask questions about this document!`,
          sources: [],
        },
      ]);

      if (showDocsModal) {
        fetchDocuments();
      }
    } catch (err) {
      console.error("SnapBot file upload error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Failed to process \`${file.name}\`**: ${err.message}`,
          sources: [],
        },
      ]);
    } finally {
      setUploading(false);
      setUploadingFilename("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(
        `${apiUrl}/api/knowledge/documents?knowledge_base_id=${encodeURIComponent(knowledgeBaseId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setKbDocs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("SnapBot: Could not fetch KB documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  }, [apiUrl, knowledgeBaseId]);

  useEffect(() => {
    if (showDocsModal) {
      fetchDocuments();
    }
  }, [showDocsModal, fetchDocuments]);

  const handleDeleteDoc = async (docId, filename) => {
    try {
      const res = await fetch(
        `${apiUrl}/api/knowledge/documents/${encodeURIComponent(docId)}?knowledge_base_id=${encodeURIComponent(knowledgeBaseId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setKbDocs((prev) => prev.filter((d) => d.id !== docId));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `🗑️ Removed document \`${filename}\` from the knowledge base.`,
            sources: [],
          },
        ]);
      }
    } catch (err) {
      console.error("SnapBot: Failed to delete document:", err);
    }
  };

  const sendMessage = useCallback(
    async (overrideText = null) => {
      const text = (overrideText !== null ? overrideText : input).trim();
      if (!text || loading || isStreaming) return;

      const userMsg = { role: "user", content: text };
      const assistantPlaceholder = { role: "assistant", content: "", sources: [] };
      const updatedMessages = [...messages, userMsg, assistantPlaceholder];

      setMessages(updatedMessages);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      setLoading(true);
      setIsStreaming(true);

      const contextMessages = [...messages, userMsg];
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(`${apiUrl}/api/chat/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
            messages: contextMessages,
            history: contextMessages,
            use_knowledge_base: effectiveUseKnowledgeBase,
            knowledge_base_id: knowledgeBaseId,
            stream: true,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Request limit reached. Please wait a moment before sending more messages.");
          }
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.detail || `Server error (${response.status})`);
        }

        if (!response.body) {
          throw new Error("ReadableStream not supported by browser/response");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let accumulatedText = "";
        let accumulatedSources = [];
        let hasReceivedFirstChunk = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              // Handle RAG source citations metadata event
              if (parsed.type === "sources" && Array.isArray(parsed.sources)) {
                accumulatedSources = parsed.sources;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = {
                    ...copy[copy.length - 1],
                    sources: accumulatedSources,
                  };
                  return copy;
                });
                continue;
              }

              if (parsed.text) {
                accumulatedText += parsed.text;

                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  setLoading(false);
                }

                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = {
                    role: "assistant",
                    content: accumulatedText,
                    sources: accumulatedSources,
                  };
                  return copy;
                });
              }
            } catch (parseErr) {
              if (parseErr.message && !dataStr.startsWith("{")) {
                accumulatedText += dataStr;
                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  setLoading(false);
                }
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = {
                    role: "assistant",
                    content: accumulatedText,
                    sources: accumulatedSources,
                  };
                  return copy;
                });
              }
            }
          }
        }

        if (!accumulatedText) {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: "I did not receive a response. Please try again.",
              sources: [],
            };
            return copy;
          });
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.error("SnapBot fetch error:", err);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: err?.message || "Sorry, I am temporarily unavailable. Please try again.",
            sources: [],
          };
          return copy;
        });
      } finally {
        setLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [apiUrl, input, loading, isStreaming, messages, sessionId, effectiveUseKnowledgeBase, knowledgeBaseId]
  );

  return (
    <>
      {isOpen && (
        <div
          className={`snapbot-window ${positionClass} snapbot-theme-${theme}`}
          style={styleVariables}
          role="dialog"
          aria-label={`${botName} Chat Window`}
          aria-modal="true"
        >
          {/* Header */}
          <div className="snapbot-header">
            <div className="snapbot-header-info">
              <div className="snapbot-avatar" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
                  <rect x="3" y="8" width="18" height="12" rx="4"></rect>
                  <circle cx="9" cy="14" r="1.5" fill="currentColor"></circle>
                  <circle cx="15" cy="14" r="1.5" fill="currentColor"></circle>
                </svg>
              </div>
              <div className="snapbot-header-titles">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong>{botName}</strong>
                  {effectiveUseKnowledgeBase && (
                    <span className="snapbot-kb-indicator-badge" title={`Knowledge Base: ${knowledgeBaseId}`}>
                      RAG
                    </span>
                  )}
                </div>
                <div className="snapbot-status-row">
                  <span className="snapbot-status-dot" aria-hidden="true"></span>
                  <span className="snapbot-status-text">Online</span>
                </div>
              </div>
            </div>

            <div className="snapbot-header-actions">
              {allowFileUpload && (
                <button
                  className={`snapbot-action-btn ${showDocsModal ? "active" : ""}`}
                  onClick={() => setShowDocsModal((prev) => !prev)}
                  title={showDocsModal ? "Back to Chat" : "Knowledge Base Documents"}
                  aria-label="Knowledge Base Documents"
                  type="button"
                >
                  {showDocsModal ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                  )}
                </button>
              )}

              {showClearButton && messages.length > 0 && !showDocsModal && (
                <button
                  className="snapbot-action-btn"
                  onClick={clearChat}
                  title="Clear conversation"
                  aria-label="Clear conversation"
                  type="button"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                  </svg>
                </button>
              )}

              <button
                className="snapbot-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat"
                title="Close chat"
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* In-Widget Knowledge Base Documents Drawer */}
          {showDocsModal && (
            <div className="snapbot-docs-drawer">
              <div className="snapbot-docs-header">
                <div className="snapbot-docs-title">
                  <span>📚 Knowledge Base ({knowledgeBaseId})</span>
                  <span className="snapbot-docs-count">{kbDocs.length}</span>
                </div>
                <button
                  type="button"
                  className="snapbot-docs-close-btn"
                  onClick={() => setShowDocsModal(false)}
                  aria-label="Close documents panel"
                  title="Close panel"
                >
                  ✕
                </button>
              </div>

              <div className="snapbot-docs-body">
                <div className="snapbot-docs-upload-cta">
                  <button
                    type="button"
                    className="snapbot-docs-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? `Uploading ${uploadingFilename}...` : "➕ Upload PDF, TXT, or MD"}
                  </button>
                </div>

                {loadingDocs ? (
                  <div className="snapbot-docs-loading">Loading documents...</div>
                ) : kbDocs.length === 0 ? (
                  <div className="snapbot-docs-empty">
                    <p>No documents uploaded yet.</p>
                    <span>Upload a PDF, TXT, or Markdown document to ground your AI answers in your documents.</span>
                  </div>
                ) : (
                  <div className="snapbot-docs-list">
                    {kbDocs.map((doc) => (
                      <div key={doc.id} className="snapbot-docs-item">
                        <div className="snapbot-docs-item-info">
                          <span className="snapbot-docs-item-icon">
                            {doc.type === "pdf" ? "📕" : doc.type === "md" ? "📝" : "📄"}
                          </span>
                          <div className="snapbot-docs-item-details">
                            <span className="snapbot-docs-item-name" title={doc.filename}>
                              {doc.filename}
                            </span>
                            <span className="snapbot-docs-item-meta">
                              {doc.chunks} chunks
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="snapbot-docs-delete-btn"
                          onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                          title="Delete document"
                          aria-label={`Delete ${doc.filename}`}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div
            className={`snapbot-messages ${isDragging ? "snapbot-dragging" : ""}`}
            role="log"
            aria-live="polite"
            onDragOver={(e) => {
              e.preventDefault();
              if (allowFileUpload) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!allowFileUpload) return;
              const file = e.dataTransfer?.files?.[0];
              if (file) handleUploadFile(file);
            }}
          >
            {isDragging && (
              <div className="snapbot-drag-overlay">
                <div className="snapbot-drag-content">
                  <span className="snapbot-drag-icon">📄</span>
                  <strong>Drop document to upload</strong>
                  <span>PDF, TXT, or MD (max 10MB)</span>
                </div>
              </div>
            )}
            {messages.length === 0 && (
              <div className="snapbot-welcome">
                <div className="snapbot-welcome-icon" aria-hidden="true">⚡</div>
                <h3>Hey there! 👋</h3>
                <p>{welcomeMessage}</p>

                {/* Suggested Prompts */}
                {suggestedPrompts && suggestedPrompts.length > 0 && (
                  <div className="snapbot-suggestions" role="group" aria-label="Suggested prompts">
                    <span className="snapbot-suggestions-title">Suggested prompts</span>
                    <div className="snapbot-suggestions-grid">
                      {suggestedPrompts.map((promptText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="snapbot-suggestion-chip"
                          onClick={() => sendMessage(promptText)}
                        >
                          <span className="snapbot-chip-icon" aria-hidden="true">💬</span>
                          <span>{promptText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, index) => {
              const isAssistantPlaceholder =
                msg.role === "assistant" && !msg.content && loading;

              return (
                <div
                  key={index}
                  className={`snapbot-message-wrapper ${msg.role}`}
                >
                  <div className={`snapbot-message ${msg.role}`}>
                    {isAssistantPlaceholder ? (
                      <div className="snapbot-typing" aria-label="SnapBot is thinking">
                        {useKnowledgeBase ? (
                          <div className="snapbot-rag-searching">
                            <span className="snapbot-rag-icon">🔍</span>
                            <span>Searching knowledge base...</span>
                          </div>
                        ) : (
                          <>
                            <span className="snapbot-dot"></span>
                            <span className="snapbot-dot"></span>
                            <span className="snapbot-dot"></span>
                          </>
                        )}
                      </div>
                    ) : msg.role === "assistant" ? (
                      <>
                        <MarkdownRenderer content={msg.content} />

                        {/* Source Citations */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="snapbot-sources" aria-label="Referenced sources">
                            <span className="snapbot-sources-title">Sources:</span>
                            <div className="snapbot-sources-list">
                              {msg.sources.map((src, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="snapbot-source-chip"
                                  title={`Document ID: ${src.document_id}`}
                                >
                                  📄 {src.filename}
                                  {typeof src.chunk_index === "number"
                                    ? ` (part ${src.chunk_index + 1})`
                                    : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Copy response action on assistant messages */}
                  {msg.role === "assistant" && msg.content && (
                    <div className="snapbot-msg-actions">
                      <button
                        type="button"
                        className="snapbot-msg-action-btn"
                        onClick={() => handleCopyMessage(msg.content, index)}
                        title="Copy answer"
                        aria-label="Copy answer"
                      >
                        {copiedIdx === index ? "✓ Copied" : "📋 Copy"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="snapbot-input-area">
            {isStreaming && (
              <div className="snapbot-streaming-bar">
                <span className="snapbot-streaming-indicator">
                  <span className="snapbot-streaming-pulse"></span>
                  {botName} is typing...
                </span>
                <button
                  type="button"
                  className="snapbot-stop-btn"
                  onClick={stopGeneration}
                  aria-label="Stop generating response"
                >
                  ⏹ Stop
                </button>
              </div>
            )}

            {uploading && (
              <div className="snapbot-upload-status">
                <span className="snapbot-upload-spinner" />
                <span>Indexing <strong>{uploadingFilename}</strong> into knowledge base...</span>
              </div>
            )}

            <div className="snapbot-input-row">
              {allowFileUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    style={{ display: "none" }}
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFile(file);
                    }}
                  />
                  <button
                    type="button"
                    className="snapbot-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || isStreaming}
                    title="Upload PDF, TXT, or Markdown to knowledge base"
                    aria-label="Upload document"
                  >
                    {uploading ? (
                      <span className="snapbot-upload-spinner" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                    )}
                  </button>
                </>
              )}

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                placeholder={isStreaming ? "Responding..." : placeholder}
                disabled={isStreaming}
                aria-label="Chat input message"
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                className="snapbot-send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || isStreaming}
                aria-label="Send message"
                type="button"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

            {showBranding && (
              <div className="snapbot-branding">
                <span>⚡ Powered by <strong>SnapBot</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        className={`snapbot-button ${positionClass}`}
        style={styleVariables}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close SnapBot Chatbot" : "Open SnapBot Chatbot"}
        aria-expanded={isOpen}
        type="button"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        )}
        <span className="snapbot-button-beacon" aria-hidden="true" />
      </button>
    </>
  );
}

// Backward compatibility exports
export const PlugAIWidget = SnapBotWidget;
export default SnapBotWidget;
