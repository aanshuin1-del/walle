// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPoseidonT3} from "./interfaces/IPoseidonT3.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";

/// @title TwisterShieldedPool
/// @notice Fixed-denomination pool. One Poseidon Merkle tree per denomination. Withdrawals require a Groth16 proof.
/// @dev No admin, no pause, no upgrade path. The hasher and the verifier are immutable.
///      "Unlinkable" means: for any probabilistic polynomial-time adversary with full access to all on-chain data, the advantage of distinguishing "withdrawal W came from deposit D1" from "W came from D2" is negligible in the security parameter, given an anonymity set of size >= K, under the assumptions in ASSUMPTIONS.md.
contract TwisterShieldedPool {
    /// @notice Depth of each per-denomination incremental Merkle tree.
    uint256 public constant MERKLE_DEPTH = 20;

    /// @notice Number of roots retained per denomination. Older roots are overwritten.
    uint256 public constant ROOT_HISTORY = 100;

    /// @notice Circomlib `Poseidon(2)` contract. Set once in the constructor.
    IPoseidonT3 public immutable poseidon;

    /// @notice Groth16 verifier for the withdraw circuit. Set once in the constructor.
    IVerifier public immutable verifier;

    /// @notice Empty-subtree sibling at each level. `zeros[0] = 0`, then each next value is `Poseidon(z, z)`.
    uint256[MERKLE_DEPTH] private _zeros;

    /// @notice Most recent left child written at each level, per denomination.
    mapping(uint256 denomination => mapping(uint256 level => uint256 node)) private _filledSubtrees;

    /// @notice Next leaf index per denomination. Capacity is 2^20, which fits in uint32.
    mapping(uint256 denomination => uint32 index) private _nextIndex;

    /// @notice Ring buffer of roots per denomination. Unused slots stay 0.
    mapping(uint256 denomination => mapping(uint256 slot => uint256 root)) private _rootHistory;

    /// @notice Next write slot in `_rootHistory`, per denomination.
    mapping(uint256 denomination => uint256 slot) private _rootHistoryIndex;

    /// @notice Spent nullifier hashes, per denomination.
    mapping(uint256 denomination => mapping(uint256 nullifierHash => bool spent)) private _nullifierUsed;

    /// @notice Notes of this denomination deposited and not yet withdrawn. This is the set size.
    mapping(uint256 denomination => uint256 count) public liveSetSize;

    /// @notice A commitment was inserted. This event has no depositor field.
    /// @param denomination Supported wei amount the caller paid.
    /// @param commitment Leaf inserted into that denomination's tree.
    /// @param leafIndex Index of the inserted leaf.
    event Deposit(uint256 indexed denomination, uint256 commitment, uint32 leafIndex);

    /// @notice A note was spent and wei was sent. This event has no commitment field.
    /// @param denomination Denomination of the spent note.
    /// @param nullifierHash `Poseidon(nullifier)`, now marked used.
    /// @param recipient Account paid `denomination - relayerFee`.
    /// @param relayer Account paid `relayerFee`.
    /// @param relayerFee Wei paid to `relayer`.
    event Withdrawal(
        uint256 indexed denomination,
        uint256 nullifierHash,
        address recipient,
        address relayer,
        uint256 relayerFee
    );

    /// @notice `denomination` is not one of the four supported wei amounts, or `msg.value` does not equal it.
    error NotDenomination();

    /// @notice This denomination has already recorded `nullifierHash`.
    error NullifierUsed();

    /// @notice `root` is not one of the retained roots for this denomination.
    error UnknownRoot();

    /// @notice The verifier rejected the proof for the public inputs.
    error InvalidProof();

    /// @notice `relayerFee` is not strictly less than `denomination`.
    error FeeExceedsDenomination();

    /// @notice Bind the hasher and the verifier. Both stay fixed.
    /// @param poseidon_ Circomlib `Poseidon(2)` implementation.
    /// @param verifier_ Groth16 verifier for the withdraw circuit.
    constructor(IPoseidonT3 poseidon_, IVerifier verifier_) {
        poseidon = poseidon_;
        verifier = verifier_;
        uint256 current = 0;
        for (uint256 level = 0; level < MERKLE_DEPTH; level++) {
            _zeros[level] = current;
            current = _hash(current, current);
        }
    }

    /// @notice Insert `commitment` into the tree for `denomination` and take exactly `denomination` wei.
    /// @dev Increments `liveSetSize[denomination]`. Emits `Deposit` with no depositor field.
    ///      "Unlinkable" means: for any probabilistic polynomial-time adversary with full access to all on-chain data, the advantage of distinguishing "withdrawal W came from deposit D1" from "W came from D2" is negligible in the security parameter, given an anonymity set of size >= K, under the assumptions in ASSUMPTIONS.md.
    /// @param denomination Supported amount in wei: `0.1 ether`, `1 ether`, `10 ether`, or `100 ether`.
    /// @param commitment Leaf to insert. This contract does not open it.
    /// @return leafIndex Index of the inserted leaf.
    function deposit(uint256 denomination, uint256 commitment) external payable returns (uint32 leafIndex) {
        if (!_isDenomination(denomination) || msg.value != denomination) revert NotDenomination();
        leafIndex = _insert(denomination, commitment);
        liveSetSize[denomination] += 1;
        emit Deposit(denomination, commitment, leafIndex);
    }

    /// @notice Pay `relayerFee` to `relayer` and the remainder of `denomination` to `recipient`.
    /// @dev Public inputs passed to the verifier are `[root, nullifierHash, denomination, uint256(uint160(recipient)), uint256(uint160(relayer))]`.
    ///      Checks run first. The nullifier is marked used and `liveSetSize` is decremented before either transfer.
    ///      `relayer` is paid, then `recipient`. `relayer == recipient` reverts with empty data because that case has no error in the spec lock.
    ///      A full tree and a failed transfer also revert with empty data, for the same reason.
    ///      Emits `Withdrawal` with no commitment field.
    ///      "Unlinkable" means: for any probabilistic polynomial-time adversary with full access to all on-chain data, the advantage of distinguishing "withdrawal W came from deposit D1" from "W came from D2" is negligible in the security parameter, given an anonymity set of size >= K, under the assumptions in ASSUMPTIONS.md.
    /// @param denomination Supported amount in wei. Also the third public input.
    /// @param root Root that must still be in this denomination's ring buffer.
    /// @param nullifierHash Second public input. Stored as spent before ether moves.
    /// @param recipient Account that receives `denomination - relayerFee`. Must differ from `relayer`.
    /// @param relayer Account that receives `relayerFee`. Must differ from `recipient`.
    /// @param relayerFee Wei paid to `relayer`. Must be strictly less than `denomination`.
    /// @param proof Groth16 proof as `[a0, a1, b00, b01, b10, b11, c0, c1]`.
    function withdraw(
        uint256 denomination,
        uint256 root,
        uint256 nullifierHash,
        // address(0) is a legal recipient when it differs from relayer. A zero-address
        // ban would reject withdrawals the spec allows.
        // forge-lint: disable-next-line(missing-zero-check)
        address recipient,
        // forge-lint: disable-next-line(missing-zero-check)
        address relayer,
        uint256 relayerFee,
        uint256[8] calldata proof
    ) external {
        if (!_isKnownRoot(denomination, root)) revert UnknownRoot();
        if (_nullifierUsed[denomination][nullifierHash]) revert NullifierUsed();
        if (relayer == recipient) revert();
        if (relayerFee >= denomination) revert FeeExceedsDenomination();

        uint256[5] memory publicInputs = [
            root,
            nullifierHash,
            denomination,
            uint256(uint160(recipient)),
            uint256(uint160(relayer))
        ];
        if (!verifier.verifyProof(proof, publicInputs)) revert InvalidProof();

        _nullifierUsed[denomination][nullifierHash] = true;
        liveSetSize[denomination] -= 1;

        // Spec requires paying the caller-supplied relayer, then the caller-supplied recipient.
        // forge-lint: disable-next-line(arbitrary-send-eth)
        (bool paidRelayer,) = relayer.call{value: relayerFee}("");
        if (!paidRelayer) revert();
        // forge-lint: disable-next-line(arbitrary-send-eth)
        (bool paidRecipient,) = recipient.call{value: denomination - relayerFee}("");
        if (!paidRecipient) revert();

        // Both calls revert the transaction on failure, so this log is only
        // observable when both payments have succeeded.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Withdrawal(denomination, nullifierHash, recipient, relayer, relayerFee);
    }

    /// @notice Insert `commitment` at the next leaf and store the resulting root.
    /// @param denomination Tree key.
    /// @param commitment Leaf value.
    /// @return leafIndex Index the leaf was written at.
    function _insert(uint256 denomination, uint256 commitment) private returns (uint32 leafIndex) {
        uint32 index = _nextIndex[denomination];
        if (uint256(index) >= (uint256(1) << MERKLE_DEPTH)) revert();

        leafIndex = index;
        uint256 current = commitment;
        uint256 cursor = uint256(index);
        for (uint256 level = 0; level < MERKLE_DEPTH; level++) {
            if (cursor % 2 == 0) {
                _filledSubtrees[denomination][level] = current;
                current = _hash(current, _zeros[level]);
            } else {
                current = _hash(_filledSubtrees[denomination][level], current);
            }
            cursor >>= 1;
        }

        uint256 slot = _rootHistoryIndex[denomination];
        _rootHistory[denomination][slot] = current;
        _rootHistoryIndex[denomination] = (slot + 1) % ROOT_HISTORY;
        _nextIndex[denomination] = index + 1;
    }

    /// @notice Return true when `root` is a non-zero entry in this denomination's ring buffer.
    /// @param denomination Tree key.
    /// @param root Candidate root.
    /// @return True if `root` was stored and is not the unused-slot value 0.
    function _isKnownRoot(uint256 denomination, uint256 root) private view returns (bool) {
        if (root == 0) return false;
        for (uint256 slot = 0; slot < ROOT_HISTORY; slot++) {
            if (_rootHistory[denomination][slot] == root) return true;
        }
        return false;
    }

    /// @notice Return true for the four supported wei amounts and false otherwise.
    /// @param denomination Candidate amount.
    /// @return True when `denomination` is `0.1 ether`, `1 ether`, `10 ether`, or `100 ether`.
    function _isDenomination(uint256 denomination) private pure returns (bool) {
        return denomination == 0.1 ether || denomination == 1 ether || denomination == 10 ether
            || denomination == 100 ether;
    }

    /// @notice Hash a parent from its left and right children.
    /// @param left Left child.
    /// @param right Right child.
    /// @return Poseidon(left, right) from the bound hasher.
    function _hash(uint256 left, uint256 right) private view returns (uint256) {
        uint256[2] memory input;
        input[0] = left;
        input[1] = right;
        // Bounded by MERKLE_DEPTH (20). The callee is the immutable hasher, not a user address.
        // forge-lint: disable-next-line(calls-loop)
        return poseidon.poseidon(input);
    }
}
