"use client";

import { useEffect, useRef, useState } from "react";

/* Kabar selama menunggu.
   Selisih terbesar antara terasa cepat dan terasa menggantung bukan di
   kecepatan modelnya, tapi di apakah orang tahu sesuatu sedang berjalan.
   Model penalar bisa diam belasan detik sebelum huruf pertama keluar —
   selama itu yang ditampilkan bukan titik-titik, tapi fase dan detiknya. */

const LABEL = {
  connecting: "Menyambung",
  thinking: "Menalar",
  writing: "Menulis",
};

export default function StreamStatus({ phase, retry, inline = false }) {
  const [seconds, setSeconds] = useState(0);
  const startedRef = useRef(0);

  useEffect(() => {
    startedRef.current = performance.now();
    setSeconds(0);
    const id = setInterval(() => {
      setSeconds((performance.now() - startedRef.current) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  if (!phase) return null;

  // Menyambung yang kelamaan biasanya bukan "menyambung" lagi — modelnya yang
  // belum menjawab. Labelnya ikut berubah supaya nggak salah kabar.
  const label =
    phase === "connecting" && seconds > 2.5 ? "Menunggu model" : LABEL[phase] || "Memproses";
  // Detik baru ditampilkan setelah lewat sesaat, biar jawaban yang datang
  // cepat nggak kelihatan seperti sedang menghitung mundur.
  const showSeconds = seconds >= 1.2 && phase !== "writing";

  return (
    <div
      className={`flex items-center gap-2 text-[13px] text-text-muted ${inline ? "py-0.5" : "px-4 py-2"}`}
      role="status"
      aria-live="polite"
    >
      <span className="stream-pulse" aria-hidden="true" />
      <span>
        {retry ? `Menyambung ulang (${retry})` : label}
        {showSeconds && (
          <span className="ml-1.5 font-mono text-text-dim tabular-nums">{seconds.toFixed(1)}s</span>
        )}
      </span>
    </div>
  );
}
