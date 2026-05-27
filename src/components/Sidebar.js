"use client";

import { useEffect, useState } from "react";

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  open,
  onClose,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

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
        <div className="p-3 border-b border-border">
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
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-text-dim">
              No conversations yet
            </div>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
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
                        className="flex-1 min-w-0 text-left px-3 py-2 text-sm truncate"
                        title={c.title}
                      >
                        {c.title || "Untitled"}
                      </button>
                    )}

                    {editingId !== c.id && (
                      <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
      </aside>
    </>
  );
}
