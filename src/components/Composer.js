"use client";

import { useEffect, useRef, useState } from "react";

export default function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled,
  conversationId,
  initialDraft,
  onDraftChange,
}) {
  const [text, setText] = useState(initialDraft || "");
  const taRef = useRef(null);
  const lastConvIdRef = useRef(conversationId);

  useEffect(() => {
    if (lastConvIdRef.current !== conversationId) {
      setText(initialDraft || "");
      lastConvIdRef.current = conversationId;
    }
  }, [conversationId, initialDraft]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [text]);

  useEffect(() => {
    onDraftChange?.(text);
  }, [text, onDraftChange]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setText("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const hasDraft = text.trim().length > 0;

  return (
    <div className="border-t border-border bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <div className="relative flex items-end gap-2 bg-bg-2 border border-border rounded-2xl focus-within:border-text-dim transition-colors">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={disabled ? "Pilih model dulu..." : "Tanya apa aja..."}
            rows={1}
            className="flex-1 bg-transparent resize-none px-4 py-3.5 outline-none text-sm placeholder:text-text-dim max-h-60"
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="m-2 size-9 rounded-lg bg-text text-bg flex items-center justify-center hover:bg-text-muted transition-colors"
              title="Stop"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!text.trim() || disabled}
              className="m-2 size-9 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Send (Enter)"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-text-dim">
          <span>Enter kirim · Shift+Enter baris baru</span>
          {hasDraft && (
            <>
              <span>·</span>
              <span className="text-accent/70 font-mono">draft saved</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
