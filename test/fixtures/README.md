# Fixtures

These files are generated from circomlib. They are not produced by calling `PoseidonT3`.

## `circomlib_poseidon_t3_constants.json`

circomlib 2.0.5, commit `cff5ab6288b55ef23602221694a6a38a0239dcc0` (tag v2.0.5). The `constants` array is all 81 `POSEIDON_C(3)` words, indices 0 through 80, from `circuits/poseidon_constants.circom` in that commit. The copy installed at `circuits/node_modules/circomlib` matches that file byte for byte.

From the repository root, after `npm install circomlib@2.0.5` inside `circuits/`:

```
node test/fixtures/prepare.mjs
```

`prepare.mjs` parses the circom source and writes `constants`. It does not read `contracts/lib/PoseidonT3.sol`.

## `poseidon_vectors.json`

Same circomlib commit and the same command. Each `vectors[i]` entry is the witness array from `snarkjs wtns export json` for this circuit:

```
pragma circom 2.0.0;
include "poseidon.circom";
template Main() {
    signal input a;
    signal input b;
    signal output out;
    component h = Poseidon(2);
    h.inputs[0] <== a;
    h.inputs[1] <== b;
    out <== h.out;
}
component main = Main();
```

`prepare.mjs` compiles that circuit with circom and runs:

```
snarkjs wtns calculate <wasm> <input.json> <wtns>
snarkjs wtns export json <wtns> <out.json>
```

The exported array is stored as-is. Index 0 is 1, index 1 is `main.out`, index 2 is `main.a`, and index 3 is `main.b`. The array length is 520. `test/PoseidonVectors.t.sol` hashes indices 2 and 3 with `PoseidonT3` and compares the image to index 1.

## `circuit_hash.txt`

sha256 of `circuits/withdraw.r1cs`, one line, lowercase hex, no `0x` prefix, trailing newline. `test/CircuitHash.t.sol` reads it.

## `valid_proof.json`

`test/fixtures/generate.sh` writes this after the ceremony in `circuits/PARAMS.md`. The script requires `circuits/withdraw_phase2.zkey` and exits if that file is absent.
