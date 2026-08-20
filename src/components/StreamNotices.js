"use client";

/* Dua keadaan yang dulu berakhir jadi teks miring di dalam jawaban:
   galat, dan jawaban yang kepotong batas token. Dua-duanya sekarang punya
   tempat sendiri dengan tindakan yang jelas — karena keduanya bisa
   diselesaikan, asal orangnya tahu caranya. */

export function ErrorNotice({ error, suggestedModel, onRetry, onSwitchModel }) {
  if (!error) return null;
  // Kalau kuncinya yang ditolak, mengulang dengan model yang sama cuma
  // mengulang kegagalan. Yang berguna: satu tombol ke model yang masih hidup.
  const canSwitch = Boolean(suggestedModel) && (error.kind === "auth" || error.kind === "model" || error.kind === "rate");

  return (
    <div className="mx-4 mb-4 rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-red-400" aria-hidden="true">⚠</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-text">{error.message}</p>
          {error.model && (
            <p className="mt-0.5 font-mono text-[11px] text-text-dim">
              {error.model}
              {error.status ? ` · HTTP ${error.status}` : ""}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="rounded-lg bg-bg-3 px-2.5 py-1 text-[12px] font-medium text-text hover:bg-border"
            >
              Coba lagi
            </button>
            {canSwitch && (
              <button
                onClick={onSwitchModel}
                className="rounded-lg px-2.5 py-1 text-[12px] text-text-muted hover:bg-bg-3 hover:text-text"
              >
                Pakai <span className="font-mono">{suggestedModel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TruncatedNotice({ onContinue }) {
  return (
    <div className="mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-2 px-4 py-2.5">
      <span className="text-[13px] text-text-muted">
        Jawabannya kepotong batas panjang.
      </span>
      <button
        onClick={onContinue}
        className="rounded-lg bg-bg-3 px-2.5 py-1 text-[12px] font-medium text-text hover:bg-border"
      >
        Lanjutkan
      </button>
    </div>
  );
}

export function ScrollToBottom({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-bg-2/90 px-3 py-1.5 text-[12px] text-text-muted shadow-lg backdrop-blur transition-colors hover:text-text"
    >
      ↓ Ke jawaban terbaru
    </button>
  );
}
