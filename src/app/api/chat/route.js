export const dynamic = "force-dynamic";

const ROUTER_BASE = process.env.ROUTER_BASE || "https://router.hanif.app";
const ROUTER_API_KEY = process.env.ROUTER_API_KEY || "";
const DEV_PROXY = process.env.DEV_PROXY_BASE || "";  // mis. https://ai.hanif.app — dev saja


export async function POST(req) {
  const body = await req.json();

  const url = DEV_PROXY ? `${DEV_PROXY}/api/chat` : `${ROUTER_BASE}/v1/chat/completions`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ROUTER_API_KEY ? { Authorization: `Bearer ${ROUTER_API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  });

  // Stream SSE directly back to client
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
