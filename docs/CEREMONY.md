# Ceremony

Groth16 soundness for `circuits/withdraw.circom` holds only if the structured reference string was built so that the trapdoor is gone. The trapdoor is the powers-of-tau secret and the phase-2 randomness. Someone who has either value can forge a proof that `contracts/Groth16Verifier.sol` will accept, for a fresh nullifier and a root still in the ring buffer, with no note in the tree. `withdraw` will then pay out. The pool can be emptied.

## Honest-participant requirement

The security of a multi-party Groth16 ceremony relies on at least one participant not leaking their contribution. That participant's entropy has to be destroyed after they contribute. If every participant keeps their entropy, or if one machine produces every contribution, the trapdoor exists and soundness does not hold.

## What this repository actually ran

`circuits/PARAMS.md` records a local development ceremony: snarkjs 0.7.5, BN254, power 14, one powers-of-tau contribution named `dev-1` with entropy string `local-dev-entropy-1`, and one phase-2 contribution named `dev-2` with entropy string `local-dev-entropy-2`. Both names are labels on one machine. They are internal contributors, not independent participants. The entropy strings are in the documentation, so they are not secret.

`powersoftau verify` printed `Powers of Tau Ok!` and `zkey verify` printed `ZKey Ok!` for that run. Those lines mean the files were internally consistent. They do not mean a second party existed.

The `.ptau`, the `.zkey`, and `verification_key.json` from that run were deleted. They are not in this repository.

## Transcript hash

There is no transcript hash of the final `.zkey` in this repository, because that file is not here and cannot be hashed again from git. Publishing a hash of a file we cannot reproduce would be a false anchor. Do not treat any other hash as a substitute for it.

Hashes that are present, and what they cover:

- `circuits/withdraw.r1cs`, sha256 `f01a439d222d083c46e4b6515a6f3578d7114d77115175a4012a758e1c3771a0`, locked by `test/CircuitHash.t.sol` and `test/fixtures/circuit_hash.txt`. This is the constraint system, not the ceremony.
- `contracts/Groth16Verifier.sol`, sha256 `34cf59246b19f647b413bb53e7ed6e8b7148b7c6be83c51b54c2bbc48bac546c`. This is the verifier exported from the deleted local zkey.
- `test/fixtures/valid_proof.json`, sha256 `a059175ffabf276b24113e7a3300c4d1360b9e0d8c6d45d88f0ea23c0e1c4d83`. This is one proof from that same local setup.

## What a mainnet ceremony would add

A public powers-of-tau (or a contribution on top of a public one), then phase-2 contributions from more than one party, then a published `.zkey` whose hash anyone can recompute, plus `zkey verify` against the published r1cs. The honest-participant sentence above is the security claim of that process. This tree has not done it. `contracts/Groth16Verifier.sol` must be replaced after it happens, and `test/fixtures/circuit_hash.txt` must move with the r1cs if the circuit changed.
