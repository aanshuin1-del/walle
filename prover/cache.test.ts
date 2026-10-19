import assert from "node:assert/strict";
import test from "node:test";
import { cacheKey, getCached, putCached } from "./cache.ts";
import { prove } from "./prove.ts";

test("same inputs hit the cache regardless of key order", () => {
  const a = { root: "1", secret: "2" };
  const b = { secret: "2", root: "1" };
  assert.equal(cacheKey(a), cacheKey(b));
  putCached(a, { proof: { pi_a: ["1"] }, publicSignals: ["9"] });
  const hit = getCached(b) as { proof: { pi_a: string[] } };
  assert.deepEqual(hit.proof.pi_a, ["1"]);
});

test("a second call returns the cached proof and does not need a zkey", () => {
  const input = { denomination: "1000000000000000000", secret: "5" };
  putCached(input, { proof: { ok: true }, publicSignals: ["4"] });
  const result = prove(JSON.stringify({ secret: "5", denomination: "1000000000000000000" }), {
    snarkjs: "missing",
    wasm: "missing",
    zkey: "missing",
    zkeyExists: false,
  });
  assert.equal(result.status, 200);
  if (result.status !== 200) return;
  assert.equal(result.body.cached, true);
  assert.deepEqual(result.body.proof, { ok: true });
});

test("distinct inputs without a zkey are refused", () => {
  const result = prove(JSON.stringify({ secret: "not-cached" }), {
    snarkjs: "missing",
    wasm: "missing",
    zkey: "circuits/withdraw_phase2.zkey",
    zkeyExists: false,
  });
  assert.equal(result.status, 503);
  if (result.status !== 503) return;
  assert.match(result.body.detail, /PARAMS.md/);
});
