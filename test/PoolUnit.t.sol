// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPoseidonT3} from "../contracts/interfaces/IPoseidonT3.sol";
import {IVerifier} from "../contracts/interfaces/IVerifier.sol";
import {PoseidonT3} from "../contracts/lib/PoseidonT3.sol";
import {TwisterShieldedPool} from "../contracts/TwisterShieldedPool.sol";

/// @notice Records the order of value-less and value calls from the pool.
contract PayLog {
    address public first;
    address public second;
    uint256 public step;

    function mark(address who) external {
        step += 1;
        if (step == 1) first = who;
        if (step == 2) second = who;
    }
}

/// @notice Payee whose `receive` records the call into `PayLog`.
contract RecordingPayee {
    PayLog public log;

    constructor(PayLog log_) {
        log = log_;
    }

    receive() external payable {
        log.mark(address(this));
    }
}

/// @notice Recipient that tries to withdraw again from `receive`.
contract ReenteringRecipient {
    TwisterShieldedPool public pool;
    uint256 public denomination;
    uint256 public root;
    uint256 public nullifierHash;
    address public relayer;
    uint256 public fee;
    bool public sawNullifierUsed;

    constructor(TwisterShieldedPool pool_) {
        pool = pool_;
    }

    function arm(uint256 denomination_, uint256 root_, uint256 nullifierHash_, address relayer_, uint256 fee_)
        external
    {
        denomination = denomination_;
        root = root_;
        nullifierHash = nullifierHash_;
        relayer = relayer_;
        fee = fee_;
    }

    receive() external payable {
        uint256[8] memory proof;
        try pool.withdraw(denomination, root, nullifierHash, address(this), relayer, fee, proof) {
            sawNullifierUsed = false;
        } catch (bytes memory err) {
            sawNullifierUsed = keccak256(err) == keccak256(abi.encodeWithSignature("NullifierUsed()"));
        }
    }
}

/// @notice Verifier whose `verifyProof` returns a value the test sets.
contract MockVerifier is IVerifier {
    bool public accept = true;

    function setAccept(bool next) external {
        accept = next;
    }

    function verifyProof(uint256[8] calldata, uint256[5] calldata) external view returns (bool) {
        return accept;
    }
}

interface Vm {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function deal(address who, uint256 newBalance) external;
    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory logs);
}

contract PoolUnit {
    error Unexpected(bytes data);

    Vm private constant VM = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    PoseidonT3 internal poseidon;
    MockVerifier internal verifier;
    TwisterShieldedPool internal pool;

    function setUp() public {
        poseidon = new PoseidonT3();
        verifier = new MockVerifier();
        pool = new TwisterShieldedPool(IPoseidonT3(poseidon), IVerifier(verifier));
        VM.deal(address(this), 1000 ether);
    }

    function test_deposit_reverts_NotDenomination_on_wrong_msg_value() external {
        (bool ok, bytes memory data) = address(pool).call{value: 1 ether - 1}(
            abi.encodeCall(TwisterShieldedPool.deposit, (1 ether, uint256(1)))
        );
        if (ok || !_is(data, "NotDenomination()")) revert Unexpected(data);
    }

    function test_deposit_reverts_NotDenomination_on_unsupported_denomination() external {
        (bool ok, bytes memory data) = address(pool).call{value: 2 ether}(
            abi.encodeCall(TwisterShieldedPool.deposit, (2 ether, uint256(1)))
        );
        if (ok || !_is(data, "NotDenomination()")) revert Unexpected(data);
    }

    function test_deposit_inserts_leaf_increments_set_and_emits() external {
        uint256 commitment = 7;
        VM.recordLogs();
        uint32 leafIndex = pool.deposit{value: 1 ether}(1 ether, commitment);
        if (leafIndex != 0) revert Unexpected("leaf");
        if (pool.liveSetSize(1 ether) != 1) revert Unexpected("size");
        Vm.Log[] memory logs = VM.getRecordedLogs();
        if (logs.length != 1) revert Unexpected("log-count");
        if (logs[0].emitter != address(pool)) revert Unexpected("emitter");
        if (logs[0].topics.length != 2) revert Unexpected("topics");
        if (logs[0].topics[0] != keccak256("Deposit(uint256,uint256,uint32)")) revert Unexpected("sig");
        if (logs[0].topics[1] != bytes32(uint256(1 ether))) revert Unexpected("denom");
        if (logs[0].data.length != 64) revert Unexpected("data-len");
        (uint256 loggedCommitment, uint32 loggedIndex) = abi.decode(logs[0].data, (uint256, uint32));
        if (loggedCommitment != commitment || loggedIndex != leafIndex) revert Unexpected("data");
    }

    function test_deposit_writes_root_history_getter() external {
        if (pool.rootHistory(1 ether, 0) != 0) revert Unexpected("pre");
        pool.deposit{value: 1 ether}(1 ether, uint256(11));
        uint256 stored = pool.rootHistory(1 ether, 0);
        if (stored == 0) revert Unexpected("root");
        if (pool.rootHistory(1 ether, 1) != 0) revert Unexpected("next-slot");
    }

    function test_deposit_first_insert_root_retrievable() external {
        pool.deposit{value: 0.1 ether}(0.1 ether, uint256(3));
        uint256 stored = pool.rootHistory(0.1 ether, 0);
        if (stored == 0) revert Unexpected("root");
        (bool ok, bytes memory data) = _withdraw(0.1 ether, stored, 99, address(0xBEEF), address(0xCAFE), 0);
        if (!ok) revert Unexpected(data);
    }

    function test_withdraw_reverts_UnknownRoot_on_missing_root() external {
        pool.deposit{value: 1 ether}(1 ether, uint256(4));
        uint256 stored = pool.rootHistory(1 ether, 0);
        uint256 missing = stored == 1 ? 2 : 1;
        (bool ok, bytes memory data) = _withdraw(1 ether, missing, 5, address(0xBEEF), address(0xCAFE), 0);
        if (ok || !_is(data, "UnknownRoot()")) revert Unexpected(data);
    }

    function test_withdraw_reverts_UnknownRoot_on_empty_tree_root_zero() external {
        (bool ok, bytes memory data) = _withdraw(1 ether, 0, 5, address(0xBEEF), address(0xCAFE), 0);
        if (ok || !_is(data, "UnknownRoot()")) revert Unexpected(data);
    }

    function test_withdraw_reverts_NullifierUsed_on_second_spend() external {
        pool.deposit{value: 1 ether}(1 ether, uint256(6));
        uint256 root = pool.rootHistory(1 ether, 0);
        (bool ok, bytes memory data) = _withdraw(1 ether, root, 42, address(0xBEEF), address(0xCAFE), 0);
        if (!ok) revert Unexpected(data);
        (ok, data) = _withdraw(1 ether, root, 42, address(0xBEEF), address(0xCAFE), 0);
        if (ok || !_is(data, "NullifierUsed()")) revert Unexpected(data);
    }

    function test_withdraw_reverts_RelayerIsRecipient() external {
        pool.deposit{value: 1 ether}(1 ether, uint256(8));
        uint256 root = pool.rootHistory(1 ether, 0);
        address same = address(0xBEEF);
        (bool ok, bytes memory data) = _withdraw(1 ether, root, 8, same, same, 0);
        if (ok || !_is(data, "RelayerIsRecipient()")) revert Unexpected(data);
    }

    function test_withdraw_reverts_FeeExceedsDenomination_when_fee_equals_denomination() external {
        pool.deposit{value: 1 ether}(1 ether, uint256(9));
        uint256 root = pool.rootHistory(1 ether, 0);
        (bool ok, bytes memory data) = _withdraw(1 ether, root, 9, address(0xBEEF), address(0xCAFE), 1 ether);
        if (ok || !_is(data, "FeeExceedsDenomination()")) revert Unexpected(data);
    }

    function test_withdraw_reverts_InvalidProof_when_verifier_returns_false() external {
        pool.deposit{value: 1 ether}(1 ether, uint256(10));
        uint256 root = pool.rootHistory(1 ether, 0);
        verifier.setAccept(false);
        (bool ok, bytes memory data) = _withdraw(1 ether, root, 10, address(0xBEEF), address(0xCAFE), 0);
        if (ok || !_is(data, "InvalidProof()")) revert Unexpected(data);
        if (pool.liveSetSize(1 ether) != 1) revert Unexpected("size");
    }

    function test_withdraw_decrements_liveSetSize() external {
        pool.deposit{value: 10 ether}(10 ether, uint256(12));
        if (pool.liveSetSize(10 ether) != 1) revert Unexpected("before");
        uint256 root = pool.rootHistory(10 ether, 0);
        (bool ok, bytes memory data) = _withdraw(10 ether, root, 12, address(0xBEEF), address(0xCAFE), 0);
        if (!ok) revert Unexpected(data);
        if (pool.liveSetSize(10 ether) != 0) revert Unexpected("after");
    }

    function test_withdraw_pays_relayer_before_recipient() external {
        pool.deposit{value: 1 ether}(1 ether, uint256(13));
        uint256 root = pool.rootHistory(1 ether, 0);
        PayLog log = new PayLog();
        RecordingPayee relayer = new RecordingPayee(log);
        RecordingPayee recipient = new RecordingPayee(log);
        (bool ok, bytes memory data) =
            _withdraw(1 ether, root, 13, address(recipient), address(relayer), 1);
        if (!ok) revert Unexpected(data);
        if (log.step() != 2) revert Unexpected("step");
        if (log.first() != address(relayer)) revert Unexpected("relayer");
        if (log.second() != address(recipient)) revert Unexpected("recipient");
    }

    function test_reentrancy_cannot_double_spend() external {
        pool.deposit{value: 1 ether}(1 ether, uint256(14));
        uint256 root = pool.rootHistory(1 ether, 0);
        ReenteringRecipient recipient = new ReenteringRecipient(pool);
        uint256 nullifierHash = 77;
        address relayer = address(0xCAFE);
        recipient.arm(1 ether, root, nullifierHash, relayer, 0);
        (bool ok, bytes memory data) = _withdraw(1 ether, root, nullifierHash, address(recipient), relayer, 0);
        if (!ok) revert Unexpected(data);
        if (!recipient.sawNullifierUsed()) revert Unexpected("inner");
        if (pool.liveSetSize(1 ether) != 0) revert Unexpected("size");
    }

    function test_root_history_evicts_oldest_after_101_deposits() external {
        uint256 oldest;
        for (uint256 i = 0; i < 101; i++) {
            pool.deposit{value: 1 ether}(1 ether, i + 1);
            if (i == 0) oldest = pool.rootHistory(1 ether, 0);
        }
        if (oldest == 0) revert Unexpected("oldest");
        if (pool.rootHistory(1 ether, 0) == oldest) revert Unexpected("still-present");
        (bool ok, bytes memory data) = _withdraw(1 ether, oldest, 101, address(0xBEEF), address(0xCAFE), 0);
        if (ok || !_is(data, "UnknownRoot()")) revert Unexpected(data);
    }

    function test_withdraw_emits_Withdrawal_without_commitment() external {
        uint256 commitment = 123456789;
        pool.deposit{value: 100 ether}(100 ether, commitment);
        uint256 root = pool.rootHistory(100 ether, 0);
        address recipient = address(0xBEEF);
        address relayer = address(0xCAFE);
        uint256 nullifierHash = 55;
        uint256 fee = 5;
        VM.recordLogs();
        (bool ok, bytes memory data) = _withdraw(100 ether, root, nullifierHash, recipient, relayer, fee);
        if (!ok) revert Unexpected(data);
        Vm.Log[] memory logs = VM.getRecordedLogs();
        if (logs.length != 1) revert Unexpected("log-count");
        if (logs[0].topics.length != 2) revert Unexpected("topics");
        if (logs[0].topics[0] != keccak256("Withdrawal(uint256,uint256,address,address,uint256)")) {
            revert Unexpected("sig");
        }
        if (logs[0].topics[1] != bytes32(uint256(100 ether))) revert Unexpected("denom");
        if (logs[0].data.length != 128) revert Unexpected("data-len");
        (uint256 loggedNullifier, address loggedRecipient, address loggedRelayer, uint256 loggedFee) =
            abi.decode(logs[0].data, (uint256, address, address, uint256));
        if (loggedNullifier != nullifierHash) revert Unexpected("nullifier");
        if (loggedRecipient != recipient || loggedRelayer != relayer || loggedFee != fee) revert Unexpected("fields");
        if (loggedNullifier == commitment) revert Unexpected("commitment");
    }

    function _withdraw(
        uint256 denomination,
        uint256 root,
        uint256 nullifierHash,
        address recipient,
        address relayer,
        uint256 relayerFee
    ) private returns (bool ok, bytes memory data) {
        uint256[8] memory proof;
        (ok, data) = address(pool).call(
            abi.encodeCall(
                TwisterShieldedPool.withdraw,
                (denomination, root, nullifierHash, recipient, relayer, relayerFee, proof)
            )
        );
    }

    function _is(bytes memory data, string memory sig) private pure returns (bool) {
        return keccak256(data) == keccak256(abi.encodeWithSignature(sig));
    }
}
