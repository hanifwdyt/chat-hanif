"use client";

import { useState, useEffect, useRef, memo } from "react";
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

function StatsBadge({ stats }) {
  if (!stats) return null;
  const parts = [];
  if (stats.ttft != null) parts.push(`ttft ${(stats.ttft / 1000).toFixed(2)}s`);
  if (stats.tps != null) parts.push(`${stats.tps.toFixed(1)} tok/s`);
  if (stats.tokens != null) parts.push(`~${stats.tokens} tok`);
  if (stats.duration != null) parts.push(`${(stats.duration / 1000).toFixed(2)}s`);
  if (!parts.length) return null;
  return (
    <span className="text-[10px] text-text-dim font-mono">{parts.join(" · ")}</span>
  );
}

function Message({
  message,
  isStreaming,
  onCopy,
  onRegenerate,
  onDelete,
  onEditUser,
  isLast,
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const textareaRef = useRef(null);
  const isUser = message.role === "user";

  useEffect(() => {
    setEditValue(message.content);
  }, [message.content]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 400) + "px";
    }
  }, [editing]);

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.();
  }

  function startEdit() {
    setEditValue(message.content);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditValue(message.content);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    setEditing(false);
    onEditUser?.(message.id, trimmed);
  }

  function onEditKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commitEdit();
    }
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
            editing ? (
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 400) + "px";
                  }}
                  onKeyDown={onEditKey}
                  className="w-full px-3 py-2 text-sm bg-bg-3 rounded-md outline-none border border-accent resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={commitEdit}
                    className="px-3 py-1 text-xs rounded-md bg-accent hover:bg-accent-hover text-white"
                  >
                    Save & regenerate
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 text-xs rounded-md bg-bg-3 hover:bg-border text-text-muted"
                  >
                    Cancel
                  </button>
                  <span className="text-[10px] text-text-dim font-mono ml-auto">
                    ⌘↩ save · Esc cancel
                  </span>
                </div>
              </div>
            ) : (
              <div className="prose-chat whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )
          ) : (
            <div className={isStreaming ? "streaming-cursor" : ""}>
              <MessageBody content={message.content || ""} />
            </div>
          )}

          {!isUser && (message.model || message.stats) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {message.model && (
                <span className="text-[10px] text-text-dim font-mono">
                  {message.model}
                </span>
              )}
              {message.stats && (
                <>
                  <span className="text-[10px] text-text-dim">·</span>
                  <StatsBadge stats={message.stats} />
                </>
              )}
            </div>
          )}

          {!isStreaming && !editing && (
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
              {isUser && (
                <button
                  onClick={startEdit}
                  className="px-2 py-1 text-[11px] text-text-dim hover:text-text rounded-md hover:bg-bg-3 inline-flex items-center gap-1"
                  title="Edit & regenerate"
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit
                </button>
              )}
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
