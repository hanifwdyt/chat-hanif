"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function CommandPalette({ open, onClose, actions }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    // fuzzy-ish: keep order, match substring on label or hint
    return actions
      .map((a) => {
        const label = a.label.toLowerCase();
        const hint = (a.hint || "").toLowerCase();
        let score = 0;
        if (label.startsWith(q)) score += 100;
        if (label.includes(q)) score += 50;
        if (hint.includes(q)) score += 20;
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.a);
  }, [query, actions]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const action = filtered[selectedIdx];
        if (action) {
          onClose();
          action.run();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, selectedIdx, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const item = el.querySelector(`[data-idx="${selectedIdx}"]`);
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: "36rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-border">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari command... (↑↓ navigate · Enter pilih · Esc tutup)"
            className="w-full px-3 py-2 text-sm bg-bg-3 rounded-md outline-none placeholder:text-text-dim"
          />
        </div>
        <div ref={listRef} className="overflow-y-auto py-1" style={{ maxHeight: "60vh" }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-text-dim">No matching commands</div>
          ) : (
            filtered.map((a, i) => (
              <button
                key={a.id}
                data-idx={i}
                onMouseEnter={() => setSelectedIdx(i)}
                onClick={() => {
                  onClose();
                  a.run();
                }}
                aria-selected={i === selectedIdx}
                className="cmdk-item w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-bg-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {a.icon && <span className="text-text-dim flex-shrink-0">{a.icon}</span>}
                  <div className="min-w-0">
                    <div className="text-sm truncate">{a.label}</div>
                    {a.hint && <div className="text-[11px] text-text-dim truncate">{a.hint}</div>}
                  </div>
                </div>
                {a.shortcut && (
                  <kbd className="text-[10px] text-text-dim font-mono bg-bg-3 px-1.5 py-0.5 rounded flex-shrink-0">
                    {a.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
        <div className="px-3 py-2 border-t border-border text-[10px] text-text-dim flex items-center justify-between">
          <span>Cmd+K · Ctrl+K untuk buka kapan saja</span>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}
