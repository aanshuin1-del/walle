// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPoseidonT3} from "../contracts/interfaces/IPoseidonT3.sol";
import {IVerifier} from "../contracts/interfaces/IVerifier.sol";
import {Groth16Verifier} from "../contracts/Groth16Verifier.sol";
import {Groth16VerifierAdapter} from "../contracts/Groth16VerifierAdapter.sol";
import {PoseidonT3} from "../contracts/lib/PoseidonT3.sol";
import {TwisterShieldedPool} from "../contracts/TwisterShieldedPool.sol";

interface FixtureVm {
    function deal(address who, uint256 newBalance) external;
    function readFile(string calldata path) external view returns (string memory data);
    function parseJsonUint(string calldata json, string calldata key) external pure returns (uint256);
    function parseJsonUintArray(string calldata json, string calldata key) external pure returns (uint256[] memory);
}

contract VerifierE2E {
    error Unexpected(bytes data);

    FixtureVm private constant VM = FixtureVm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function _load()
        private
        view
        returns (uint256[8] memory proof, uint256[5] memory publicInputs, uint256 commitment)
    {
        string memory json = VM.readFile("test/fixtures/valid_proof.json");
        uint256[] memory proofWords = VM.parseJsonUintArray(json, ".proof");
        uint256[] memory inputs = VM.parseJsonUintArray(json, ".publicInputs");
        if (proofWords.length != 8 || inputs.length != 5) revert Unexpected("shape");
        for (uint256 i = 0; i < 8; i++) proof[i] = proofWords[i];
        for (uint256 i = 0; i < 5; i++) publicInputs[i] = inputs[i];
        commitment = VM.parseJsonUint(json, ".commitment");
    }

    function _adapter() private returns (Groth16VerifierAdapter) {
        return new Groth16VerifierAdapter(new Groth16Verifier());
    }

    function test_RealProofVerifies() external {
        (uint256[8] memory proof, uint256[5] memory publicInputs,) = _load();
        if (!_adapter().verifyProof(proof, publicInputs)) revert Unexpected("verify");
    }

    function test_MutatedPublicInputFails() external {
        (uint256[8] memory proof, uint256[5] memory publicInputs,) = _load();
        publicInputs[4] += 1;
        if (_adapter().verifyProof(proof, publicInputs)) revert Unexpected("mutated");
    }

    function test_PoolAcceptsRealProof() external {
        (uint256[8] memory proof, uint256[5] memory publicInputs, uint256 commitment) = _load();
        PoseidonT3 poseidon = new PoseidonT3();
        Groth16VerifierAdapter adapter = _adapter();
        TwisterShieldedPool pool = new TwisterShieldedPool(IPoseidonT3(poseidon), IVerifier(adapter));
        VM.deal(address(this), publicInputs[2]);
        pool.deposit{value: publicInputs[2]}(publicInputs[2], commitment);
        if (pool.rootHistory(publicInputs[2], 0) != publicInputs[0]) revert Unexpected("root");
        (bool ok, bytes memory data) = address(pool).call(
            abi.encodeCall(
                TwisterShieldedPool.withdraw,
                (
                    publicInputs[2],
                    publicInputs[0],
                    publicInputs[1],
                    address(uint160(publicInputs[3])),
                    address(uint160(publicInputs[4])),
                    uint256(0),
                    proof
                )
            )
        );
        if (!ok) revert Unexpected(data);
    }
}
