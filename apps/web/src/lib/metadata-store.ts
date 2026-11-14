import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { head, put } from "@vercel/blob";

/** Frozen metadata, keyed by the SHA-256 of its bytes. On Vercel (BLOB_READ_WRITE_TOKEN set) it lives in the project's Blob store,
    because the function filesystem is read-only; anywhere else it is a file under apps/web/data/metadata. Server only. */
const DIR = join(process.cwd(), "data", "metadata");
const blob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const path = (hash: string) => `metadata/${hash}.json`;

export async function saveMetadata(hash: string, bytes: Buffer): Promise<void> {
  if (blob()) {
    await put(path(hash), bytes, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" }); // same hash = same bytes, so overwriting is harmless
    return;
  }
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, `${hash}.json`), bytes);
}

export async function loadMetadata(hash: string): Promise<Buffer | null> {
  try {
    if (blob()) {
      const res = await fetch((await head(path(hash))).url, { cache: "no-store" });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    }
    return readFileSync(join(DIR, `${hash}.json`));
  } catch {
    return null; // not found, or the store is unreachable: both read as "not found" to the caller
  }
}
