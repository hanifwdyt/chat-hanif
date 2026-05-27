"use client";

import { useEffect, useRef, useState } from "react";

export default function TagsEditor({ open, value, suggestions = [], onClose, onSave }) {
  const [tags, setTags] = useState(value || []);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTags(value || []);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function addTag(raw) {
    const t = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setInput("");
  }

  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const availableSuggestions = suggestions.filter((s) => !tags.includes(s) && (!input || s.includes(input.toLowerCase())));

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Tags</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-bg-3 rounded-md p-2 flex flex-wrap gap-1.5 items-center min-h-[40px] border border-border focus-within:border-accent">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-md">
                #{t}
                <button onClick={() => removeTag(t)} className="text-accent/70 hover:text-accent">×</button>
              </span>
            ))}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={tags.length ? "" : "Tambah tag (Enter / koma untuk submit)"}
              className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm placeholder:text-text-dim"
            />
          </div>
          {availableSuggestions.length > 0 && (
            <div>
              <div className="text-[11px] text-text-dim mb-1">Tag yang sudah ada:</div>
              <div className="flex flex-wrap gap-1.5">
                {availableSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addTag(s)}
                    className="px-2 py-0.5 text-xs rounded-md bg-bg-3 hover:bg-border text-text-muted"
                  >
                    +#{s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md bg-bg-3 hover:bg-border">Cancel</button>
          <button
            onClick={() => onSave(tags)}
            className="px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
