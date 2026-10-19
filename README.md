# Twister shielded pool

Fixed-denomination shielded pool. A note is `Poseidon(secret, nullifier, denomination, poolId)`. A withdrawal proves membership in a depth-20 Poseidon tree with Groth16 on BN254. Denominations are `0.1`, `1`, `10`, and `100` ETH in wei. Each denomination has its own tree and its own nullifier set.

"Unlinkable" means: for any probabilistic polynomial-time adversary with full access to all on-chain data, the advantage of distinguishing "withdrawal W came from deposit D1" from "W came from D2" is negligible in the security parameter, given an anonymity set of size >= K, under the assumptions in `ASSUMPTIONS.md`.

This repository is a reference implementation. A local dev ceremony is not sufficient for mainnet. No third-party audit is published here.

## Radical transparency

An auditor should be able to check every claim in this file against a path in the tree.

Published and locked by tests:

- The hasher is circomlib 2.0.5 `Poseidon`, commit `cff5ab6288b55ef23602221694a6a38a0239dcc0`, pinned in `foundry.toml`. `test/PoseidonTable.t.sol` checks all 81 `t = 3` round constants. `test/PoseidonVectors.t.sol` checks twelve circom witnesses.
- The circuit hash is `test/fixtures/circuit_hash.txt`. `test/CircuitHash.t.sol` reverts if `circuits/withdraw.r1cs` changes without that file.
- `contracts/Groth16Verifier.sol` is a raw snarkjs export. Its sha256 is in `circuits/PARAMS.md`.
- `Deposit` has two topics. There is no depositor field. `test/PoolUnit.t.sol` fails if one is added.
- `Withdrawal` has no commitment field.
- `liveSetSize` is a count of notes deposited and not yet withdrawn. The contract does not compute a score.

Not in this repository, and not claimed:

- A multi-party ceremony, or a transcript hash of a final `.zkey`. The `.zkey` was deleted. See `docs/CEREMONY.md`.
- An audit report. See `docs/AUDIT.md`.
- An anonymity-score function, a `MixCompleted` event, or a `proveSolvency` circuit. Solvency of the reference pool is the ether balance equaling the sum of `liveSetSize[d] * d`, checked by `test_solvency_balance_equals_live_notes`.
- A sanctions oracle, a pre-deposit filter, or a post-deposit monitor. See `compliance/SANCTIONS.md`.
- A protocol-operated relayer. `relayer/` is a reference process an operator runs.

`chancehudson/poseidon-solidity` says in its README that it has not been audited. This tree keeps `contracts/lib/PoseidonT3.sol` because that is the bytecode the constant test and the witness test lock to circomlib.

## Protocol

`deposit(denomination, commitment)` takes exactly `denomination` wei and inserts `commitment` as the next leaf. The `Deposit` event is `(denomination indexed, commitment, leafIndex)`.

`withdraw` checks the root against a 100-deep ring buffer, marks `nullifierHash` spent, decrements `liveSetSize`, emits `Withdrawal`, then pays `relayerFee` to `relayer` and the remainder to `recipient`. Public inputs are `root`, `nullifierHash`, `denomination`, `recipient`, `relayer`. The verifier address and the hasher address are immutable. There is no admin, pause, or upgrade.

`poolId` inside the circuit is the constant `0x54776973746572`. Changing it requires a new circuit and a new verifier.

## Threat model

The full adversary table is `THREAT_MODEL.md`. The short form:

- Chain data shows denomination, set size, time, recipient, relayer, and fee. It does not show the commitment inside a withdrawal.
- The deposit transaction's `from` address is visible even though `Deposit` has no depositor field.
- A set of size 1 is one note. `liveSetSize < 10` still withdraws. The reference client must show the count before a withdraw control is enabled.
- RPC honesty, an uncompromised frontend, and a non-colluding relayer are not assumptions.
- Groth16 soundness depends on the ceremony. The ceremony in this tree does not provide it for mainnet. If the trapdoor exists, the pool can be emptied.

## Getting started

Contracts:

```
forge build --deny warnings
forge test
```

Circuit, from `circuits/` after `npm install circomlib@2.0.5`, with circom 2.2.x:

```
circom withdraw.circom --r1cs --wasm --sym
```

The r1cs has 12128 constraints. Ceremony commands and their limits are in `circuits/PARAMS.md` and `docs/CEREMONY.md`.

Relayer, from `relayer/`:

```
npm install
node --experimental-strip-types index.ts
```

`RELAYER_KEY`, `MIN_FEE`, `RPC_URL`, and `POOL_ADDRESS` must be set. `RPC_URL_FALLBACK` is optional. `node --experimental-strip-types server.ts` listens on `127.0.0.1:43127`.

Client:

```
cd web
python3 -m http.server 43123 --bind 127.0.0.1
```

Open `http://127.0.0.1:43123/`. The page reads `liveSetSize` from the RPC URL you type. It does not ship one, and it does not build a proof.

Health check, from `monitoring/`:

```
npm install
RPC_URL=http://127.0.0.1:8545 node --experimental-strip-types server.ts
```

`GET http://127.0.0.1:43131/health` reports RPC latency and gas price.

## Further reading

- `ASSUMPTIONS.md` — Poseidon, Groth16, the tree, and the nullifier.
- `docs/CEREMONY.md`, `docs/AUDIT.md`, `docs/TERMS.md`, `docs/BOOTSTRAP.md`, `docs/USER_GUIDE.md`.
- `SECURITY.md`, `CONTRIBUTING.md`.
- `prover/README.md`, `relayer/SECURITY.md`, `monitoring/README.md`, `compliance/SANCTIONS.md`.
