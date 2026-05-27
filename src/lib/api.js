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

// Yields chunks: { delta: string, done: bool, stats?: { ttft, duration, tokens, tps } }
// Final yield always carries stats.
export async function* streamChat({ model, messages, systemPrompt, signal }) {
  const finalMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const t0 = performance.now();
  let tFirst = null;
  let tokenCount = 0;
  const approxTokens = (s) => Math.max(1, Math.round(s.length / 4));

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: finalMessages, stream: true }),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function finalStats() {
    const t1 = performance.now();
    const ttft = tFirst != null ? tFirst - t0 : null;
    const duration = t1 - t0;
    const genTime = tFirst != null ? (t1 - tFirst) / 1000 : 0;
    const tps = genTime > 0 ? tokenCount / genTime : 0;
    return { ttft, duration, tokens: tokenCount, tps };
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        yield { delta: "", done: true, stats: finalStats() };
        return;
      }
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) {
          if (tFirst == null) tFirst = performance.now();
          tokenCount += approxTokens(delta);
          yield { delta, done: false };
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
  yield { delta: "", done: true, stats: finalStats() };
}
