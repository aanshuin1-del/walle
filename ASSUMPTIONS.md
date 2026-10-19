This file lists the assumptions the unlinkability definition in `THREAT_MODEL.md` depends on. For each primitive it records the parameters used in this repository and what fails if the assumption is false.

## Poseidon

The hash is the circomlib 2.0.5 instantiation of Poseidon, which cites the parameter-generation procedure in [ePrint 2019/458](https://eprint.iacr.org/2019/458.pdf) (tables 2 and 8) and the Grain-LFSR constants script referenced in `poseidon.circom` and `poseidon_constants.circom`.

Parameters:

- Prime field: the BN254 scalar field, `p = 21888242871839275222246405745257275088548364400416034343698204186575808495617` (`0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001`).
- S-box: `x^5`, as the circomlib `Sigma` template (`in^4 * in`).
- Full rounds: `nRoundsF = 8` for every width used here.
- Partial rounds: `nRoundsP = N_ROUNDS_P[t - 2]` with `N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68]` and `t = nInputs + 1`.
- Initial state: `0`, as in the circomlib `Poseidon(nInputs)` template.
- Round constants and MDS matrices: `POSEIDON_C(t)`, `POSEIDON_S(t)`, `POSEIDON_M(t)`, and `POSEIDON_P(t)` from circomlib `poseidon_constants.circom`.

Widths this protocol uses:

| Use | Template | Inputs | `t` | Full rounds | Partial rounds |
| --- | --- | --- | --- | --- | --- |
| Commitment | `Poseidon(4)` | `secret, nullifier, denomination, poolId` | 5 | 8 | 60 |
| Merkle tree and on-chain hasher | `Poseidon(2)` | the two children | 3 | 8 | 57 |
| Nullifier hash | `Poseidon(1)` | `nullifier` | 2 | 8 | 56 |

`poolId` is the compile-time constant in `circuits/withdraw.circom`. It is a domain separator, not a secret.

The on-chain `IPoseidonT3.poseidon(uint256[2])` implementation must be this same `Poseidon(2)`, including the constants. The contract computes the empty-tree sibling values by calling it. The circuit walks the path with circomlib `Poseidon(2)`. If those two functions differ, an honest path does not match the stored root.

Assumed properties: collision resistance and preimage resistance of each width above, over this field, with these rounds and constants.

What breaks if Poseidon fails:

- A collision on `Poseidon(4)` makes two different notes share a leaf. The tree then contains one of those commitments. The other note cannot be inserted as a distinct leaf with that image.
- A collision on `Poseidon(1)` makes two nullifiers share a `nullifierHash`. The first withdrawal sets `_nullifierUsed`. The second note cannot be withdrawn. That is a loss for the holder of the second note, not a mint.
- A preimage attack on `Poseidon(4)`, or a preimage attack on `Poseidon(1)` together with enough of the commitment preimage to test leaves, lets an adversary connect a published `nullifierHash` to a `commitment`. The distinguishing advantage in the unlinkability definition is then not negligible, regardless of set size.
- A break of the round parameters (fewer rounds, different S-box, different constants) removes the basis for the two properties above. The circuit and the contract would also disagree if only one of them changed.
- A malicious `IPoseidonT3` chosen at deployment can write roots that the real Poseidon circuit will not accept, or roots that a different circuit would accept. The deployer picks the hasher once. There is no admin function to replace it later. Users have to read the immutable address and decide if the bytecode is the circomlib hasher.

## Groth16

The proof system is Groth16 on BN254, as produced by snarkjs from `circuits/withdraw.circom`. The verifier is an immutable address passed to the pool constructor. The contract calls `verifyProof(uint256[8] proof, uint256[5] publicInputs)` and reverts with `InvalidProof` when it returns false. Public inputs are `root, nullifierHash, denomination, recipient, relayer`, in that order. The witness also contains `secret, nullifier, privateDenomination, pathElements[20], pathIndices[20]`.

Assumed properties:

- Knowledge soundness relative to the structured reference string. A proof that verifies is a proof that the prover knows a witness satisfying the circuit for those public inputs.
- Zero knowledge. The proof does not give a probabilistic polynomial-time adversary a non-negligible advantage at recovering the witness, or at telling which of two witnesses with the same public inputs was used.
- The structured reference string was produced by the ceremony described in the Trusted Setup section, and the trapdoor was destroyed.

What breaks if Groth16 fails:

- If knowledge soundness fails, or if the trapdoor (`tau` from powers of tau, and the phase-2 toxic waste) is known, an adversary can produce a verifying proof for a root that is in the history and for a fresh `nullifierHash`, with no corresponding deposit. `withdraw` will pay `recipient` and `relayer`. The pool can be emptied.
- If zero knowledge fails, the proof can leak `secret`, `nullifier`, or the merkle path. The path identifies `leafIndex`. That identifies the `Deposit` event. Unlinkability, as defined in `THREAT_MODEL.md`, does not hold.
- If the verifier bytecode does not implement Groth16 for this circuit and this reference string, the check is meaningless. As with the hasher, the address is immutable and there is no admin key to swap it. A wrong verifier at deployment is a failed setup, not a later configuration change.

## Merkle tree

Each denomination has its own tree.

- Depth: 20. Capacity: `2^20` leaves.
- Hasher: Poseidon as specified above, two children, left then right.
- Leaf: the commitment `Poseidon(secret, nullifier, denomination, poolId)`.
- Sibling values for empty subtrees: `zeros[0] = 0`, `zeros[i+1] = Poseidon(zeros[i], zeros[i])`. The contract stores `zeros[0..19]` and uses them during insertion.
- Root history: a ring buffer of 100 roots per denomination. `withdraw` accepts a root only if it appears in that buffer for that denomination. A root of `0` is not treated as stored, because unused slots are `0` and a Poseidon root of `0` is not a value this check will honor.
- `pathIndices[i] = 0` means the current node is the left child. `pathIndices[i] = 1` means it is the right child. The circuit constrains each index to `{0,1}`.

What breaks if the tree fails:

- A bad insertion that stores a root the circuit cannot reach makes honest notes unspendable.
- A bad insertion that stores a root the circuit can reach for a leaf that was never deposited, or a missing root check, lets an adversary withdraw without a deposit. That is theft, and it is independent of Poseidon being collision-resistant.
- A history shorter than a user's delay evicts the root their path targets. The note is stuck until... it is stuck. Nothing in the contract restores an evicted root. One hundred is the spec, not a promise that every user withdraws in time.
- Filling past `2^20` leaves must not wrap the index. The contract reverts the insert rather than overwrite an existing leaf.

## Nullifier hash

The nullifier hash is `Poseidon(nullifier)` with the one-input parameters in the table above. `withdraw` writes `_nullifierUsed[denomination][nullifierHash] = true` before any ether moves. A second call with the same pair reverts with `NullifierUsed`.

The circuit ties that hash to the same `nullifier` that is an input to the commitment, and it ties the private denomination to the public denomination. The contract's nullifier map is keyed by denomination, matching the per-denomination tree.

What breaks if the nullifier hash fails:

- Preimage recovery of `nullifier` from `nullifierHash` lets an adversary test which commitment contains that nullifier. Combined with the public denomination and `poolId`, that is a direct link from a withdrawal to a deposit. Unlinkability fails.
- If the circuit did not bind the nullifier inside the commitment, a prover could change the nullifier after observing which hashes are already used, or could spend a leaf without burning the nullifier that belongs to it. The second case is a double spend if the contract then stores a different hash.
- If the contract did not store the hash before transferring ether, a reentrant callee could submit the same proof again. The checks-effects-interactions order is part of making this primitive hold in the EVM, not only in the circuit.
- A collision, as above, makes one valid note unspendable after the other is spent. It does not by itself create a new coin.

## Trusted Setup

A local dev ceremony is NOT sufficient for mainnet.

The powers-of-tau and phase-2 commands for a development machine are written in `circuits/PARAMS.md`. Running them produces a structured reference string that makes Groth16's soundness depend on one operator deleting the toxic waste. That operator can keep `tau` and the phase-2 randomness and forge proofs. A file on a laptop, a shell history entry, or a core dump is enough. There is no second party who would notice.

Mainnet use of this pool requires a multi-party ceremony in which soundness holds as long as at least one participant destroys their contribution. This repository does not run that ceremony, does not publish a production reference string, and does not check in a verifier generated from a local `zkey`.

## What This Does Not Assume

- It does not assume the RPC is honest. The endpoint is chosen by the user and can lie about `liveSetSize`, hide events, record the caller's network address, or refuse to broadcast. The unlinkability definition is about an adversary who has the real chain. A false view of the chain is outside that definition and is not ruled out by the proof.
- It does not assume the frontend is uncompromised. The script that builds or holds `secret` and `nullifier` can send them anywhere if someone else served that script. Zero knowledge of the resulting proof does not help after the witness has been copied. The reference page is static and has no telemetry. That is a reduction in surface, not an assumption that the bytes are intact.
- It does not assume the relayer is non-colluding. The relayer sees the recipient and the nullifier hash before the transaction is included, and can refuse to submit. Collusion with a deposit-time observer adds timing and denomination. The proof is required not to reveal the witness to the relayer; that requirement is the Groth16 zero-knowledge assumption above, not an assumption that the relayer is honest or working alone.
