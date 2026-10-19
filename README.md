# Twister shielded pool

Fixed-denomination pool. A note is `Poseidon(secret, nullifier, denomination, poolId)`. A withdrawal proves membership in a depth-20 Poseidon tree with Groth16. Denominations are `0.1`, `1`, `10`, and `100` ETH in wei.

"Unlinkable" means: for any probabilistic polynomial-time adversary with full access to all on-chain data, the advantage of distinguishing "withdrawal W came from deposit D1" from "W came from D2" is negligible in the security parameter, given an anonymity set of size >= K, under the assumptions in ASSUMPTIONS.md.

A local dev ceremony is NOT sufficient for mainnet. This repository does not claim the contracts or the client are audited.

## Layout

- `THREAT_MODEL.md`, `ASSUMPTIONS.md` — adversaries and primitive assumptions.
- `contracts/` — `TwisterShieldedPool` and the interfaces it calls. The two bridge interfaces have no functions.
- `circuits/` — `withdraw.circom`.
- `test/LinkageBaselines.t.sol` — eight linkage heuristics, with the baselines.
- `test/LinkageIntegration.t.sol` — the same eight heuristics against a deployed pool.
- `relayer/` — one-shot submitter.
- `web/` — static reference client.

## Run

Contracts and tests need Foundry:

```
forge build --deny warnings
forge test
```

Circuit, from `circuits/` after `npm install circomlib@2.0.5`, with circom 2.2.x:

```
circom withdraw.circom --r1cs --wasm --sym
```

The r1cs has 12128 constraints. The dev ceremony commands are in `circuits/PARAMS.md`. Do not use their output on mainnet.

Relayer, from `relayer/`:

```
npm install
node --experimental-strip-types index.ts
```

`RELAYER_KEY`, `MIN_FEE`, `RPC_URL`, and `POOL_ADDRESS` must be set. There is no default RPC.

Client:

```
cd web
python3 -m http.server 43123 --bind 127.0.0.1
```

Open `http://127.0.0.1:43123/`. The page reads `liveSetSize` from the RPC URL you type. It does not ship one.
