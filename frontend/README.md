# snapbot-widget ⚡

[![npm version](https://img.shields.io/npm/v/snapbot-widget.svg)](https://www.npmjs.com/package/snapbot-widget)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Embeddable, customizable floating AI chatbot widget for React applications with multi-provider AI support, real-time streaming, Markdown formatting, document upload (PDF, TXT, MD), and local chat persistence.

## Installation

```bash
npm install snapbot-widget
```

## Quick Start

```jsx
import { SnapBotWidget } from "snapbot-widget";
import "snapbot-widget/style.css";

function App() {
  return (
    <SnapBotWidget
      apiUrl="http://localhost:8000"
      botName="SnapBot"
      welcomeMessage="How can I help you today?"
      placeholder="Ask anything..."
      primaryColor="#111827"
      position="bottom-right"
      suggestedPrompts={[
        "What can you help me with?",
        "Explain React hooks",
        "Generate a code example"
      ]}
      persistChat={true}
    />
  );
}

export default App;
```

## Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiUrl` | `string` | `"http://localhost:8000"` | Base URL of your SnapBot backend. |
| `botName` | `string` | `"SnapBot"` | Display name shown in header and welcome banner. |
| `welcomeMessage` | `string` | `"How can I help you today?"` | Initial greeting message shown to users. |
| `placeholder` | `string` | `"Ask something..."` | Input field placeholder text. |
| `primaryColor` | `string` | `"#111827"` | Primary brand color (header, button, user bubble, focus ring). |
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Corner alignment on the screen. |
| `width` | `number \| string` | `380` | Width of the floating chat window. |
| `height` | `number \| string` | `560` | Height of the floating chat window. |
| `suggestedPrompts`| `string[]` | `[]` | Optional quick-start prompt chips in empty conversation state. |
| `persistChat` | `boolean` | `false` | Enables `localStorage` conversation history persistence. |
| `storageKey` | `string` | `""` | Custom `localStorage` key. |
| `theme` | `"light" \| "dark" \| "auto"` | `"light"` | Widget color theme. |
| `showClearButton`| `boolean` | `true` | Show or hide the conversation reset button. |
| `showBranding` | `boolean` | `true` | Show or hide the "Powered by SnapBot" badge. |
| `useKnowledgeBase`| `boolean` | `false` | Enables grounded RAG retrieval from vector database. |
| `knowledgeBaseId`| `string` | `"default"` | Identifier for the knowledge base collection to query. |
| `allowFileUpload`| `boolean` | `true` | Enables direct PDF/TXT/MD document upload (📎 button, drag & drop, and in-widget document drawer). |

## Knowledge Base & RAG Integration

SnapBot includes built-in RAG (Retrieval-Augmented Generation) support.

### 1. Enabling RAG in the Widget

```jsx
<SnapBotWidget
  apiUrl="http://localhost:8000"
  botName="Docs Assistant"
  useKnowledgeBase={true}
  knowledgeBaseId="my-project-docs"
/>
```

### 2. Standalone Document Management UI (`KnowledgeBaseManager`)

A modular developer/admin UI component to upload (`.pdf`, `.txt`, `.md`), list, and delete documents:

```jsx
import { KnowledgeBaseManager } from "snapbot-widget";
import "snapbot-widget/style.css";

function AdminPage() {
  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <KnowledgeBaseManager
        apiUrl="http://localhost:8000"
        knowledgeBaseId="my-project-docs"
      />
    </div>
  );
}
```

## License

MIT

