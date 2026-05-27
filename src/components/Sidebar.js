"use client";

import { useEffect, useMemo, useState } from "react";

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onTogglePin,
  onEditTags,
  open,
  onClose,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState(null);

  useEffect(() => {
    if (!editingId) return;
    const onKey = (e) => {
      if (e.key === "Escape") setEditingId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId]);

  function startEdit(c) {
    setEditingId(c.id);
    setEditValue(c.title);
  }

  function commitEdit() {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  }

  const allTags = useMemo(() => {
    const s = new Set();
    for (const c of conversations) for (const t of c.tags || []) s.add(t);
    return [...s].sort();
  }, [conversations]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (tagFilter) list = list.filter((c) => c.tags?.includes(tagFilter));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.includes(q))
      );
    }
    // Sort: pinned first, then by updatedAt desc
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [conversations, query, tagFilter]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed md:static z-40 inset-y-0 left-0 w-72 bg-bg-2 border-r border-border flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-3 border-b border-border space-y-2">
          <button
            onClick={() => {
              onNew();
              onClose?.();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg-3 hover:bg-border text-sm font-medium transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New chat
          </button>
          <div className="relative">
            <svg
              className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-bg-3 rounded-md outline-none placeholder:text-text-dim focus:ring-1 focus:ring-accent"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setTagFilter(null)}
                className={`px-1.5 py-0.5 text-[10px] rounded ${
                  !tagFilter ? "bg-accent text-white" : "bg-bg-3 text-text-dim hover:text-text"
                }`}
              >
                all
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
                    tagFilter === t ? "bg-accent text-white" : "bg-bg-3 text-text-dim hover:text-text"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-text-dim">
              {conversations.length === 0
                ? "No conversations yet"
                : "No match"}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((c) => (
                <li key={c.id}>
                  <div
                    className={`group flex items-center gap-1 rounded-md transition-colors ${
                      c.id === activeId ? "bg-bg-3" : "hover:bg-bg-3/60"
                    }`}
                  >
                    {editingId === c.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                        }}
                        className="flex-1 px-3 py-2 bg-transparent text-sm outline-none border border-accent rounded-md"
                      />
                    ) : (
                      <button
                        onDoubleClick={() => startEdit(c)}
                        onClick={() => {
                          onSelect(c.id);
                          onClose?.();
                        }}
                        className="flex-1 min-w-0 text-left px-3 py-2 text-sm truncate flex items-center gap-1.5"
                        title={c.title}
                      >
                        {c.pinned && (
                          <svg className="size-3 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2 9 9H3l5 4-2 7 6-4 6 4-2-7 5-4h-6z" />
                          </svg>
                        )}
                        <span className="truncate">{c.title || "Untitled"}</span>
                        {c.tags?.length > 0 && (
                          <span className="text-[9px] text-text-dim font-mono flex-shrink-0">
                            #{c.tags[0]}{c.tags.length > 1 ? `+${c.tags.length - 1}` : ""}
                          </span>
                        )}
                      </button>
                    )}

                    {editingId !== c.id && (
                      <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onTogglePin?.(c.id)}
                          className={`p-1.5 rounded ${
                            c.pinned ? "text-accent" : "text-text-dim hover:text-text"
                          }`}
                          title={c.pinned ? "Unpin" : "Pin"}
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill={c.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M12 2 9 9H3l5 4-2 7 6-4 6 4-2-7 5-4h-6z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onEditTags?.(c.id)}
                          className="p-1.5 text-text-dim hover:text-text rounded"
                          title="Tags"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => startEdit(c)}
                          className="p-1.5 text-text-dim hover:text-text rounded"
                          title="Rename"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${c.title}"?`)) onDelete(c.id);
                          }}
                          className="p-1.5 text-text-dim hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-border text-[11px] text-text-dim">
          <div>Stored locally in your browser.</div>
          <div className="mt-0.5">No login. No tracking.</div>
          <div className="mt-1 text-[10px]">
            <kbd className="bg-bg-3 px-1 py-0.5 rounded font-mono">Ctrl/⌘ K</kbd> command palette
          </div>
        </div>
      </aside>
    </>
  );
}
