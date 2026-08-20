"use client";

export async function fetchModels() {
  try {
    const res = await fetch("/api/models", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data || []).map((m) => ({ id: m.id, owned_by: m.owned_by }));
  } catch {
    return [];
  }
}

/* ── Kesalahan yang bisa ditindaklanjuti ────────────────────────────────
   Router membalas galat sebagai JSON berlapis: pesan aslinya dari penyedia
   model ikut ditempel di dalam string. Yang berguna buat orang cuma dua hal:
   ini salah siapa, dan apa yang bisa dia lakukan sekarang. */
export class ChatError extends Error {
  constructor({ message, status, kind, model, retryable }) {
    super(message);
    this.name = "ChatError";
    this.status = status ?? null;
    this.kind = kind ?? "unknown";       // auth | rate | model | network | server | aborted
    this.model = model ?? null;
    this.retryable = Boolean(retryable);
  }
}

const HUMAN = {
  auth: "Modelnya nolak kunci akses. Coba model lain dulu.",
  rate: "Kena batas pemakaian. Tunggu sebentar atau ganti model.",
  model: "Model ini lagi nggak bisa dipakai.",
  network: "Sambungan ke server putus.",
  server: "Server modelnya lagi bermasalah.",
  unknown: "Ada yang gagal waktu minta jawaban.",
};

function classify(status, raw) {
  const text = String(raw || "");
  if (status === 401 || status === 403 || /unauthenticated|authentication_error|bad-credentials|api key/i.test(text)) return "auth";
  if (status === 429 || /rate.?limit|quota|too many requests/i.test(text)) return "rate";
  if (status === 404 || /model.*not.*(found|exist)|unsupported model/i.test(text)) return "model";
  if (status >= 500) return "server";
  return "unknown";
}

/** Cari kalimat paling manusiawi di dalam galat berlapis dari penyedia model. */
function extractDetail(raw) {
  try {
    const json = JSON.parse(raw);
    const message = json?.error?.message ?? json?.message ?? "";
    const inner = String(message).match(/"(?:message|error)"\s*:\s*"([^"]{6,180})"/);
    return (inner?.[1] || message || "").slice(0, 200);
  } catch {
    return String(raw || "").slice(0, 200);
  }
}

/* ── Aliran jawaban ─────────────────────────────────────────────────────
   Yang di-yield bukan cuma potongan teks, tapi juga fase yang sedang
   berjalan. Bedanya kelihatan di layar: selama model masih menalar dan belum
   mengeluarkan satu huruf pun, orang tetap dapat kabar — bukan titik-titik
   yang sama saja dari detik pertama sampai terakhir.

   Bentuk kejadian:
     { type: 'phase',  phase: 'connecting' | 'thinking' | 'writing' }
     { type: 'delta',  text }
     { type: 'done',   stats, finishReason }
*/
export async function* streamChat({ model, messages, systemPrompt, signal, maxRetries = 1 }) {
  const finalMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  let attempt = 0;
  for (;;) {
    try {
      yield* runOnce({ model, finalMessages, signal });
      return;
    } catch (error) {
      // Putus di tengah jalan itu sering cuma sekejap. Sekali coba lagi
      // jauh lebih baik daripada menyuruh orang mengetik ulang.
      const canRetry = error instanceof ChatError && error.kind === "network" && attempt < maxRetries;
      if (!canRetry || signal?.aborted) throw error;
      attempt += 1;
      yield { type: "phase", phase: "connecting", retry: attempt };
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}

async function* runOnce({ model, finalMessages, signal }) {
  const t0 = performance.now();
  let tFirst = null;
  let text = "";
  let usage = null;
  let finishReason = null;

  yield { type: "phase", phase: "connecting" };

  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: finalMessages, stream: true }),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ChatError({ message: HUMAN.network, kind: "network", model, retryable: true });
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    const kind = classify(res.status, raw);
    const detail = extractDetail(raw);
    throw new ChatError({
      message: detail ? `${HUMAN[kind]} (${detail})` : HUMAN[kind],
      status: res.status,
      kind,
      model,
      retryable: kind === "rate" || kind === "server",
    });
  }

  yield { type: "phase", phase: "thinking" };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stats = () => {
    const t1 = performance.now();
    const ttft = tFirst != null ? tFirst - t0 : null;
    const generating = tFirst != null ? (t1 - tFirst) / 1000 : 0;
    // Angka token diambil dari server kalau ada. Perkiraan panjang÷4 cuma
    // dipakai kalau penyedia model nggak mengirim apa-apa.
    const completion = usage?.completion_tokens ?? Math.max(1, Math.round(text.length / 4));
    const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens ?? null;
    // Sebagian penyedia mengirim seluruh jawaban dalam satu potongan. Kalau
    // jendela "menulis"-nya cuma sepersekian detik, angka token per detik jadi
    // ribuan dan menyesatkan — lebih baik nggak ditampilkan sama sekali
    // daripada memajang angka yang jelas nggak mungkin.
    const visibleTokens = reasoningTokens != null ? Math.max(1, completion - reasoningTokens) : completion;
    const streamed = generating >= 0.4;
    const tps = streamed ? visibleTokens / generating : null;
    return {
      ttft,
      duration: t1 - t0,
      tokens: completion,
      promptTokens: usage?.prompt_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      reasoningTokens,
      estimated: !usage,
      tps,
    };
  };

  for (;;) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (error) {
      if (error.name === "AbortError") throw error;
      // Kalau sebagian jawaban sudah sampai, itu tetap dipertahankan —
      // lebih baik jawaban terpotong daripada layar kosong.
      if (text) break;
      throw new ChatError({ message: HUMAN.network, kind: "network", model, retryable: true });
    }
    if (chunk.done) break;

    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        yield { type: "done", stats: stats(), finishReason };
        return;
      }
      let json;
      try {
        json = JSON.parse(payload);
      } catch {
        continue; // potongan rusak dilewat, bukan menggagalkan seluruh jawaban
      }

      if (json.usage) usage = json.usage;
      const choice = json?.choices?.[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;

      const delta = choice?.delta?.content;
      if (delta) {
        if (tFirst == null) {
          tFirst = performance.now();
          yield { type: "phase", phase: "writing" };
        }
        text += delta;
        yield { type: "delta", text: delta };
      }
    }
  }

  yield { type: "done", stats: stats(), finishReason };
}
