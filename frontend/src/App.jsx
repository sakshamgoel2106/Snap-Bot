import { useState } from "react";
import "./App.css";
import { SnapBotWidget, KnowledgeBaseManager } from "./components/SnapBotWidget";

const COLOR_OPTIONS = [
  { name: "Electric Indigo", value: "#6366f1" },
  { name: "Cyber Cyan", value: "#06b6d4" },
  { name: "Aurora Emerald", value: "#10b981" },
  { name: "Sunset Rose", value: "#f43f5e" },
  { name: "Royal Violet", value: "#8b5cf6" },
  { name: "Midnight Obsidian", value: "#0f172a" },
];

const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: "☀️", desc: "Clean Minimalist" },
  { id: "dark", label: "Dark", icon: "🌙", desc: "Deep Obsidian" },
  { id: "glass", label: "Glass", icon: "🔮", desc: "Frosted Glassmorphism" },
  { id: "cyber", label: "Cyber", icon: "⚡", desc: "Cyberpunk Neon" },
];

function App() {
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [position, setPosition] = useState("bottom-right");
  const [theme, setTheme] = useState("glass");
  const [persistChat, setPersistChat] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [showKBManager, setShowKBManager] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState("react");
  const [copiedCode, setCopiedCode] = useState(false);

  const getCodeSnippet = () => {
    if (activeCodeTab === "react") {
      return `import { SnapBotWidget } from "snapbot-widget";
import "snapbot-widget/dist/snapbot-widget.css";

function App() {
  return (
    <SnapBotWidget
      apiUrl="https://your-api.com"
      botName="${useKnowledgeBase ? "DocsBot" : "SnapBot"}"
      theme="${theme}"
      primaryColor="${primaryColor}"
      position="${position}"
      useKnowledgeBase={${useKnowledgeBase}}
    />
  );
}`;
    } else if (activeCodeTab === "npm") {
      return `# Install via npm
npm install snapbot-widget

# Or with yarn / pnpm
yarn add snapbot-widget
pnpm add snapbot-widget`;
    } else {
      return `<!-- SnapBot Widget CDN Integration -->
<link rel="stylesheet" href="https://unpkg.com/snapbot-widget@1.0.0/dist/snapbot-widget.css">
<script type="module">
  import { initSnapBot } from "https://unpkg.com/snapbot-widget@1.0.0/dist/snapbot-widget.js";

  initSnapBot({
    apiUrl: "https://your-api.com",
    theme: "${theme}",
    primaryColor: "${primaryColor}",
    position: "${position}"
  });
</script>`;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className={`demo-page theme-bg-${theme}`}>
      {/* Ambient glowing background orbs */}
      <div className="ambient-orb orb-primary" style={{ backgroundColor: primaryColor }} />
      <div className="ambient-orb orb-secondary" />
      <div className="ambient-grid-overlay" />

      {/* Top Navbar */}
      <header className="demo-navbar">
        <div className="demo-nav-brand">
          <div className="demo-logo-icon" style={{ background: primaryColor }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="demo-brand-name">SnapBot</span>
          <span className="demo-version-tag">v1.0.0</span>
        </div>

        <div className="demo-nav-links">
          <a
            href="https://github.com/sakshamgoel2106/Snap-Bot"
            target="_blank"
            rel="noreferrer"
            className="demo-nav-btn github-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/snapbot-widget"
            target="_blank"
            rel="noreferrer"
            className="demo-nav-btn npm-btn"
          >
            <span className="npm-tag">npm</span> snapbot-widget
          </a>
        </div>
      </header>

      {/* Main Hero Showcase */}
      <main className="demo-hero">
        <div className="demo-badge">
          <span className="demo-badge-dot" />
          <span>Production-Ready AI Assistant & RAG Engine</span>
        </div>

        <h1 className="demo-title">
          Embed World-Class AI into Any App in <span className="gradient-text">60 Seconds</span>
        </h1>

        <p className="demo-subtitle">
          Real-time streaming, vector document retrieval with source citations,
          multi-LLM orchestration (Gemini, OpenAI, Ollama), and 4 modern visual themes.
        </p>

        {/* Live Interactive Control Studio */}
        <div className="demo-control-card">
          <div className="control-card-header">
            <span className="control-title">🎨 Theme & Customization Studio</span>
            <span className="control-live-badge">Live Interactive Preview</span>
          </div>

          <div className="control-grid">
            {/* Theme Mode Selector */}
            <div className="control-group">
              <label className="control-label">Visual Theme</label>
              <div className="theme-toggle-row">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-pill-btn ${theme === t.id ? "active" : ""}`}
                    onClick={() => setTheme(t.id)}
                    title={t.desc}
                  >
                    <span className="theme-pill-icon">{t.icon}</span>
                    <span className="theme-pill-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color Palette */}
            <div className="control-group">
              <label className="control-label">Brand Accent</label>
              <div className="color-swatch-row">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => setPrimaryColor(c.value)}
                    className={`color-swatch-btn ${primaryColor === c.value ? "selected" : ""}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Placement and Grounding Options */}
            <div className="control-group">
              <label className="control-label">Placement & Grounding</label>
              <div className="button-group-row">
                {/* Position */}
                <div className="segmented-control">
                  <button
                    type="button"
                    className={position === "bottom-right" ? "active" : ""}
                    onClick={() => setPosition("bottom-right")}
                  >
                    Bottom Right
                  </button>
                  <button
                    type="button"
                    className={position === "bottom-left" ? "active" : ""}
                    onClick={() => setPosition("bottom-left")}
                  >
                    Bottom Left
                  </button>
                </div>

                {/* RAG Engine Toggle */}
                <button
                  type="button"
                  onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                  className={`feature-toggle-btn ${useKnowledgeBase ? "active" : ""}`}
                >
                  <span className="status-indicator-dot" />
                  {useKnowledgeBase ? "RAG Grounding ON" : "Pure LLM Mode"}
                </button>

                {/* Document Manager Drawer */}
                <button
                  type="button"
                  onClick={() => setShowKBManager(!showKBManager)}
                  className={`feature-toggle-btn kb-manager-toggle ${showKBManager ? "active" : ""}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                  {showKBManager ? "Close Knowledge Base" : "Knowledge Base"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base Document Manager Modal/Card */}
        {showKBManager && (
          <div className="demo-kb-container">
            <KnowledgeBaseManager apiUrl="http://localhost:8000" knowledgeBaseId="default" />
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="demo-feature-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h3>Sub-Second Streaming</h3>
            <p>True Server-Sent Events (SSE) token streaming with zero perceived latency and smooth live typing.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <h3>Grounded Vector RAG</h3>
            <p>Upload PDF, Markdown, and TXT files. Automatic chunking, vector embedding, and source citations.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
              </svg>
            </div>
            <h3>Multi-Provider LLM</h3>
            <p>Seamlessly switch backends: Google Gemini 2.5, OpenAI GPT-4o, DeepSeek, or local Ollama.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <h3>4 Modern Themes</h3>
            <p>Frosted Glassmorphism, Deep Obsidian Dark, Minimalist Light, and Cyberpunk Neon out of the box.</p>
          </div>
        </div>

        {/* Code Integration Preview */}
        <div className="demo-code-section">
          <div className="code-window">
            <div className="code-window-header">
              <div className="code-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>

              <div className="code-tabs">
                <button
                  type="button"
                  className={`code-tab ${activeCodeTab === "react" ? "active" : ""}`}
                  onClick={() => setActiveCodeTab("react")}
                >
                  React Component
                </button>
                <button
                  type="button"
                  className={`code-tab ${activeCodeTab === "npm" ? "active" : ""}`}
                  onClick={() => setActiveCodeTab("npm")}
                >
                  NPM Install
                </button>
                <button
                  type="button"
                  className={`code-tab ${activeCodeTab === "cdn" ? "active" : ""}`}
                  onClick={() => setActiveCodeTab("cdn")}
                >
                  HTML / CDN
                </button>
              </div>

              <button
                type="button"
                className="code-copy-btn"
                onClick={copyToClipboard}
              >
                {copiedCode ? "✓ Copied!" : "Copy Code"}
              </button>
            </div>

            <pre className="code-content">
              <code>{getCodeSnippet()}</code>
            </pre>
          </div>
        </div>
      </main>

      {/* Floating SnapBot Widget */}
      <SnapBotWidget
        apiUrl="http://localhost:8000"
        botName={useKnowledgeBase ? "DocsBot" : "SnapBot"}
        welcomeMessage={
          useKnowledgeBase
            ? "I am grounded in your uploaded documents. Ask me anything about them or click attach to add more!"
            : "Hello! How can I assist you with your project today?"
        }
        placeholder={useKnowledgeBase ? "Ask about your documents..." : "Ask me anything..."}
        primaryColor={primaryColor}
        position={position}
        width={380}
        height={560}
        suggestedPrompts={[
          "What documents are in the knowledge base?",
          "Summarize the key takeaways",
          "Explain how to install snapbot-widget",
          "Show me a Python FastAPI streaming example"
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
