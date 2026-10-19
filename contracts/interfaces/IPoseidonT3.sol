// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Two-input Poseidon hasher. Bytecode at the bound address must be circomlib `Poseidon(2)` (`t = 3`).
interface IPoseidonT3 {
    /// @notice Hash two field elements.
    /// @param input Left child and right child, in that order.
    /// @return Image of `Poseidon(input[0], input[1])` in the BN254 scalar field.
    function poseidon(uint256[2] memory input) external pure returns (uint256);
}
