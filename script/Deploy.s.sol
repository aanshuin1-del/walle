// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPoseidonT3} from "../contracts/interfaces/IPoseidonT3.sol";
import {IVerifier} from "../contracts/interfaces/IVerifier.sol";
import {Groth16Verifier} from "../contracts/Groth16Verifier.sol";
import {Groth16VerifierAdapter} from "../contracts/Groth16VerifierAdapter.sol";
import {PoseidonT3} from "../contracts/lib/PoseidonT3.sol";
import {TwisterShieldedPool} from "../contracts/TwisterShieldedPool.sol";

interface DeployVm {
    function envUint(string calldata name) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Deploy PoseidonT3, Groth16Verifier, Groth16VerifierAdapter, and the pool.
/// @dev No defaults. Requires PRIVATE_KEY, DENOMINATION, and COMMITMENT in the environment.
contract Deploy {
    DeployVm private constant VM = DeployVm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    address private constant CONSOLE = address(0x000000000000000000636F6e736F6c652e6c6f67);

    function run() external {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");
        uint256 denomination = VM.envUint("DENOMINATION");
        uint256 commitment = VM.envUint("COMMITMENT");

        VM.startBroadcast(privateKey);
        PoseidonT3 poseidon = new PoseidonT3();
        Groth16Verifier verifier = new Groth16Verifier();
        Groth16VerifierAdapter adapter = new Groth16VerifierAdapter(verifier);
        TwisterShieldedPool pool = new TwisterShieldedPool(IPoseidonT3(poseidon), IVerifier(adapter));
        pool.deposit{value: denomination}(denomination, commitment);
        VM.stopBroadcast();

        _log("PoseidonT3", address(poseidon));
        _log("Groth16Verifier", address(verifier));
        _log("Groth16VerifierAdapter", address(adapter));
        _log("TwisterShieldedPool", address(pool));
    }

    function _log(string memory label, address account) private view {
        (bool ok,) = CONSOLE.staticcall(abi.encodeWithSignature("log(string,address)", label, account));
        if (!ok) revert();
    }
}
