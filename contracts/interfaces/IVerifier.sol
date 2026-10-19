// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Groth16 verifier called by `TwisterShieldedPool`.
/// @dev `proof` is the snarkjs proof points flattened as `[a0, a1, b00, b01, b10, b11, c0, c1]`.
///      `publicInputs` is `[root, nullifierHash, denomination, recipient, relayer]`.
interface IVerifier {
    /// @notice Check a Groth16 proof against the public inputs.
    /// @param proof Flattened proof points, length 8.
    /// @param publicInputs Public inputs in the order the pool builds them.
    /// @return True when the proof verifies for `publicInputs`.
    function verifyProof(uint256[8] calldata proof, uint256[5] calldata publicInputs) external view returns (bool);
}
