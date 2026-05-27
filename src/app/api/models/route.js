import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROUTER_BASE = process.env.ROUTER_BASE || "https://router.hanif.app";
const ROUTER_API_KEY = process.env.ROUTER_API_KEY || "";

export async function GET() {
  try {
    const res = await fetch(`${ROUTER_BASE}/v1/models`, {
      headers: ROUTER_API_KEY ? { Authorization: `Bearer ${ROUTER_API_KEY}` } : {},
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
