import { createHash } from "node:crypto";

const proofs = new Map<string, unknown>();

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = canonicalize(source[key]);
    return out;
  }
  return value;
}

/** sha256 of the key-sorted JSON. Object key order does not change the key. */
export function cacheKey(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex");
}

export function getCached(input: unknown): unknown | undefined {
  return proofs.get(cacheKey(input));
}

export function putCached(input: unknown, proof: unknown): void {
  proofs.set(cacheKey(input), proof);
}
