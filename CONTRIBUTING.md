# Contributing

Changes that touch a public function, the hasher, or the circuit ship with the artifacts that lock them. This repository uses Foundry. A Hardhat test is not a substitute for `forge test`.

## Public Solidity

Every new or edited public or external function needs full NatSpec: `@notice` for what the caller can rely on, `@dev` for why the function is shaped that way, `@param` for each argument, and `@return` when there is a return value. Say why a field is omitted when the omission is part of the privacy claim. `Deposit` has no depositor. `Withdrawal` has no commitment. `liveSetSize` is a count, not a score.

Use custom errors already defined on `TwisterShieldedPool`, or add a new custom error. Do not add `require` with a string. `contracts/Groth16Verifier.sol` is a raw snarkjs export. Do not reformat it. A comment inside that file changes the sha256 recorded in `circuits/PARAMS.md`.

## Tests in the same change

Add or extend a Foundry test that fails if the new behavior regresses. Run:

```
forge build --deny warnings
forge test
```

The suite already covers nullifier reuse (`test_withdraw_reverts_NullifierUsed_on_second_spend`) and ether solvency (`test_solvency_balance_equals_live_notes`). Do not delete those to make a change fit.

There is no anonymity-score function. Do not add `computeScore`, and do not add a parity test for a score. The parity lock that exists is between circom and `PoseidonT3`:

- Hasher change: regenerate `test/fixtures/circomlib_poseidon_t3_constants.json` and `test/fixtures/poseidon_vectors.json` from circomlib with `node test/fixtures/prepare.mjs`, and keep `test/PoseidonTable.t.sol` and `test/PoseidonVectors.t.sol` passing. Update the circomlib commit and the two sha256 pins in `foundry.toml` if the upstream file changed.
- Circuit change: regenerate the r1cs, run a ceremony, replace `contracts/Groth16Verifier.sol`, `test/fixtures/valid_proof.json`, and `test/fixtures/circuit_hash.txt`, and update `circuits/PARAMS.md`. `test_CircuitHash` is the lock. Read `docs/CEREMONY.md` before calling the result a production setup.

## What not to publish in a pull request

Do not invent a transcript hash for a `.zkey` that is not in the tree. Do not mark `poseidon-solidity` as audited. Its upstream README says it has not been audited. Do not add a sanctions list, a `MixCompleted` event, or a promise that the protocol will fund the anonymity set.
