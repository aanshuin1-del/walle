// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PoseidonT3} from "../contracts/lib/PoseidonT3.sol";

interface VectorVm {
    function readFile(string calldata path) external view returns (string memory data);
    function parseJsonUint(string calldata json, string calldata key) external pure returns (uint256);
    function toString(uint256 value) external pure returns (string memory);
}

/// @notice Twelve Poseidon(2) witnesses from circom. Each entry is the snarkjs witness array.
/// Index 0 is 1, index 1 is main.out, index 2 is main.a, index 3 is main.b.
contract PoseidonVectors {
    error Mismatch(uint256 index, uint256 got, uint256 expected);

    VectorVm private constant VM = VectorVm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function test_twelve_circom_vectors() external {
        string memory json = VM.readFile("test/fixtures/poseidon_vectors.json");
        PoseidonT3 hasher = new PoseidonT3();
        for (uint256 i = 0; i < 12; i++) {
            string memory index = VM.toString(i);
            uint256 one = VM.parseJsonUint(json, string.concat(".vectors[", index, "][0]"));
            uint256 expected = VM.parseJsonUint(json, string.concat(".vectors[", index, "][1]"));
            uint256 left = VM.parseJsonUint(json, string.concat(".vectors[", index, "][2]"));
            uint256 right = VM.parseJsonUint(json, string.concat(".vectors[", index, "][3]"));
            if (one != 1) revert Mismatch(i, one, 1);
            uint256[2] memory input;
            input[0] = left;
            input[1] = right;
            uint256 got = hasher.poseidon(input);
            if (got != expected) revert Mismatch(i, got, expected);
        }
    }
}
