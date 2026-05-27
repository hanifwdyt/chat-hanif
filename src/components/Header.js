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
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = query
    ? models.filter((m) => m.id.toLowerCase().includes(query.toLowerCase()))
    : models;

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

        <div className="flex-1 min-w-0 truncate text-sm font-medium text-text-muted">
          {title || "New chat"}
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-bg-2 hover:bg-bg-3 border border-border max-w-[180px] sm:max-w-[260px]"
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
          onClick={onExport}
          disabled={!canExport}
          className="size-8 rounded-md hover:bg-bg-3 flex items-center justify-center text-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title="Export ke Excel"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>
    </header>
  );
}
