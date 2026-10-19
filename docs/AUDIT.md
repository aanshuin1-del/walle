# Audit

No third-party audit of this repository has been commissioned, delivered, or linked. An empty findings list below means no engagement has filed findings. It does not mean the code is clear.

## Scope a future audit has to cover

- `contracts/TwisterShieldedPool.sol`, `contracts/lib/PoseidonT3.sol`, `contracts/Groth16VerifierAdapter.sol`, and the interfaces they use.
- `contracts/Groth16Verifier.sol` as a generated artifact. Compare it to a fresh `snarkjs zkey export solidityverifier` from a ceremony the auditor can see. Do not treat a reformat as a review.
- `circuits/withdraw.circom` and circomlib 2.0.5 at commit `cff5ab6288b55ef23602221694a6a38a0239dcc0`, including the constraint groups in `circuits/README.md`.
- The parity tests: `test/PoseidonTable.t.sol` (81 constants), `test/PoseidonVectors.t.sol` (twelve witnesses), `test/CircuitHash.t.sol`, and `test/VerifierE2E.t.sol`.
- `relayer/` and `web/`, as reference clients, against `THREAT_MODEL.md`. They are not consensus-critical, and they are in scope because they are the way a user would touch the pool.

Out of scope of the contracts themselves: `IWrappedXMRMinter` and `IShieldedPool` declare no functions. There is no bridge.

## Known limitations

- The ceremony is one internal machine. Soundness against a forger who kept the trapdoor is not claimed. `docs/CEREMONY.md`.
- `PoseidonT3` has no independent audit. It is locked to circomlib by tests. `chancehudson/poseidon-solidity` is also unaudited upstream, so it is not used.
- `liveSetSize` is a count. The contract enforces no minimum. A withdrawal from a set of size 1 is linkable by inspection.
- The deposit transaction reveals the funding account. Omitting a depositor topic does not hide `tx.from`.
- Root history is 100 roots. An evicted root makes that note unspendable. Nothing restores it.
- Tree capacity is `2^20` leaves per denomination. `TreeFull` stops insertion. It does not migrate the tree.
- G4 in the circuit is a compiler substitution of `privateDenomination` by the public `denomination`, not an extra rank-1 constraint. `circuits/README.md` records that.
- The reference relayer and the reference page are unaudited. The HTTP relayer keeps rate-limit state in memory only.

## Open findings

None filed. There is no auditor of record.
