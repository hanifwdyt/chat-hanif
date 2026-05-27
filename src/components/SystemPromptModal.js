"use client";

import { useEffect, useState } from "react";

const PRESETS = [
  { label: "Senior Engineer", text: "You are a senior software engineer. Be terse, direct, and prioritize correctness. Show code, not theory." },
  { label: "Bahasa Indonesia", text: "Jawab selalu dalam Bahasa Indonesia kasual tapi tetap profesional. Hindari bertele-tele." },
  { label: "Concise (≤3 kalimat)", text: "Answer in 3 sentences or fewer. No preamble." },
  { label: "Step-by-step Tutor", text: "Teach me by walking through each step. Ask before assuming. Cite reasoning briefly after each step." },
];

export default function SystemPromptModal({ open, value, onClose, onSave }) {
  const [text, setText] = useState(value || "");

  useEffect(() => {
    if (open) setText(value || "");
  }, [open, value]);

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
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">System Prompt (per percakapan)</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text">✕</button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <p className="text-xs text-text-dim">
            Atur instruksi khusus untuk percakapan ini. Akan dikirim sebagai <code className="text-text-muted">system</code> message di setiap request.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Contoh: You are a senior Rails engineer..."
            rows={8}
            className="w-full px-3 py-2 text-sm bg-bg-3 rounded-md outline-none placeholder:text-text-dim border border-border focus:border-accent resize-y"
          />
          <div>
            <div className="text-[11px] text-text-dim mb-1.5">Preset cepat:</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setText(p.text)}
                  className="px-2 py-1 text-[11px] rounded-md bg-bg-3 hover:bg-border text-text-muted hover:text-text transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setText("");
              onSave("");
            }}
            className="px-3 py-1.5 text-xs rounded-md text-text-dim hover:text-red-400"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md bg-bg-3 hover:bg-border"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(text)}
            className="px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
