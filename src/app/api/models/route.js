import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROUTER_BASE = process.env.ROUTER_BASE || "https://router.hanif.app";
const ROUTER_API_KEY = process.env.ROUTER_API_KEY || "";

export async function GET() {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${ROUTER_BASE}/v1/models`, {
      headers: ROUTER_API_KEY ? { Authorization: `Bearer ${ROUTER_API_KEY}` } : {},
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return NextResponse.json({ data: [], error: `upstream ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const isTimeout = e.name === "AbortError";
    return NextResponse.json(
      { data: [], error: isTimeout ? "timeout" : e.message },
      { status: isTimeout ? 504 : 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
