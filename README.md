# SnapBot

[![npm version](https://img.shields.io/npm/v/snapbot-widget.svg)](https://www.npmjs.com/package/snapbot-widget)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![React 18+](https://img.shields.io/badge/react-18+-61dafb.svg)](https://react.dev/)

> An open-source, reusable AI chatbot widget for modern websites.

SnapBot combines a sleek, embeddable React chatbot widget with a lightweight, self-hosted FastAPI backend. It supports real-time streaming, multi-provider AI routing (Google Gemini, OpenAI, and local Ollama), and an integrated Retrieval-Augmented Generation (RAG) knowledge base system for grounding answers in uploaded documents.

---

## 🌟 Features

- 💬 **Floating AI Chatbot Widget**: Polished, expandable chat widget that embeds easily into any React web application.
- ⚡ **Streaming Responses**: Real-time token streaming via Server-Sent Events (SSE) with low first-token latency.
- 📝 **Markdown & Code Rendering**: Full support for headings, bold/italics, lists, blockquotes, inline code, and syntax-highlighted code blocks with a one-click copy button.
- 💾 **Optional Chat Persistence**: Preserves conversation history across page reloads via `localStorage`.
- 💡 **Suggested Prompts**: Interactive starter prompt chips in empty conversations.
- 🎨 **Customizable Appearance**: Flexible CSS-variable-based theming (`primaryColor`, `position`, `width`, `height`, `theme`).
- 🤖 **Gemini Support**: Native integration with Google Gemini models via the official SDK.
- 🤖 **OpenAI Support**: Compatible with OpenAI models (GPT-4o, GPT-4o-mini).
- 🦙 **Ollama Support**: Self-hosted local inference with Llama 3.2, Mistral, and other models.
- 📚 **RAG / Knowledge Base**: Ingest custom documents and ground responses strictly in your documentation.
- 📄 **PDF / TXT / Markdown Ingestion**: Page-by-page PDF extraction with scanned PDF detection, UTF-8 text parsing, and structure-preserving Markdown ingestion.
- 🔎 **Vector Similarity Search**: Lightweight local vector database using persistent ChromaDB.
- 📌 **Source Citations**: Returns verifiable document names and chunk indices displayed as clean citation badges below answers.
- 🔐 **Backend API Key Protection**: AI credentials remain strictly on the backend server—never in client code.
- 🛡️ **Input Validation & Rate Limiting**: Request size limits, message validation, and in-memory IP rate limiting.
- 📱 **Responsive Design**: Full mobile and desktop responsive viewport adaptation.
- ♿ **Accessibility**: Keyboard navigable with ARIA labels, semantic roles, and focus indicators.
- 📦 **React npm Package**: Packaged as `snapbot-widget` with dual ESM and CommonJS exports.

---

## 🏗️ Architecture

### System Architecture

```
Website / React Application
          │
          ▼
   SnapBot React Widget
          │  (SSE Streaming / REST API)
          ▼
    FastAPI Backend
          │
    Chat / RAG Services
          │
          ├── AI Provider Factory
          │     ├── Google Gemini
          │     ├── OpenAI
          │     └── Ollama (Local)
          │
          └── Knowledge Engine (ChromaDB)
```

### RAG (Retrieval-Augmented Generation) Pipeline

```
Document Upload (.pdf, .txt, .md)
          │
          ▼
   Text Extraction (pypdf page-by-page / UTF-8 safe)
          │
          ▼
   Text Cleaning & Normalization
          │
          ▼
   Sliding-Window Chunking (chunk_size=1000, overlap=150)
          │
          ▼
   Embeddings (Gemini gemini-embedding-001 / OpenAI text-embedding-3-small)
          │
          ▼
   Vector Database (ChromaDB Persistent Store)
          │
User Question ──► Question Embedding ──► Similarity Search (Top-K = 5)
                                                │
                                                ▼
                                         Relevant Context
                                                │
                                                ▼
                                    Source-Grounded AI Response
                                    + Verifiable Citations
```

---

## 🚀 Quick Start

### 1. Install the Widget

```bash
npm install snapbot-widget
```

### 2. Add to Your React App

```jsx
import { SnapBotWidget } from "snapbot-widget";
import "snapbot-widget/style.css";

function App() {
  return (
    <SnapBotWidget
      apiUrl="http://localhost:8000"
      botName="SnapBot"
      welcomeMessage="How can I help you today?"
    />
  );
}

export default App;
```

---

## 🖥️ Backend Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sakshamgoel2106/Snap-Bot.git
cd Snap-Bot/backend
```

### 2. Create and Activate a Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your preferred AI provider and credentials (see [Environment Variables](#-environment-variables)).

### 5. Start the FastAPI Server

```bash
uvicorn app.main:app --reload --port 8000
```

The backend is now running at `http://localhost:8000`. You can verify health by opening `http://localhost:8000/api/health`.

---

## 🔑 Environment Variables

All sensitive configuration is managed exclusively in `backend/.env`.

> [!WARNING]
> Never commit your `.env` file to version control. Never expose provider API keys in client-side code.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `AI_PROVIDER` | `gemini` | Active chat provider: `gemini`, `openai`, or `ollama`. |
| `GEMINI_API_KEY` | `""` | Google Gemini API key (required if `AI_PROVIDER=gemini`). |
| `OPENAI_API_KEY` | `""` | OpenAI API key (required if `AI_PROVIDER=openai`). |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI chat model name. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL (if `AI_PROVIDER=ollama`). |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name. |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated list of allowed web origins. |
| `RATE_LIMIT_REQUESTS` | `30` | Maximum requests per IP within the rate-limit window. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Duration of the rate-limit window in seconds. |
| `RAG_ENABLED` | `true` | Enables or disables the RAG document endpoints. |
| `RAG_CHUNK_SIZE` | `1000` | Target character size per document chunk. |
| `RAG_CHUNK_OVERLAP` | `150` | Character overlap between consecutive chunks. |
| `RAG_TOP_K` | `5` | Maximum number of relevant chunks retrieved per query. |
| `RAG_MAX_FILE_SIZE_MB` | `10` | Maximum allowed upload size in megabytes. |
| `EMBEDDING_PROVIDER` | `gemini` | Provider used for embeddings: `gemini` or `openai`. |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model identifier. |
| `VECTOR_DB_PATH` | `./data/chroma` | Filesystem path for persistent local ChromaDB storage. |

---

## 🤖 AI Providers

### Google Gemini

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

### OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Ollama (Local AI)

Run Ollama locally without cloud API keys:

```bash
ollama run llama3.2
```

Configure backend:
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

## 📚 RAG / Knowledge Base

Retrieval-Augmented Generation (RAG) grounds the language model in your custom uploaded documents.

> [!NOTE]
> RAG **does not fine-tune or train** the model. Instead, it extracts text from your documents, generates vector embeddings, stores them in a local ChromaDB database, and passes the most relevant passages as context alongside the user's prompt.

### Supported Document Types
- **PDF (`.pdf`)**: Extracted page by page via `pypdf`. Scanned (image-only) PDFs are caught gracefully.
- **Plain Text (`.txt`)**: Safely decoded with UTF-8 fallback.
- **Markdown (`.md`)**: Preserves document structure, headings, and lists.

### Direct In-Widget Upload & Management
SnapBot supports direct document uploads within the chat widget:
1. **Attachment Button (📎)**: Click the paperclip icon in the input area to upload a PDF, TXT, or MD file.
2. **Drag & Drop**: Drag a document directly onto the chat window to begin indexing.
3. **Documents Drawer (📚)**: Click the books icon in the header to view uploaded documents, chunk counts, or delete files.

### Widget Configuration with RAG

```jsx
<SnapBotWidget
  apiUrl="http://localhost:8000"
  botName="Docs Assistant"
  useKnowledgeBase={true}
  knowledgeBaseId="my-docs"
  allowFileUpload={true}
/>
```

When RAG is active:
- A subtle `"Searching knowledge base..."` indicator appears during retrieval.
- Grounded answers display **Source** badges (e.g. `📄 api-guide.pdf`) below the response.
- If information is not contained in the knowledge base, the model honestly reports that the information is unavailable rather than hallucinating.

### Current RAG Limitations
- **No OCR Yet**: Image-only scanned PDFs are detected and rejected with a clear message: *"This PDF does not contain extractable text. OCR support is not available yet."*
- **Local Storage**: v1 uses a persistent local ChromaDB instance (`backend/data/chroma/`).

---

## ⚙️ Widget Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiUrl` | `string` | `"http://localhost:8000"` | Base URL of the SnapBot backend service. |
| `botName` | `string` | `"SnapBot"` | Header title and bot display name. |
| `welcomeMessage` | `string` | `"How can I help you today?"` | Welcome greeting displayed in empty conversation state. |
| `placeholder` | `string` | `"Ask something..."` | Input textarea placeholder. |
| `primaryColor` | `string` | `"#111827"` | Primary brand color applied to launcher, header, user bubbles, and focus rings. |
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Corner alignment on the screen. |
| `width` | `number \| string` | `380` | Chat window width (in pixels or CSS string). |
| `height` | `number \| string` | `560` | Chat window height (in pixels or CSS string). |
| `suggestedPrompts`| `string[]` | `[]` | Array of quick-click suggestion chips shown in empty state. |
| `persistChat` | `boolean` | `false` | When enabled, conversations are saved to `localStorage`. |
| `storageKey` | `string` | `""` | Custom `localStorage` key (defaults to `snapbot_chat_{botName}`). |
| `theme` | `"light" \| "dark" \| "glass" \| "cyber" \| "auto"` | `"light"` | Widget theme: Modern Light, Obsidian Dark, Frosted Glassmorphism, or Cyberpunk Neon. |
| `showClearButton`| `boolean` | `true` | Toggles the conversation reset button in the header. |
| `showBranding` | `boolean` | `true` | Toggles the "Powered by SnapBot" badge in the footer. |
| `useKnowledgeBase`| `boolean` | `false` | Enables grounded RAG retrieval from vector database. |
| `knowledgeBaseId`| `string` | `"default"` | Identifier for the knowledge base collection to query. |
| `allowFileUpload`| `boolean` | `true` | Enables direct PDF/TXT/MD document upload (📎 button, drag & drop, and in-widget document drawer). |

---

## 📡 Backend API Endpoints

### Chat Endpoint
- `POST /api/chat/`  
  Accepts user message, session ID, conversation history, and optional RAG parameters (`use_knowledge_base`, `knowledge_base_id`). Supports real-time streaming (`stream: true`).

### Knowledge Base Endpoints
- `POST /api/knowledge/upload?knowledge_base_id={id}`  
  Uploads a multipart `.pdf`, `.txt`, or `.md` file, extracts text, chunks it, generates embeddings, and indexes it into ChromaDB.
- `GET /api/knowledge/documents?knowledge_base_id={id}`  
  Returns metadata and chunk counts for all documents in a knowledge base collection.
- `DELETE /api/knowledge/documents/{document_id}?knowledge_base_id={id}`  
  Removes document metadata and associated vector embeddings from the vector database.

### Health Check
- `GET /api/health`  
  Safe status check returning active provider and RAG availability:
  ```json
  {
    "status": "ok",
    "provider": "gemini",
    "rag_enabled": true
  }
  ```

---

## 💻 Development

### Frontend Development Server

```bash
cd frontend
npm install
npm run dev
```

### Backend Development Server

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 📦 Building the NPM Package

To compile and package `snapbot-widget` locally:

```bash
cd frontend
npm run build
npm pack
```

This generates `dist/snapbot-widget.js` (ESM), `dist/snapbot-widget.cjs` (CommonJS), `dist/snapbot-widget.css`, and a package tarball (`snapbot-widget-1.0.0.tgz`). You can test it in any React project by installing the tarball:

```bash
npm install /path/to/snapbot-widget-1.0.0.tgz
```

---

## 🔒 Security

- **Zero Secrets in Frontend**: AI API keys and model parameters are kept exclusively on the FastAPI backend server.
- **Environment Isolation**: Sensitive credentials reside in `backend/.env`, which is strictly ignored by `.gitignore`.
- **CORS Protection**: Configure `CORS_ORIGINS` explicitly in production to restrict API access to your verified domains.
- **Rate Limiting**: Built-in sliding-window rate limiting prevents endpoint abuse.
- **Upload Validation**: File uploads enforce extension whitelisting, size limits, and filename sanitization to prevent path traversal or arbitrary execution.
- **Responsible Disclosure**: If you discover a security vulnerability, please report it responsibly by contacting the repository maintainers rather than posting public exploit details.

---

## 🗺️ Roadmap

- [x] React floating chatbot widget
- [x] Dual ESM & CommonJS npm package (`snapbot-widget`)
- [x] Server-Sent Events (SSE) streaming
- [x] Markdown and code rendering with copy action
- [x] Multiple AI provider routing (Gemini, OpenAI, Ollama)
- [x] Persistent chat history via `localStorage`
- [x] RAG / Knowledge Base engine (PDF, TXT, MD)
- [x] Direct in-widget document upload & drawer
- [x] Persistent local vector storage (ChromaDB)
- [x] Source citation badges
- [x] Production security hardening (CORS, rate limiting, validation)

### Future Enhancements
- [ ] Admin dashboard for bot management
- [ ] Authentication & multi-tenant user access control
- [ ] OCR support for scanned/image-only PDFs
- [ ] Remote distributed vector database connectors (Pinecone, Qdrant, pgvector)
- [ ] Chat analytics and conversation export

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. Commit your changes: `git commit -m "feat: add my feature"`.
4. Test thoroughly: `python test_backend.py` and `npm run build`.
5. Push to your branch and open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
