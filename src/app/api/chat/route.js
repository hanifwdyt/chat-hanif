export const dynamic = "force-dynamic";

const ROUTER_BASE = process.env.ROUTER_BASE || "https://router.hanif.app";
const ROUTER_API_KEY = process.env.ROUTER_API_KEY || "";

export async function POST(req) {
  const body = await req.json();

  const upstream = await fetch(`${ROUTER_BASE}/v1/chat/completions`, {
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
