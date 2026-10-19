# Prover

Reference Groth16 proving path for `circuits/withdraw.circom`. The prover is snarkjs 0.7.5 calling the wasm witness generator from `circom withdraw.circom --wasm`. This repository does not ship a Rust prover, and it does not publish a measured proving time. Do not cite a server or browser latency as a number from this tree. Nothing here has been timed.

## Cache

`cache.ts` keys a proof by the sha256 of the input JSON with object keys sorted. The same inputs return the stored `{proof, publicSignals}`. A different input is a different key. The map lives in the process. A restart drops it. The cache stores whatever `prove.ts` wrote. It does not decide whether the proof is valid. The pool's verifier does that.

`prove.ts` checks the cache first. On a miss it looks for `circuits/withdraw_phase2.zkey`. If that file is absent it returns status 503 and points at `circuits/PARAMS.md`. It does not build a zkey and it does not prove under a different file. That is the same rule as `test/fixtures/generate.sh`.

## Run the cache tests

From the repository root, after `npm install` in `circuits/` so the type imports resolve through Node:

```
node --experimental-strip-types --test prover/cache.test.ts
```

The tests cover a cache hit, key-order independence, and the missing-zkey refusal. They do not run a ceremony.
