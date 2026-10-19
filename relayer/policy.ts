/** In-memory sliding window. A restart clears it. */
export class SlidingWindow {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly max: number;

  constructor(windowMs: number, max: number) {
    this.windowMs = windowMs;
    this.max = max;
  }

  allow(key: string, nowMs: number): boolean {
    const kept = (this.hits.get(key) ?? []).filter((at) => nowMs - at < this.windowMs);
    if (kept.length >= this.max) {
      this.hits.set(key, kept);
      return false;
    }
    kept.push(nowMs);
    this.hits.set(key, kept);
    return true;
  }
}

/**
 * In-flight and committed nullifier keys.
 * `claim` reserves a key. `commit` keeps it after a broadcast. `release` drops a failed broadcast so the caller can retry.
 */
export class ReplaySet {
  private readonly seen = new Set<string>();
  private readonly inflight = new Set<string>();

  claim(key: string): boolean {
    if (this.seen.has(key) || this.inflight.has(key)) return false;
    this.inflight.add(key);
    return true;
  }

  commit(key: string): void {
    this.inflight.delete(key);
    this.seen.add(key);
  }

  release(key: string): void {
    this.inflight.delete(key);
  }
}

/**
 * Nonce cursor for one signing key.
 * If the chain's pending nonce has moved past the cursor, follow the chain.
 * If the cursor is ahead, a transaction is still unmined and the next nonce stays local.
 */
export class NonceBook {
  private next: bigint | undefined;

  take(pending: bigint): bigint {
    if (this.next === undefined || pending > this.next) this.next = pending;
    const nonce = this.next;
    this.next = nonce + 1n;
    return nonce;
  }
}
