# Trusted setup parameters

The withdraw circuit compiles to 12128 rank-1 constraints (`snarkjs r1cs info` on the r1cs from `circom withdraw.circom --r1cs --wasm --sym`). A BN254 powers-of-tau file must satisfy `2^power >= 12128`. `2^13 = 8192` is not enough. `2^14 = 16384` is the smallest power that covers this r1cs.

The commands below are a one-machine development sequence. They use snarkjs 0.7.x. Run them from `circuits/` after the r1cs exists.

```
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="dev-1" -v -e="local-dev-entropy-1"
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
snarkjs groth16 setup withdraw.r1cs pot14_final.ptau withdraw_0000.zkey
snarkjs zkey contribute withdraw_0000.zkey withdraw_0001.zkey --name="dev-2" -v -e="local-dev-entropy-2"
snarkjs zkey export verificationkey withdraw_0001.zkey verification_key.json
snarkjs powersoftau verify pot14_final.ptau
snarkjs zkey verify withdraw.r1cs pot14_final.ptau withdraw_0001.zkey
```

`powersoftau new`, `powersoftau contribute`, and `powersoftau prepare phase2` are the powers-of-tau phase. `groth16 setup` and `zkey contribute` are the circuit-specific phase 2. The two `verify` commands check the transcript; they do not add entropy.

A local dev ceremony is NOT sufficient for mainnet.

This sequence is one operator on one machine. The `-e` values are written on the command line, so they sit in shell history. That operator holds every share of `tau` and of the phase-2 randomness. If they keep any of it, they can forge Groth16 proofs for this circuit and empty the pool. Deleting the files afterwards is a claim about that one person. Nobody else can check it. Shipping `withdraw_0001.zkey` or `verification_key.json` from this sequence would make soundness depend on that claim. This repository does not commit the `.ptau`, the `.zkey`, or `verification_key.json`. It does check in the Solidity verifier from the export below. That verifier is this local ceremony.

A mainnet ceremony needs all of the following.

- Powers of tau with many sequential contributors, not one. Each contributor runs `powersoftau contribute` on the previous `.ptau`, verifies the result with `powersoftau verify`, and then deletes the entropy they used. The published transcript is the chain of `.ptau` files (or the final file plus the contribution log), not a single local file.
- A phase-2 transcript that starts from that public powers-of-tau file and this exact `withdraw.r1cs`. Several contributors each run `zkey contribute`. Each one verifies the previous zkey against the r1cs and the powers-of-tau file before adding their share. The r1cs hash has to match the published circuit, not a later edit.
- Entropy that is never passed with `-e`, never written to a shared disk, and never sent to the coordinator. A contributor who types it into a command line has already leaked it into shell history.
- Destruction of toxic waste by every contributor: the randomness for their powers-of-tau contribution and the randomness for their phase-2 contribution. Soundness holds if at least one contributor actually destroyed theirs. A ceremony where every contributor might have kept a copy does not.
- A published verification key and a published verifier build, reproducible from the final zkey, plus the r1cs and the transcript so a third party can rerun `zkey verify`.
- No single machine that sees every contribution's entropy. A coordinator who only forwards files is fine. A coordinator who generates the only contribution is the local dev ceremony above.

This repository does not run that ceremony.

The development commands above were executed once with snarkjs 0.7.5 against this `withdraw.r1cs`. `powersoftau verify` printed `Powers of Tau Ok!` and `zkey verify` printed `ZKey Ok!`. The `.ptau`, `.zkey`, and `verification_key.json` from that run were deleted. They are not in this repository. Success of that run does not make the local ceremony sufficient for mainnet.

The commands below were run again so `test/fixtures/valid_proof.json` could be proved against a zkey. snarkjs mixes operating-system randomness into `-e`, so this export is a different file from the earlier local run, whose zkey was deleted. `powersoftau verify` printed `Powers of Tau Ok!` and `zkey verify` printed `ZKey Ok!`. Run from `circuits/` with snarkjs 0.7.5:

```
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="dev-1" -v -e="local-dev-entropy-1"
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
snarkjs groth16 setup withdraw.r1cs pot14_final.ptau withdraw_0000.zkey
snarkjs zkey contribute withdraw_0000.zkey withdraw_0001.zkey --name="dev-2" -v -e="local-dev-entropy-2"
snarkjs zkey export verificationkey withdraw_0001.zkey verification_key.json
snarkjs powersoftau verify pot14_final.ptau
snarkjs zkey verify withdraw.r1cs pot14_final.ptau withdraw_0001.zkey
snarkjs zkey export solidityverifier withdraw_0001.zkey contracts/Groth16Verifier.sol
```

sha256 of the snarkjs export `contracts/Groth16Verifier.sol`: `34cf59246b19f647b413bb53e7ed6e8b7148b7c6be83c51b54c2bbc48bac546c`

`contracts/Groth16Verifier.sol` is that export with nothing added. `contracts/Groth16VerifierAdapter.sol` implements `IVerifier`, holds the verifier, and swaps the `pi_b` limbs the way `snarkjs zkey export soliditycalldata` does. `script/Deploy.s.sol` reads `PRIVATE_KEY`, `DENOMINATION`, and `COMMITMENT` from the environment and deploys PoseidonT3, Groth16Verifier, Groth16VerifierAdapter, then `TwisterShieldedPool` with the adapter. The `.ptau`, `.zkey`, and `verification_key.json` from this run were deleted.

`test/fixtures/generate.sh` runs `snarkjs wtns calculate`, then `snarkjs groth16 prove`, then writes `test/fixtures/valid_proof.json`.

sha256 of `test/fixtures/valid_proof.json`: `a059175ffabf276b24113e7a3300c4d1360b9e0d8c6d45d88f0ea23c0e1c4d83`

Local dev ceremony. Not sufficient for mainnet. The trust status of this ceremony, the contributor labels, and the missing `.zkey` transcript hash are in `docs/CEREMONY.md`.

If you change withdraw.circom, regenerate the r1cs, the ceremony, contracts/Groth16Verifier.sol, test/fixtures/valid_proof.json, and test/fixtures/circuit_hash.txt. The test_CircuitHash test enforces this.
