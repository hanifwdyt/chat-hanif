"use client";

import { useEffect, useState } from "react";
import { encodeShare } from "@/lib/share";

export default function ShareModal({ open, conversation, messages, onClose }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (!open || !conversation) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const payload = await encodeShare(conversation, messages);
        const fullUrl = `${window.location.origin}/share#${payload}`;
        if (!cancelled) {
          setUrl(fullUrl);
          setSize(fullUrl.length);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, conversation, messages]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!open) return null;

  const tooLong = size > 8000;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Share percakapan (read-only)</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-text-dim">
            Link berisi data percakapan dalam URL (gzip + base64). Tidak ada server, tidak ada tracking. Siapa pun yang punya link bisa baca.
          </p>
          {loading ? (
            <div className="text-xs text-text-dim">Generating...</div>
          ) : (
            <>
              <div className="bg-bg-3 rounded-md p-2.5">
                <textarea
                  readOnly
                  value={url}
                  rows={3}
                  className="w-full bg-transparent text-[11px] font-mono outline-none resize-none break-all"
                  onClick={(e) => e.target.select()}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-dim">
                <span>{(size / 1024).toFixed(1)} KB</span>
                {tooLong && (
                  <span className="text-amber-500">⚠ Link panjang — browser/clipboard mungkin truncate</span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md bg-bg-3 hover:bg-border"
          >
            Close
          </button>
          <button
            onClick={copy}
            disabled={loading || !url}
            className="px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-white disabled:opacity-50"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
