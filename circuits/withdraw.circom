pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";

// Withdrawal membership circuit.
//
// Public signals, in the same order TwisterShieldedPool builds publicInputs:
//   root, nullifierHash, denomination, recipient, relayer
//
// Private inputs from the spec:
//   secret, nullifier, denomination, pathElements[20], pathIndices[20]
// The private denomination cannot reuse the public signal name, so it is
// `privateDenomination`. Constraint group G4 forces them to be equal.
template Withdraw(depth) {
    signal input root;
    signal input nullifierHash;
    signal input denomination;
    signal input recipient;
    signal input relayer;

    signal input secret;
    signal input nullifier;
    signal input privateDenomination;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    // poolId is a compile-time constant, not a witness input.
    // ASCII bytes of "Twister" = 0x54776973746572.
    // A commitment hashed for a different poolId will not match a leaf in this pool.
    var POOL_ID = 0x54776973746572;

    // ---------------------------------------------------------------------
    // G1. Poseidon(secret, nullifier, denomination, poolId) == leaf
    // The denomination inside the commitment is the private one.
    // ---------------------------------------------------------------------
    component commitmentHasher = Poseidon(4);
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== nullifier;
    commitmentHasher.inputs[2] <== privateDenomination;
    commitmentHasher.inputs[3] <== POOL_ID;
    signal leaf;
    leaf <== commitmentHasher.out;

    // ---------------------------------------------------------------------
    // G2. Merkle path walk, leaf -> root, via pathElements and pathIndices.
    // pathIndices[i] == 0: current node is the left child.
    // pathIndices[i] == 1: current node is the right child.
    // The hasher is circomlib Poseidon(2), the same function as IPoseidonT3.
    // ---------------------------------------------------------------------
    component hashers[depth];
    signal level[depth + 1];
    level[0] <== leaf;
    for (var i = 0; i < depth; i++) {
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== level[i] + pathIndices[i] * (pathElements[i] - level[i]);
        hashers[i].inputs[1] <== pathElements[i] + pathIndices[i] * (level[i] - pathElements[i]);
        level[i + 1] <== hashers[i].out;
    }
    level[depth] === root;

    // ---------------------------------------------------------------------
    // G3. Poseidon(nullifier) == nullifierHash
    // ---------------------------------------------------------------------
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHasher.out === nullifierHash;

    // ---------------------------------------------------------------------
    // G4. Private denomination == public denomination
    // ---------------------------------------------------------------------
    privateDenomination === denomination;

    // ---------------------------------------------------------------------
    // G5. Each pathIndices[i] is in {0, 1}
    // Without this, the G2 selector is not a multiplexer.
    // ---------------------------------------------------------------------
    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;
    }

    // ---------------------------------------------------------------------
    // G6. Range checks.
    // nullifierHash < p: every circom signal is an element of the BN254
    // scalar field, so the bound holds for the signal domain. p < 2^254, so
    // a 254-bit decomposition is satisfiable for every field element and does
    // not accept a representative at or above p. Num2Bits(254) is that
    // decomposition.
    // recipient < 2^160 and relayer < 2^160 are enforced by Num2Bits(160).
    // The pool passes uint256(uint160(address)), which meets the same bound.
    // ---------------------------------------------------------------------
    component nullifierHashBits = Num2Bits(254);
    nullifierHashBits.in <== nullifierHash;
    component recipientBits = Num2Bits(160);
    recipientBits.in <== recipient;
    component relayerBits = Num2Bits(160);
    relayerBits.in <== relayer;
}

component main {public [root, nullifierHash, denomination, recipient, relayer]} = Withdraw(20);
