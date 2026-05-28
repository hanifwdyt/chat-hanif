"use client";

import { useEffect, useState } from "react";

const ABILITY_PRESETS = [
  {
    name: "Code Reviewer",
    icon: "👁️",
    description: "Review code dengan kritik konstruktif",
    prompt: "Saat lo dapet kode, review-nya dengan fokus: correctness, readability, security, performance. Kasih critique konkret + saran fix. Format: list bullets per concern, dengan severity tag [critical/warn/nit].",
  },
  {
    name: "Tutor Bahasa Jepang",
    icon: "🇯🇵",
    description: "Mode sensei JLPT — format kana → romaji → arti",
    prompt: "Panggil user 'Hanif-san' atau 'deshi'. Saat ngajarin kosakata/grammar Jepang, format: kana (hiragana/katakana) → romaji → arti dalam Bahasa Indonesia. Untuk grammar, kasih breakdown struktur + 2-3 contoh kalimat dengan terjemahan.",
  },
  {
    name: "Rails Senior",
    icon: "💎",
    description: "Rails 8 expert, terse and direct",
    prompt: "Lo Rails senior dev (8+ tahun). Stack default: Rails 8 + PostgreSQL + Hotwire + Tailwind + RSpec + Pundit. Prinsip: skinny controller, fat service object, thin model. Bias ke testing. Saat dapet error, langsung diagnose root cause + fix.",
  },
  {
    name: "Concise Mode",
    icon: "⚡",
    description: "Jawaban ≤3 kalimat, no preamble",
    prompt: "Jawab dalam 3 kalimat atau kurang. No preamble, no disclaimer, langsung inti. Kalau pertanyaan kompleks dan ga muat di 3 kalimat, kasih bullet points max 5.",
  },
  {
    name: "Training Coach",
    icon: "🏃",
    description: "Coach lari & renang Hanif",
    prompt: "Lo coach training Hanif. Konteks: HM training, MAF HR 153, ada potensi hernia muskular betis kiri (asymptomatic rest, trigger km 1-3). Renang baseline pace 2:20/100m, sedang rebuild. Saat kasih saran training, selalu pertimbangkan: heat, schedule, status cedera, recovery. Output dalam format actionable: warmup → main set → cooldown.",
  },
];

function emptyAbility() {
  return { name: "", description: "", prompt: "", icon: "" };
}

export default function AbilitiesModal({
  open,
  abilities,
  globalEnabledIds,
  conversationOverrideIds,
  hasConversation,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onSetGlobalEnabled,
  onSetConvOverride,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyAbility());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setCreating(false);
      setDraft(emptyAbility());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !editingId && !creating) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, editingId, creating]);

  if (!open) return null;

  // Which ids are currently "active" for this context (conv override > global default)
  const activeIds = new Set(
    Array.isArray(conversationOverrideIds) ? conversationOverrideIds : globalEnabledIds || []
  );
  const usingOverride = Array.isArray(conversationOverrideIds);

  function startEdit(ab) {
    setEditingId(ab.id);
    setDraft({
      name: ab.name || "",
      description: ab.description || "",
      prompt: ab.prompt || "",
      icon: ab.icon || "",
    });
  }

  function startCreate(preset) {
    setCreating(true);
    setEditingId(null);
    setDraft(preset ? { ...preset } : emptyAbility());
  }

  function commit() {
    if (!draft.name.trim() || !draft.prompt.trim()) return;
    if (creating) {
      onCreate(draft);
      setCreating(false);
    } else if (editingId) {
      onUpdate(editingId, draft);
      setEditingId(null);
    }
    setDraft(emptyAbility());
  }

  function cancelEdit() {
    setEditingId(null);
    setCreating(false);
    setDraft(emptyAbility());
  }

  function toggleActive(ab) {
    const currentSet = new Set(
      Array.isArray(conversationOverrideIds)
        ? conversationOverrideIds
        : globalEnabledIds || []
    );
    if (currentSet.has(ab.id)) currentSet.delete(ab.id);
    else currentSet.add(ab.id);
    const nextIds = [...currentSet];

    if (hasConversation && usingOverride) {
      onSetConvOverride(nextIds);
    } else if (hasConversation && !usingOverride) {
      // Start an override based on current global state
      onSetConvOverride(nextIds);
    } else {
      onSetGlobalEnabled(nextIds);
    }
  }

  function clearConvOverride() {
    onSetConvOverride(null);
  }

  const isEditing = editingId || creating;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: "48rem" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Abilities</h3>
            <p className="text-[11px] text-text-dim mt-0.5">
              Reusable system-prompt patterns yang bisa di-toggle per percakapan
            </p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text">✕</button>
        </div>

        {hasConversation && (
          <div className="px-4 py-2 bg-bg-3/30 border-b border-border text-[11px] flex items-center justify-between">
            <span className="text-text-dim">
              {usingOverride ? (
                <>Percakapan ini pakai <span className="text-accent">override</span> ({conversationOverrideIds.length} aktif)</>
              ) : (
                <>Percakapan ini ikut <span className="text-text-muted">global default</span> ({(globalEnabledIds || []).length} aktif)</>
              )}
            </span>
            {usingOverride && (
              <button
                onClick={clearConvOverride}
                className="px-2 py-0.5 rounded bg-bg-3 hover:bg-border text-text-muted hover:text-text"
              >
                Pakai global default
              </button>
            )}
          </div>
        )}

        <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {isEditing ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value.slice(0, 4) })}
                  placeholder="🎯"
                  className="w-16 px-2 py-2 text-center text-base bg-bg-3 rounded-md outline-none border border-border focus:border-accent"
                />
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Nama ability (misal: Code Reviewer)"
                  className="flex-1 px-3 py-2 text-sm bg-bg-3 rounded-md outline-none border border-border focus:border-accent"
                />
              </div>
              <input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Deskripsi singkat (opsional)"
                className="w-full px-3 py-2 text-xs bg-bg-3 rounded-md outline-none border border-border focus:border-accent"
              />
              <textarea
                value={draft.prompt}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                placeholder="Instruksi prompt — gimana AI harus berperilaku saat ability ini aktif..."
                rows={12}
                className="w-full px-3 py-2 text-sm bg-bg-3 rounded-md outline-none placeholder:text-text-dim border border-border focus:border-accent resize-y font-mono"
              />
              <div className="flex items-center justify-between text-[11px] text-text-dim">
                <span>{draft.prompt.length.toLocaleString()} chars</span>
                <div className="flex items-center gap-2">
                  <button onClick={cancelEdit} className="px-3 py-1.5 rounded-md bg-bg-3 hover:bg-border">
                    Cancel
                  </button>
                  <button
                    onClick={commit}
                    disabled={!draft.name.trim() || !draft.prompt.trim()}
                    className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white disabled:opacity-40"
                  >
                    {creating ? "Create" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3">
                <button
                  onClick={() => startCreate(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-3 hover:bg-border text-sm font-medium text-text-muted hover:text-text"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Bikin ability baru
                </button>
              </div>

              {abilities.length === 0 ? (
                <div className="px-4 pb-3">
                  <div className="text-[11px] text-text-dim mb-2">Preset cepat — klik buat tambahin:</div>
                  <div className="space-y-1.5">
                    {ABILITY_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => startCreate(p)}
                        className="w-full text-left px-3 py-2 rounded-md bg-bg-3 hover:bg-border flex items-center gap-2 text-xs"
                      >
                        <span className="text-base">{p.icon}</span>
                        <div className="min-w-0">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-text-dim text-[10px] truncate">{p.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ul className="px-3 pb-3 space-y-1.5">
                  {abilities.map((ab) => {
                    const active = activeIds.has(ab.id);
                    return (
                      <li
                        key={ab.id}
                        className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                          active ? "border-accent/40 bg-accent/5" : "border-border bg-bg-3/30 hover:bg-bg-3"
                        }`}
                      >
                        <button
                          onClick={() => toggleActive(ab)}
                          className={`mt-0.5 size-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                            active ? "bg-accent border-accent" : "border-border hover:border-text-dim"
                          }`}
                          title={active ? "Disable" : "Enable"}
                        >
                          {active && (
                            <svg className="size-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {ab.icon && <span className="text-sm">{ab.icon}</span>}
                            <span className="text-sm font-medium truncate">{ab.name}</span>
                          </div>
                          {ab.description && (
                            <div className="text-[11px] text-text-dim truncate mt-0.5">{ab.description}</div>
                          )}
                          <div className="text-[10px] text-text-dim font-mono mt-1 line-clamp-2">
                            {ab.prompt.slice(0, 140)}{ab.prompt.length > 140 ? "…" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(ab)}
                            className="p-1.5 text-text-dim hover:text-text rounded"
                            title="Edit"
                          >
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus ability "${ab.name}"?`)) onDelete(ab.id);
                            }}
                            className="p-1.5 text-text-dim hover:text-red-400 rounded"
                            title="Delete"
                          >
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {abilities.length > 0 && (
                <div className="px-4 pb-3">
                  <details>
                    <summary className="text-[11px] text-text-dim cursor-pointer hover:text-text">+ Tambah dari preset</summary>
                    <div className="mt-2 space-y-1.5">
                      {ABILITY_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => startCreate(p)}
                          className="w-full text-left px-3 py-2 rounded-md bg-bg-3 hover:bg-border flex items-center gap-2 text-xs"
                        >
                          <span className="text-base">{p.icon}</span>
                          <div className="min-w-0">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-text-dim text-[10px] truncate">{p.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="px-4 py-2 border-t border-border text-[10px] text-text-dim">
            Centang = aktif {hasConversation ? "(per percakapan)" : "(global default)"} · disimpan lokal
          </div>
        )}
      </div>
    </div>
  );
}
