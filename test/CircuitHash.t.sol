// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface CircuitVm {
    function readFile(string calldata path) external view returns (string memory data);
    function readFileBinary(string calldata path) external view returns (bytes memory data);
}

/// @notice The checked-in r1cs hash matches circuits/withdraw.r1cs and test/fixtures/circuit_hash.txt.
contract CircuitHash {
    CircuitVm private constant VM = CircuitVm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    bytes32 constant EXPECTED_R1CS_HASH = 0xf01a439d222d083c46e4b6515a6f3578d7114d77115175a4012a758e1c3771a0;

    function test_CircuitHash() external view {
        bytes32 got = sha256(VM.readFileBinary("circuits/withdraw.r1cs"));
        bytes32 fromFile = _hex32(VM.readFile("test/fixtures/circuit_hash.txt"));
        if (got != EXPECTED_R1CS_HASH || fromFile != EXPECTED_R1CS_HASH) {
            revert("circuit changed: regenerate fixture + verifier, update circuit_hash.txt and PARAMS.md");
        }
    }

    function _hex32(string memory text) private pure returns (bytes32) {
        bytes memory raw = bytes(text);
        uint256 n = raw.length;
        if (n > 0 && raw[n - 1] == 0x0a) n--;
        if (n > 0 && raw[n - 1] == 0x0d) n--;
        if (n != 64) {
            revert("circuit changed: regenerate fixture + verifier, update circuit_hash.txt and PARAMS.md");
        }
        uint256 acc;
        for (uint256 i = 0; i < 64; i++) {
            uint256 c = uint256(uint8(raw[i]));
            uint256 d;
            if (c >= 48 && c <= 57) d = c - 48;
            else if (c >= 97 && c <= 102) d = c - 87;
            else if (c >= 65 && c <= 70) d = c - 55;
            else revert("circuit changed: regenerate fixture + verifier, update circuit_hash.txt and PARAMS.md");
            acc = (acc << 4) | d;
        }
        return bytes32(acc);
    }
}
