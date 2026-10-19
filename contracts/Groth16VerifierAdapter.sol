// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {IVerifier} from "./interfaces/IVerifier.sol";
import {Groth16Verifier} from "./Groth16Verifier.sol";
/// @notice Unpacks `[a0, a1, b00, b01, b10, b11, c0, c1]` and swaps `pi_b` for the snarkjs verifier.
contract Groth16VerifierAdapter is IVerifier {
    Groth16Verifier public immutable verifier;
    constructor(Groth16Verifier verifier_) { verifier = verifier_; }
    function verifyProof(uint256[8] calldata proof, uint256[5] calldata publicInputs) external view returns (bool) {
        uint256[2] memory pA = [proof[0], proof[1]];
        uint256[2][2] memory pB = [[proof[3], proof[2]], [proof[5], proof[4]]];
        uint256[2] memory pC = [proof[6], proof[7]];
        return verifier.verifyProof(pA, pB, pC, publicInputs);
    }
}
