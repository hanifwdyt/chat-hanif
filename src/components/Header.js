"use client";

import { useState, useRef, useEffect } from "react";

export default function Header({
  models,
  selectedModel,
  onModelChange,
  onToggleSidebar,
  onExport,
  canExport,
  title,
  theme,
  onCycleTheme,
  onEditSystemPrompt,
  hasSystemPrompt,
  onShare,
  canShare,
  onOpenCommandPalette,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = query
    ? models.filter((m) => m.id.toLowerCase().includes(query.toLowerCase()))
    : models;

  const themeIcon = theme === "light" ? (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  ) : theme === "dark" ? (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ) : (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 22h8M12 18v4" strokeLinecap="round" />
    </svg>
  );

  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-border">
      <div className="flex items-center gap-2 px-3 sm:px-4 h-12">
        <button
          onClick={onToggleSidebar}
          className="md:hidden size-8 rounded-md hover:bg-bg-3 flex items-center justify-center text-text-muted"
          title="Menu"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate text-sm font-medium text-text-muted">
          <span className="truncate">{title || "New chat"}</span>
          {hasSystemPrompt && (
            <span
              className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded bg-accent/15 text-accent font-mono"
              title="System prompt aktif"
            >
              sys
            </span>
          )}
        </div>

        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-text-dim hover:text-text hover:bg-bg-3 font-mono"
          title="Command palette (Ctrl/⌘ K)"
        >
          <kbd className="bg-bg-3 px-1 rounded text-[10px]">⌘K</kbd>
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-bg-2 hover:bg-bg-3 border border-border max-w-[160px] sm:max-w-[240px]"
            title={selectedModel || "Pilih model"}
          >
            <span className="truncate font-mono">{selectedModel || "Pilih model"}</span>
            <svg className="size-3 text-text-dim flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-72 sm:w-80 bg-bg-2 border border-border rounded-lg shadow-xl overflow-hidden">
              <div className="p-2 border-b border-border">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari model..."
                  className="w-full px-2 py-1.5 text-xs bg-bg-3 rounded outline-none placeholder:text-text-dim"
                />
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-text-dim text-center">
                    {models.length === 0 ? "Loading models..." : "No match"}
                  </div>
                ) : (
                  filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onModelChange(m.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-bg-3 flex items-center justify-between ${
                        m.id === selectedModel ? "text-accent" : ""
                      }`}
                    >
                      <span className="font-mono truncate">{m.id}</span>
                      {m.owned_by && (
                        <span className="text-[10px] text-text-dim ml-2 flex-shrink-0">{m.owned_by}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onCycleTheme}
          className="size-8 rounded-md hover:bg-bg-3 flex items-center justify-center text-text-muted"
          title={`Theme: ${theme} (click to cycle)`}
        >
          {themeIcon}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="size-8 rounded-md hover:bg-bg-3 flex items-center justify-center text-text-muted"
            title="More"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-bg-2 border border-border rounded-lg shadow-xl overflow-hidden py-1 z-30">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEditSystemPrompt?.();
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-bg-3 flex items-center gap-2"
              >
                <svg className="size-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                System prompt
                {hasSystemPrompt && <span className="ml-auto text-[10px] text-accent">●</span>}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onShare?.();
                }}
                disabled={!canShare}
                className="w-full text-left px-3 py-2 text-xs hover:bg-bg-3 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="size-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
                Share link
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onExport?.();
                }}
                disabled={!canExport}
                className="w-full text-left px-3 py-2 text-xs hover:bg-bg-3 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="size-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export Excel
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenCommandPalette?.();
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-bg-3 flex items-center gap-2"
              >
                <svg className="size-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 9h6v6H9z" />
                </svg>
                Command palette
                <kbd className="ml-auto bg-bg-3 px-1 rounded text-[10px] font-mono">⌘K</kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
