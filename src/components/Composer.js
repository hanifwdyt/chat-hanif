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
  const [attachments, setAttachments] = useState([]); // [{url, name}]
  const [isDragOver, setIsDragOver] = useState(false);
  const taRef = useRef(null);
  const lastConvIdRef = useRef(conversationId);

  useEffect(() => {
    if (lastConvIdRef.current !== conversationId) {
      setText(initialDraft || "");
      setAttachments([]);
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

  function addImageFile(file) {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachments((prev) => [...prev, { url: e.target.result, name: file.name || "image" }]);
    };
    reader.readAsDataURL(file);
  }

  function onPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        addImageFile(item.getAsFile());
      }
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function onDragLeave() {
    setIsDragOver(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    files.forEach(addImageFile);
  }

  function removeAttachment(idx) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled || isStreaming) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const hasDraft = text.trim().length > 0;

  return (
    <div
      className="border-t border-border bg-bg"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <div
          className={`relative flex flex-col bg-bg-2 border rounded-2xl focus-within:border-text-dim transition-colors ${
            isDragOver ? "border-accent bg-accent/5" : "border-border"
          }`}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachments.map((att, i) => (
                <div key={i} className="relative group/thumb">
                  <img
                    src={att.url}
                    alt={att.name}
                    className="size-16 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 size-4 bg-bg-3 border border-border rounded-full flex items-center justify-center text-text-dim hover:text-text hover:bg-border opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              disabled={disabled}
              placeholder={
                isDragOver
                  ? "Drop image here..."
                  : disabled
                  ? "Pilih model dulu..."
                  : "Tanya apa aja... · Paste / drop gambar"
              }
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
                disabled={(!text.trim() && attachments.length === 0) || disabled}
                className="m-2 size-9 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send (Enter)"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-text-dim">
          <span>Enter kirim · Shift+Enter baris baru · Paste / drop gambar</span>
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
