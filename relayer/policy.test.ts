import assert from "node:assert/strict";
import test from "node:test";
import { NonceBook, ReplaySet, SlidingWindow } from "./policy.ts";

test("per-key rate limit drops the request past the max", () => {
  const window = new SlidingWindow(60_000, 2);
  assert.equal(window.allow("10.0.0.1", 0), true);
  assert.equal(window.allow("10.0.0.1", 1_000), true);
  assert.equal(window.allow("10.0.0.1", 2_000), false);
  assert.equal(window.allow("10.0.0.2", 2_000), true);
  assert.equal(window.allow("10.0.0.1", 61_000), true);
});

test("a nullifier is reserved once and committed after broadcast", () => {
  const replay = new ReplaySet();
  assert.equal(replay.claim("1000000000000000000:5"), true);
  assert.equal(replay.claim("1000000000000000000:5"), false);
  replay.release("1000000000000000000:5");
  assert.equal(replay.claim("1000000000000000000:5"), true);
  replay.commit("1000000000000000000:5");
  assert.equal(replay.claim("1000000000000000000:5"), false);
  assert.equal(replay.claim("1000000000000000000:6"), true);
});

test("nonce follows the chain when the chain is ahead", () => {
  const book = new NonceBook();
  assert.equal(book.take(4n), 4n);
  assert.equal(book.take(4n), 5n);
  assert.equal(book.take(9n), 9n);
  assert.equal(book.take(9n), 10n);
});
