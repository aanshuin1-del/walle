# Withdraw circuit

`withdraw.circom` is a circom 2.1 circuit. The hasher is circomlib 2.0.5 `Poseidon`. The main component is `Withdraw(20)` with public signals in this order:

`root`, `nullifierHash`, `denomination`, `recipient`, `relayer`

That is the order `TwisterShieldedPool.withdraw` passes to `IVerifier.verifyProof`. The symbol file produced by the compile lists those five signals at witness positions 1 through 5.

Private inputs are `secret`, `nullifier`, `privateDenomination`, `pathElements[20]`, and `pathIndices[20]`. `privateDenomination` is the spec's private `denomination`. Circom cannot declare two signals with the same name, and the public signal must be named `denomination` so the public order matches the contract. Group G4 sets them equal.

`poolId` is not an input. It is the compile-time constant `0x54776973746572` (decimal `23775192835974514`), the ASCII bytes of `Twister`.

## Compile

From this directory, with circom 2.2.3:

```
npm install circomlib@2.0.5
circom withdraw.circom --r1cs --wasm --sym
```

Compiler output for that command:

```
non-linear constraints: 6010
linear constraints: 6118
public inputs: 5
private inputs: 43 (42 belong to witness)
public outputs: 0
```

`snarkjs r1cs info withdraw.r1cs` reports 12128 constraints. That is 6010 + 6118, and it is the count a powers-of-tau ceremony has to cover. `2^13 = 8192` is short. `2^14 = 16384` covers it.

The line `42 belong to witness` is the G4 equality. The compiler substitutes `privateDenomination` with the public `denomination` (witness index `-1` in `withdraw.sym`). The equality is enforced by that substitution. The other 42 private inputs remain witness inputs.

## Constraint groups

### G1. `Poseidon(secret, nullifier, privateDenomination, poolId) == leaf`

Proves the leaf that enters the merkle path is the commitment of this secret, this nullifier, this denomination, and this pool id.

If removed, the leaf is whatever the path uses and is no longer tied to the note. A prover who knows a path to any deposited leaf can use it without knowing that note's secret or nullifier. The withdrawal then pays out against someone else's deposit.

### G2. Merkle path from `leaf` to `root`

Proves `leaf` is a member of the depth-20 Poseidon tree whose root is the public `root`. At level `i`, `pathIndices[i] = 0` puts the running node on the left and `pathIndices[i] = 1` puts it on the right. The sibling is `pathElements[i]`. The hash is circomlib `Poseidon(2)`, the same function `IPoseidonT3` must implement.

If removed, the public root is not a hash of the leaf. The contract will still require the root to be in the ring buffer, but the proof would no longer show that the committed note is in that tree. A prover could pass a stored root and a leaf that was never inserted.

### G3. `Poseidon(nullifier) == nullifierHash`

Proves the public nullifier hash is the one-input Poseidon image of the same nullifier that G1 put in the commitment.

If removed, `nullifierHash` is not bound to the note. The contract would mark a hash the prover can change on every call, so one deposit can be withdrawn more than once. The prover could also publish a hash already used by another note and make that note unspendable.

G4 — Denomination alias. The compiler substitutes privateDenomination with the public signal, so this group adds no r1cs constraints. Soundness is preserved because the commitment hash in G1 is then computed with the public denomination; a prover cannot present a leaf whose commitment was computed with a different denomination. r1cs info shows 43 declared private inputs and 42 in the witness; the missing slot is privateDenomination (symbol index -1).

### G5. `pathIndices[i] * (pathIndices[i] - 1) == 0`

Proves each path index is 0 or 1.

If removed, the G2 selector `level + index * (sibling - level)` is a linear combination, not a multiplexer. An index outside `{0, 1}` can make that combination hash to the next level for a node that is not the left child or the right child. Membership is then not the merkle path the contract computed.

### G6. Range checks

Proves a 254-bit decomposition of `nullifierHash`, and a 160-bit decomposition of `recipient` and of `relayer`.

`nullifierHash < p` holds because every signal is an element of the BN254 scalar field `p = 21888242871839275222246405745257275088548364400416034343698204186575808495617`, and `p < 2^254`. `Num2Bits(254)` is satisfiable for every field element. It does not admit a representative `>= p`, and there is no witness in which `nullifierHash >= p`. Removing only that decomposition does not allow a new public input; the field already excluded it.

`recipient < 2^160` and `relayer < 2^160` are real constraints. The pool casts each address with `uint256(uint160(...))` before putting it in the public inputs, so an honest contract call already meets them. If the decompositions are removed, a public input at or above `2^160` can verify. That value is not an address. A caller that passed the field element through without the cast would not be paying the account the proof was meant to name.

## Constraint removal test plan

Plan only. This directory does not contain those tests.

For each group, make a copy of `withdraw.circom` with only that group's constraints deleted, compile it, and compare witnesses against the unmodified circuit. Use the wasm witness generator from `circom --wasm`. Check satisfaction with `snarkjs wtns check <r1cs> <wtns>` on both circuits. Do not treat a successful check on the weakened circuit as a pass. The pass condition is the pair of outcomes below.

| Group removed | Honest witness | Malicious witness | Full circuit on the malicious witness |
| --- | --- | --- | --- |
| G1 | Still satisfies the weakened circuit if the path is built for the real commitment. Build a second witness whose leaf is a different deposited leaf and whose secret does not open that leaf. | Satisfies the weakened circuit. | `wtns check` fails. |
| G2 | Still satisfies if `level[depth] === root` is the constraint deleted and the rest of the path is intact only when the root is left free. Malicious witness: a root that is not the hash of the path, with the same leaf. | Satisfies the weakened circuit. | `wtns check` fails. |
| G3 | Still satisfies when `nullifierHash` is actually `Poseidon(nullifier)`. Malicious witness: same note, `nullifierHash` replaced by `Poseidon(nullifier) + 1`. | Satisfies the weakened circuit. | `wtns check` fails. |
| G4 | Still satisfies when the two denomination signals are equal. Malicious witness: `privateDenomination = denomination + 1`, leaf = `Poseidon(secret, nullifier, privateDenomination, poolId)`, path rebuilt for that leaf, public `denomination` unchanged. The weakened circuit has no equality left to fail. | Satisfies the weakened circuit. | `wtns check` fails on `privateDenomination === denomination`. |
| G5 | Still satisfies for a real 0/1 path. Malicious witness: `pathIndices[0] = 2`, and `pathElements[0]` chosen so the G2 linear combination still produces the next hash the rest of the path expects. | Satisfies the weakened circuit. | `wtns check` fails on `index * (index - 1) === 0`. |
| G6 | Still satisfies for a recipient and a relayer below `2^160`. Malicious witness: `recipient = 2^160`. A witness with `nullifierHash >= p` cannot be constructed; the field rejects it in the witness generator, which is the check for that half of G6. | Recipient witness satisfies the weakened circuit and fails `Num2Bits(160)` on the full circuit. | `wtns check` fails for the recipient witness. The `>= p` case fails while building the witness, on both circuits. |

No test in this plan is implemented here. No proving key is generated here.

## Round schedule

`PoseidonT3` follows circomlib `Poseidon` for `t = 3`: `nRoundsF = 8` and `nRoundsP = 57`. The packed table `POSEIDON_C(3)` holds 81 field elements, `t * nRoundsF + nRoundsP`.

Those 81 words are consumed as 5 full Arks, then 57 partial-round constants, then 3 full Arks. Inclusive indices:

- `0` through `14`. Five full Arks, three words each. Ark 0 (indices 0–2) is added before any S-box. The next four Arks follow the four first-half full S-boxes, at indices 3–5, 6–8, 9–11, and 12–14. The linear mix after index 14 is `POSEIDON_P`.
- `15` through `71`. One word per partial round, added only to `state[0]`. Partial round `r` reads index `(nRoundsF / 2 + 1) * t + r`, which is `15 + r`.
- `72` through `80`. Three full Arks after the first three second-half full S-boxes, at indices 72–74, 75–77, and 78–80. The eighth full S-box is followed by `MixLast` and reads no further round constant.

The first half stores `nRoundsF / 2 + 1 = 5` Arks because the permutation adds a constant vector before the first S-box and after each of the four first-half S-boxes. The second half stores `nRoundsF / 2 - 1 = 3` Arks because the last full S-box has no Ark after it. S-box rounds are still four full, 57 partial, and four full. The constant groups in the packed table are 5, 57, and 3.

This is the control flow in circomlib `circuits/poseidon.circom` at commit `cff5ab6288b55ef23602221694a6a38a0239dcc0` (tag v2.0.5, 17 June 2022). The installed `poseidon.circom` and `poseidon_constants.circom` match that commit byte for byte. `contracts/lib/PoseidonT3.sol` uses the same offsets.
