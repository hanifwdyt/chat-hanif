"use client";

import { useEffect, useState } from "react";
import { DEFAULT_AI_HANIF_PERSONA } from "@/lib/persona";

export default function PersonaModal({ open, value, enabled, onClose, onSave }) {
  const [text, setText] = useState(value || "");
  const [isEnabled, setIsEnabled] = useState(enabled !== false);

  useEffect(() => {
    if (open) {
      setText(value || "");
      setIsEnabled(enabled !== false);
    }
  }, [open, value, enabled]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: "44rem" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI Hanif — Base Persona</h3>
            <p className="text-[11px] text-text-dim mt-0.5">
              Identitas global yang konsisten apapun provider/model di balik lo
            </p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text">✕</button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="size-3.5"
            />
            <span className="text-xs">
              Aktifkan base persona — selalu inject di setiap chat
            </span>
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis persona AI Hanif lo di sini..."
            rows={18}
            className="w-full px-3 py-2 text-sm bg-bg-3 rounded-md outline-none placeholder:text-text-dim border border-border focus:border-accent resize-y font-mono"
          />

          <div className="flex items-center justify-between text-[11px] text-text-dim">
            <span>{text.length.toLocaleString()} chars</span>
            <button
              onClick={() => setText(DEFAULT_AI_HANIF_PERSONA)}
              className="px-2 py-1 rounded-md bg-bg-3 hover:bg-border text-text-muted hover:text-text"
            >
              Reset ke default
            </button>
          </div>

          <div className="text-[11px] text-text-dim border-t border-border pt-3">
            <div className="font-medium text-text-muted mb-1">Tip:</div>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Persona ini akan dikirim sebagai <code className="text-text-muted">system</code> message paling depan</li>
              <li>Per-conversation system prompt akan di-append di belakangnya</li>
              <li>Abilities (kalau aktif) akan di-inject di tengah</li>
              <li>Disimpan di browser lo — ga ke server, ga ke tracking</li>
            </ul>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md bg-bg-3 hover:bg-border">
            Cancel
          </button>
          <button
            onClick={() => onSave({ text, enabled: isEnabled })}
            className="px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
