"use client";

import { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { parseMarkdownTableToRows, exportTableToExcel } from "@/lib/excel";

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");
  const lang = className?.replace("language-", "") || "";

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative group/code my-3">
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-text-dim bg-bg-3 border border-border border-b-0 rounded-t-lg">
        <span className="font-mono">{lang || "text"}</span>
        <button
          onClick={copy}
          className="opacity-0 group-hover/code:opacity-100 transition-opacity hover:text-text"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function MessageBody({ content }) {
  const tableData = parseMarkdownTableToRows(content);

  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          code({ inline, className, children, ...props }) {
            if (inline) {
              return <code className={className} {...props}>{children}</code>;
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          pre({ children }) {
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {tableData && (
        <div className="mt-2">
          <button
            onClick={() =>
              exportTableToExcel(tableData.headers, tableData.rows, "table.xlsx")
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-bg-3 hover:bg-border text-text-muted hover:text-text transition-colors"
          >
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export tabel ke Excel
          </button>
        </div>
      )}
    </div>
  );
}

function Message({ message, isStreaming, onCopy, onRegenerate, onDelete, isLast }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.();
  }

  return (
    <div className={`group py-5 ${isUser ? "" : "bg-bg/30"}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex gap-3 sm:gap-4">
        <div
          className={`size-7 rounded-md flex-shrink-0 flex items-center justify-center text-[11px] font-semibold ${
            isUser ? "bg-bg-3 text-text-muted" : "bg-accent text-white"
          }`}
        >
          {isUser ? "You" : "AI"}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {isUser ? (
            <div className="prose-chat whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div className={isStreaming ? "streaming-cursor" : ""}>
              <MessageBody content={message.content || ""} />
            </div>
          )}

          {message.model && !isUser && (
            <div className="mt-2 text-[10px] text-text-dim font-mono">
              {message.model}
            </div>
          )}

          {!isStreaming && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={copy}
                className="px-2 py-1 text-[11px] text-text-dim hover:text-text rounded-md hover:bg-bg-3 inline-flex items-center gap-1"
              >
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "Copied" : "Copy"}
              </button>
              {!isUser && isLast && (
                <button
                  onClick={onRegenerate}
                  className="px-2 py-1 text-[11px] text-text-dim hover:text-text rounded-md hover:bg-bg-3 inline-flex items-center gap-1"
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Regenerate
                </button>
              )}
              <button
                onClick={onDelete}
                className="px-2 py-1 text-[11px] text-text-dim hover:text-red-400 rounded-md hover:bg-bg-3 inline-flex items-center gap-1"
              >
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Message);
