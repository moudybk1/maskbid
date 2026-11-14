import { loadMetadata } from "@/lib/metadata-store";

/** Serves the frozen bytes verbatim so any client can recompute the on-chain SHA-256. */
export async function GET(_req: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^[0-9a-f]{64}$/.test(hash)) return new Response("not found", { status: 404 });
  const bytes = await loadMetadata(hash);
  if (!bytes) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*" } }); // public, content-addressed: any origin may verify it
}
