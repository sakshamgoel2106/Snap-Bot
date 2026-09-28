import React, { useState } from "react";

/**
 * Splits text by line breaks (\n) and preserves them with <br />
 */
function renderWithLineBreaks(text, prefix = "txt") {
  if (typeof text !== "string") return text;
  const lines = text.split("\n");
  if (lines.length <= 1) return text;
  return lines.map((line, idx) => (
    <React.Fragment key={`${prefix}-${idx}`}>
      {line}
      {idx < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

/**
 * Parses inline markdown elements:
 * - Inline code: `code`
 * - Links: [text](url)
 * - Bold + Italic: ***text*** or ___text___
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Line breaks inside text
 */
function renderInline(text, keyPrefix = "inl") {
  if (!text) return null;

  // Regex matching inline markdown tokens
  const regex = /(`[^`\n]+`|\[[^\]]+\]\([^)\s]+\)|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|(?:\b)_[^_]+_(?:\b))/g;
  const elements = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        renderWithLineBreaks(
          text.substring(lastIndex, match.index),
          `${keyPrefix}-t-${key++}`
        )
      );
    }

    const token = match[0];

    // Inline code: `code`
    if (token.startsWith("`") && token.endsWith("`")) {
      elements.push(
        <code key={`${keyPrefix}-c-${key++}`} className="snapbot-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    // Links: [text](url)
    else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (linkMatch) {
        const [, linkText, linkUrl] = linkMatch;
        elements.push(
          <a
            key={`${keyPrefix}-a-${key++}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="snapbot-link"
          >
            {linkText}
          </a>
        );
      } else {
        elements.push(token);
      }
    }
    // Bold + Italic: ***text*** or ___text___
    else if (
      (token.startsWith("***") && token.endsWith("***")) ||
      (token.startsWith("___") && token.endsWith("___"))
    ) {
      elements.push(
        <strong key={`${keyPrefix}-bi-${key++}`}>
          <em>{token.slice(3, -3)}</em>
        </strong>
      );
    }
    // Bold: **text** or __text__
    else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      elements.push(
        <strong key={`${keyPrefix}-b-${key++}`}>{token.slice(2, -2)}</strong>
      );
    }
    // Italic: *text* or _text_
    else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      elements.push(
        <em key={`${keyPrefix}-i-${key++}`}>{token.slice(1, -1)}</em>
      );
    } else {
      elements.push(token);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(
      renderWithLineBreaks(
        text.substring(lastIndex),
        `${keyPrefix}-t-${key++}`
      )
    );
  }

  return elements.length > 0 ? elements : text;
}

/**
 * Fenced Code Block component with visual copy button & language label
 */
export function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  return (
    <div className="snapbot-code-wrapper">
      <div className="snapbot-code-header">
        <span className="snapbot-code-lang">{language || "code"}</span>
        <button
          className="snapbot-copy-btn"
          onClick={handleCopy}
          type="button"
          aria-label="Copy code to clipboard"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="snapbot-code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Splits text by fenced code blocks, correctly handling open code blocks during streaming.
 */
function extractBlocks(content) {
  const parts = [];
  const codeBlockRegex = /```([a-zA-Z0-9_#-]*)\r?\n([\s\S]*?)(?:```|$)/g;
  let lastIdx = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      parts.push({
        type: "text",
        value: content.substring(lastIdx, match.index),
      });
    }

    parts.push({
      type: "code",
      language: match[1] || "",
      code: match[2].replace(/\r?\n$/, ""),
    });

    lastIdx = codeBlockRegex.lastIndex;
    if (lastIdx >= content.length) break;
  }

  if (lastIdx < content.length) {
    parts.push({
      type: "text",
      value: content.substring(lastIdx),
    });
  }

  return parts;
}

/**
 * Parses normal text blocks into Headings, Blockquotes, Lists, and Paragraphs
 */
function renderTextBlock(textValue, blockIndex) {
  const lines = textValue.split(/\r?\n/);
  const elements = [];
  let currentBlock = null;

  const flush = () => {
    if (!currentBlock) return;
    const key = `blk-${blockIndex}-${elements.length}`;

    if (currentBlock.type === "ul") {
      elements.push(
        <ul key={key} className="snapbot-list snapbot-ul">
          {currentBlock.items.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
          ))}
        </ul>
      );
    } else if (currentBlock.type === "ol") {
      elements.push(
        <ol key={key} className="snapbot-list snapbot-ol">
          {currentBlock.items.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
          ))}
        </ol>
      );
    } else if (currentBlock.type === "blockquote") {
      elements.push(
        <blockquote key={key} className="snapbot-blockquote">
          {renderInline(currentBlock.lines.join("\n"), `${key}-bq`)}
        </blockquote>
      );
    } else if (currentBlock.type === "paragraph") {
      elements.push(
        <p key={key} className="snapbot-paragraph">
          {renderInline(currentBlock.lines.join("\n"), `${key}-p`)}
        </p>
      );
    }

    currentBlock = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blank line flushes active block and starts a new paragraph on next non-blank line
    if (!trimmed) {
      flush();
      continue;
    }

    // Headings: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const HeadingTag = `h${Math.min(level + 1, 6)}`;
      const key = `h-${blockIndex}-${i}`;

      elements.push(
        <HeadingTag key={key} className={`snapbot-heading h${level}`}>
          {renderInline(headingText, `${key}-in`)}
        </HeadingTag>
      );
      continue;
    }

    // Blockquote: > text
    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      if (currentBlock?.type !== "blockquote") {
        flush();
        currentBlock = { type: "blockquote", lines: [] };
      }
      currentBlock.lines.push(quoteMatch[1]);
      continue;
    }

    // Bullet list item: - , * , +
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (currentBlock?.type !== "ul") {
        flush();
        currentBlock = { type: "ul", items: [] };
      }
      currentBlock.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered list item: 1. , 2.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (currentBlock?.type !== "ol") {
        flush();
        currentBlock = { type: "ol", items: [] };
      }
      currentBlock.items.push(numMatch[2]);
      continue;
    }

    // Regular paragraph line
    if (currentBlock?.type !== "paragraph") {
      flush();
      currentBlock = { type: "paragraph", lines: [] };
    }
    currentBlock.lines.push(rawLine);
  }

  flush();
  return elements;
}

/**
 * MarkdownRenderer - Zero-dependency, lightweight Markdown renderer for SnapBot responses.
 *
 * Supports:
 * - Headings (H1 to H6)
 * - Bold (**bold**, __bold__)
 * - Italic (*italic*, _italic_)
 * - Bold + Italic (***text***, ___text___)
 * - Bullet lists (-, *, +)
 * - Numbered lists (1., 2.)
 * - Links ([text](url))
 * - Blockquotes (> quote)
 * - Inline code (`code`)
 * - Fenced code blocks (```language ... ```) with copy-to-clipboard button
 * - New paragraphs (blank line separations)
 * - Line breaks (\n within paragraphs)
 */
export function MarkdownRenderer({ content }) {
  if (!content) return null;

  const parts = extractBlocks(content);

  return (
    <div className="snapbot-markdown-body">
      {parts.map((part, pIdx) => {
        if (part.type === "code") {
          return (
            <CodeBlock
              key={`code-${pIdx}`}
              language={part.language}
              code={part.code}
            />
          );
        }
        return (
          <React.Fragment key={`text-${pIdx}`}>
            {renderTextBlock(part.value, pIdx)}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default MarkdownRenderer;
