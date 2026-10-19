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

This sequence is one operator on one machine. The `-e` values are written on the command line, so they sit in shell history. That operator holds every share of `tau` and of the phase-2 randomness. If they keep any of it, they can forge Groth16 proofs for this circuit and empty the pool. Deleting the files afterwards is a claim about that one person. Nobody else can check it. Shipping `withdraw_0001.zkey`, `verification_key.json`, or a Solidity verifier from this sequence would make soundness depend on that claim. This repository does not commit those files.

A mainnet ceremony needs all of the following.

- Powers of tau with many sequential contributors, not one. Each contributor runs `powersoftau contribute` on the previous `.ptau`, verifies the result with `powersoftau verify`, and then deletes the entropy they used. The published transcript is the chain of `.ptau` files (or the final file plus the contribution log), not a single local file.
- A phase-2 transcript that starts from that public powers-of-tau file and this exact `withdraw.r1cs`. Several contributors each run `zkey contribute`. Each one verifies the previous zkey against the r1cs and the powers-of-tau file before adding their share. The r1cs hash has to match the published circuit, not a later edit.
- Entropy that is never passed with `-e`, never written to a shared disk, and never sent to the coordinator. A contributor who types it into a command line has already leaked it into shell history.
- Destruction of toxic waste by every contributor: the randomness for their powers-of-tau contribution and the randomness for their phase-2 contribution. Soundness holds if at least one contributor actually destroyed theirs. A ceremony where every contributor might have kept a copy does not.
- A published verification key and a published verifier build, reproducible from the final zkey, plus the r1cs and the transcript so a third party can rerun `zkey verify`.
- No single machine that sees every contribution's entropy. A coordinator who only forwards files is fine. A coordinator who generates the only contribution is the local dev ceremony above.

This repository does not run that ceremony.

The development commands above were executed once with snarkjs 0.7.5 against this `withdraw.r1cs`. `powersoftau verify` printed `Powers of Tau Ok!` and `zkey verify` printed `ZKey Ok!`. The `.ptau`, `.zkey`, and `verification_key.json` from that run were deleted. They are not in this repository. Success of that run does not make the local ceremony sufficient for mainnet.
