// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PoseidonT3} from "../contracts/lib/PoseidonT3.sol";

interface PoseidonVm {
    function readFile(string calldata path) external view returns (string memory data);
    function parseJsonUintArray(string calldata json, string calldata key) external pure returns (uint256[] memory);
}

/// @notice The 57 partial-round constants in PoseidonT3 match circomlib POSEIDON_C(3)[15..71].
contract PoseidonTable {
    error Mismatch(uint256 index, uint256 got, uint256 expected);

    PoseidonVm private constant VM = PoseidonVm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function test_partial_round_constants_match_circomlib() external {
        PoseidonT3 hasher = new PoseidonT3();
        bytes memory packed = hasher.packedRoundConstants();
        string memory json = VM.readFile("test/fixtures/circomlib_poseidon_t3_constants.json");
        uint256[] memory expected = VM.parseJsonUintArray(json, ".partialRoundConstants");
        if (expected.length != 57) revert Mismatch(57, expected.length, 57);
        uint256[57] memory got;
        for (uint256 i = 0; i < 57; i++) {
            got[i] = _word(packed, 15 + i);
            if (got[i] != expected[i]) revert Mismatch(i, got[i], expected[i]);
        }
    }

    function _word(bytes memory packed, uint256 index) private pure returns (uint256 word) {
        uint256 base = index * 32;
        for (uint256 b = 0; b < 32; b++) {
            word = (word << 8) | uint256(uint8(packed[base + b]));
        }
    }
}
