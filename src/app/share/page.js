"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { decodeShare } from "@/lib/share";

export default function SharePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash;
        if (!hash || hash.length < 3) {
          setError("Link tidak valid (hash kosong).");
          return;
        }
        const decoded = await decodeShare(hash);
        if (!decoded) {
          setError("Link tidak valid atau rusak.");
          return;
        }
        setData(decoded);
      } catch (e) {
        setError("Gagal decode: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-dim text-sm">
        Loading shared conversation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-3xl mb-2">⚠</div>
          <div className="text-sm text-text">{error}</div>
          <a href="/" className="inline-block mt-4 text-xs text-accent hover:underline">
            Buka chat baru →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-text-dim">Shared conversation · read-only</div>
            <div className="text-sm font-semibold truncate">{data.t || "Untitled"}</div>
          </div>
          <a
            href="/"
            className="px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-white whitespace-nowrap"
          >
            Buka chat saya
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        {data.msgs?.map((m, i) => (
          <div key={i} className={`py-5 ${m.r === "user" ? "" : "bg-bg/30"}`}>
            <div className="px-4 sm:px-6 flex gap-3 sm:gap-4">
              <div
                className={`size-7 rounded-md flex-shrink-0 flex items-center justify-center text-[11px] font-semibold ${
                  m.r === "user" ? "bg-bg-3 text-text-muted" : "bg-accent text-white"
                }`}
              >
                {m.r === "user" ? "You" : "AI"}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {m.r === "user" ? (
                  <div className="prose-chat whitespace-pre-wrap break-words">{m.c}</div>
                ) : (
                  <div className="prose-chat">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeHighlight, rehypeKatex]}
                    >
                      {m.c}
                    </ReactMarkdown>
                  </div>
                )}
                {m.m && m.r !== "user" && (
                  <div className="mt-2 text-[10px] text-text-dim font-mono">{m.m}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="py-8 text-center text-[11px] text-text-dim">
          Shared via <a href="/" className="text-accent hover:underline">ai.hanif.app</a> · No login, no tracking — link saja yang menyimpan data.
        </div>
      </main>
    </div>
  );
}
