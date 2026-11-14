import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** The browser's only way to the chain: forwards NEAR JSON-RPC to the QuickNode endpoint in NEAR_RPC_URL (server env, so the
    token never reaches the bundle). No public fallback: unset means 503. Only the methods the app uses are forwarded. */
const METHODS = new Set(["query", "block", "broadcast_tx_async", "EXPERIMENTAL_tx_status"]);

export async function POST(req: Request) {
  const url = process.env.NEAR_RPC_URL;
  if (!url) return NextResponse.json({ error: "NEAR_RPC_URL is not set" }, { status: 503 });
  if (Number(req.headers.get("content-length") ?? 0) > 65536) return NextResponse.json({ error: "body too large" }, { status: 413 });
  let body: { method?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  if (typeof body.method !== "string" || !METHODS.has(body.method)) return NextResponse.json({ error: "method not allowed" }, { status: 403 });
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
