import { useState } from "react";
import "./App.css";
import { SnapBotWidget, KnowledgeBaseManager } from "./components/SnapBotWidget";

const COLOR_OPTIONS = [
  { name: "Slate", value: "#111827" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#059669" },
  { name: "Purple", value: "#7c3aed" },
];

function App() {
  const [primaryColor, setPrimaryColor] = useState("#111827");
  const [position, setPosition] = useState("bottom-right");
  const [theme, setTheme] = useState("light");
  const [persistChat, setPersistChat] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [showKBManager, setShowKBManager] = useState(false);

  return (
    <div className="demo-page">
      <div className="demo-hero">
        <div className="demo-badge">
          <span>⚡</span> Open Source AI Chatbot Widget + RAG
        </div>
        <h1>Embeddable AI Assistant for Any Web Application</h1>
        <p>
          SnapBot now features a complete <strong>RAG / Knowledge Base</strong> engine.
          Upload your PDF, TXT, or Markdown documents and let SnapBot answer questions
          grounded directly in your data with source citations.
        </p>

        {/* Interactive Customizer Bar */}
        <div className="demo-customizer" style={{ marginTop: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
            {/* Color selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Color:</span>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onClick={() => setPrimaryColor(c.value)}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: c.value,
                    border: primaryColor === c.value ? "3px solid #38bdf8" : "2px solid #ffffff",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                  }}
                />
              ))}
            </div>

            {/* Position selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Corner:</span>
              <button
                type="button"
                onClick={() => setPosition("bottom-right")}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: position === "bottom-right" ? "700" : "500",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: position === "bottom-right" ? "#1e293b" : "#ffffff",
                  color: position === "bottom-right" ? "#ffffff" : "#334155",
                  cursor: "pointer",
                }}
              >
                Bottom Right
              </button>
              <button
                type="button"
                onClick={() => setPosition("bottom-left")}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: position === "bottom-left" ? "700" : "500",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: position === "bottom-left" ? "#1e293b" : "#ffffff",
                  color: position === "bottom-left" ? "#ffffff" : "#334155",
                  cursor: "pointer",
                }}
              >
                Bottom Left
              </button>
            </div>

            {/* Theme mode */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Theme:</span>
              <button
                type="button"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: theme === "dark" ? "#0f172a" : "#f8fafc",
                  color: theme === "dark" ? "#f8fafc" : "#0f172a",
                  cursor: "pointer",
                }}
              >
                {theme === "light" ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>

            {/* RAG Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>RAG:</span>
              <button
                type="button"
                onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: useKnowledgeBase ? "#0284c7" : "#e2e8f0",
                  color: useKnowledgeBase ? "#ffffff" : "#64748b",
                  cursor: "pointer",
                }}
              >
                {useKnowledgeBase ? "✓ RAG Active" : "Off"}
              </button>
            </div>

            {/* Knowledge Base Manager Toggle */}
            <button
              type="button"
              onClick={() => setShowKBManager(!showKBManager)}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                borderRadius: "8px",
                border: "none",
                background: showKBManager ? "#0f172a" : "#3b82f6",
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              {showKBManager ? "✕ Hide KB Manager" : "📚 Manage Documents"}
            </button>
          </div>
        </div>

        {/* Knowledge Base Document Manager Card */}
        {showKBManager && (
          <div style={{ margin: "20px auto 30px auto", maxWidth: "680px" }}>
            <KnowledgeBaseManager apiUrl="http://localhost:8000" knowledgeBaseId="default" />
          </div>
        )}

        <div className="demo-features">
          <div className="demo-feature-tag">
            <span>📚</span> RAG Document Grounding
          </div>
          <div className="demo-feature-tag">
            <span>⚡</span> Real-time Streaming
          </div>
          <div className="demo-feature-tag">
            <span>🤖</span> Multi-Provider (Gemini, OpenAI, Ollama)
          </div>
          <div className="demo-feature-tag">
            <span>📄</span> Source Citations
          </div>
        </div>
      </div>

      {/* Floating SnapBot Widget with all features configured */}
      <SnapBotWidget
        apiUrl="http://localhost:8000"
        botName={useKnowledgeBase ? "DocsBot" : "SnapBot"}
        welcomeMessage={
          useKnowledgeBase
            ? "I am grounded in your uploaded documents. Ask me anything about them!"
            : "How can I help you today?"
        }
        placeholder={useKnowledgeBase ? "Ask about your documents..." : "Ask me anything..."}
        primaryColor={primaryColor}
        position={position}
        width={380}
        height={560}
        suggestedPrompts={[
          "What documents are in the knowledge base?",
          "Summarize the key points",
          "Explain React hooks in simple terms",
          "Show me a FastAPI example"
        ]}
        persistChat={persistChat}
        storageKey="snapbot-demo-chat"
        theme={theme}
        showClearButton={true}
        showBranding={true}
        useKnowledgeBase={useKnowledgeBase}
        knowledgeBaseId="default"
      />
    </div>
  );
}

export default App;
