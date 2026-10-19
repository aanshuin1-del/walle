// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPoseidonT3} from "../contracts/interfaces/IPoseidonT3.sol";
import {IVerifier} from "../contracts/interfaces/IVerifier.sol";
import {PoseidonT3} from "../contracts/lib/PoseidonT3.sol";
import {TwisterShieldedPool} from "../contracts/TwisterShieldedPool.sol";
import {MockVerifier} from "./PoolUnit.t.sol";

interface Cheat {
    function deal(address who, uint256 newBalance) external;
    function roll(uint256 newHeight) external;
    function getBlockNumber() external view returns (uint256);
    function recordLogs() external;

    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function getRecordedLogs() external returns (Log[] memory logs);
}

/// @notice The eight linkage heuristics against a pool that uses PoseidonT3 and a mock verifier.
/// @dev Baselines match `LinkageBaselines.t.sol`. Tightening any baseline literal by 0.05 ether
///      makes `advantage > baseline` and that test reverts.
contract LinkageIntegration {
    error AdvantageOutOfRange();
    error AdvantageAboveBaseline();
    error Unexpected(bytes data);

    Cheat private constant VM = Cheat(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    PoseidonT3 internal poseidon;
    MockVerifier internal verifier;
    TwisterShieldedPool internal pool;

    function setUp() public {
        poseidon = new PoseidonT3();
        verifier = new MockVerifier();
        pool = new TwisterShieldedPool(IPoseidonT3(poseidon), IVerifier(verifier));
        VM.deal(address(this), 1000 ether);
    }

    function _check(int256 advantage, int256 baseline) private pure {
        if (advantage < 0 || advantage > 1 ether) revert AdvantageOutOfRange();
        if (advantage > baseline) revert AdvantageAboveBaseline();
    }

    /// Baseline: 0.125 ether. Eight deposits, one denomination, advantage 1/liveSetSize.
    function test_Heuristic_ExactAmount() external {
        for (uint256 i = 0; i < 8; i++) {
            pool.deposit{value: 1 ether}(1 ether, i + 1);
        }
        int256 advantage = int256(1 ether / pool.liveSetSize(1 ether));
        int256 baseline = 0.125 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.20 ether. Deposit blocks 10, 12, 14, 16, 18. Withdraw block 20. Window 12.
    function test_Heuristic_TimingCorrelation() external {
        uint256[5] memory depositAt = [uint256(10), 12, 14, 16, 18];
        uint256[5] memory depositBlock;
        for (uint256 i = 0; i < depositAt.length; i++) {
            VM.roll(depositAt[i]);
            pool.deposit{value: 1 ether}(1 ether, i + 1);
            depositBlock[i] = VM.getBlockNumber();
        }
        VM.roll(20);
        uint256 withdrawBlock = VM.getBlockNumber();
        uint256 window = 12;
        uint256 inWindow = 0;
        for (uint256 i = 0; i < depositBlock.length; i++) {
            uint256 distance =
                depositBlock[i] > withdrawBlock ? depositBlock[i] - withdrawBlock : withdrawBlock - depositBlock[i];
            if (distance <= window) inWindow += 1;
        }
        int256 advantage = int256(1 ether / inWindow);
        int256 baseline = 0.20 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.00 ether. Four fresh pools, one withdraw each. Spread is (max - min) / max.
    function test_Heuristic_GasFingerprint() external {
        uint256[4] memory gasUsed;
        for (uint256 i = 0; i < 4; i++) {
            gasUsed[i] = _oneWithdrawGas(i + 1);
        }
        uint256 maxGas = gasUsed[0];
        uint256 minGas = gasUsed[0];
        for (uint256 i = 1; i < gasUsed.length; i++) {
            if (gasUsed[i] > maxGas) maxGas = gasUsed[i];
            if (gasUsed[i] < minGas) minGas = gasUsed[i];
        }
        int256 advantage = int256((maxGas - minGas) * 1 ether / maxGas);
        int256 baseline = 0.00 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.00 ether. liveSetSize reads 4, 4, 6, 8. No candidate count is 1.
    function test_Heuristic_RelayerClustering() external {
        uint256[4] memory denomination = [uint256(0.1 ether), 1 ether, 10 ether, 100 ether];
        uint256[4] memory plan = [uint256(4), 4, 6, 8];
        for (uint256 d = 0; d < denomination.length; d++) {
            for (uint256 i = 0; i < plan[d]; i++) {
                pool.deposit{value: denomination[d]}(denomination[d], i + 1);
            }
        }
        uint256[4] memory candidateDeposits;
        for (uint256 d = 0; d < denomination.length; d++) {
            candidateDeposits[d] = pool.liveSetSize(denomination[d]);
        }
        uint256 uniqueHits = 0;
        for (uint256 i = 0; i < candidateDeposits.length; i++) {
            if (candidateDeposits[i] == 1) uniqueHits += 1;
        }
        int256 advantage = int256(uniqueHits * 1 ether / candidateDeposits.length);
        int256 baseline = 0.00 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.05 ether. Snapshot liveSetSize before the withdraw. Advantage is 1/20.
    function test_Heuristic_DepositCountFingerprint() external {
        for (uint256 i = 0; i < 20; i++) {
            pool.deposit{value: 1 ether}(1 ether, i + 1);
        }
        uint256 setSizeBeforeWithdraw = pool.liveSetSize(1 ether);
        uint256 root = pool.rootHistory(1 ether, 19 % 100);
        (bool ok, bytes memory data) = _withdraw(pool, 1 ether, root, 1, address(0xBEEF), address(0xCAFE), 0);
        if (!ok) revert Unexpected(data);
        int256 advantage = int256(1 ether / setSizeBeforeWithdraw);
        int256 baseline = 0.05 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.25 ether. Deposit blocks are the mempool positions. One trial of four is the nearest neighbor.
    function test_Heuristic_MempoolAdjacency() external {
        uint256[5][4] memory plan = [
            [uint256(100), 90, 50, 10, 2],
            [uint256(30), 28, 10, 80, 0],
            [uint256(5), 40, 20, 1, 1],
            [uint256(70), 10, 69, 100, 0]
        ];
        uint256[5][4] memory trial;
        uint256 n = 0;
        for (uint256 t = 0; t < plan.length; t++) {
            for (uint256 i = 0; i < 3; i++) {
                VM.roll(plan[t][i + 1]);
                pool.deposit{value: 1 ether}(1 ether, ++n);
                trial[t][i + 1] = VM.getBlockNumber();
            }
            VM.roll(plan[t][0]);
            trial[t][0] = VM.getBlockNumber();
            trial[t][4] = plan[t][4];
        }
        uint256 correct = 0;
        for (uint256 t = 0; t < trial.length; t++) {
            uint256 withdrawPos = trial[t][0];
            uint256 best = 0;
            uint256 bestDistance = type(uint256).max;
            for (uint256 i = 0; i < 3; i++) {
                uint256 pos = trial[t][i + 1];
                uint256 distance = pos > withdrawPos ? pos - withdrawPos : withdrawPos - pos;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = i;
                }
            }
            if (best == trial[t][4]) correct += 1;
        }
        int256 advantage = int256(correct * 1 ether / trial.length);
        int256 baseline = 0.25 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.00 ether. Five withdrawals, five recipients read back from Withdrawal logs.
    function test_Heuristic_RecipientReuse() external {
        address[5] memory planted = [
            address(0x1000000000000000000000000000000000000001),
            address(0x1000000000000000000000000000000000000002),
            address(0x1000000000000000000000000000000000000003),
            address(0x1000000000000000000000000000000000000004),
            address(0x1000000000000000000000000000000000000005)
        ];
        VM.recordLogs();
        for (uint256 i = 0; i < planted.length; i++) {
            pool.deposit{value: 1 ether}(1 ether, i + 1);
            uint256 root = pool.rootHistory(1 ether, i % 100);
            (bool ok, bytes memory data) =
                _withdraw(pool, 1 ether, root, i + 1, planted[i], address(0xCAFE), 0);
            if (!ok) revert Unexpected(data);
        }
        Cheat.Log[] memory logs = VM.getRecordedLogs();
        address[5] memory recipient;
        uint256 seen = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] != keccak256("Withdrawal(uint256,uint256,address,address,uint256)")) continue;
            (, address who,,) = abi.decode(logs[i].data, (uint256, address, address, uint256));
            recipient[seen] = who;
            seen += 1;
        }
        if (seen != 5) revert Unexpected("logs");
        uint256 pairs = 0;
        uint256 shared = 0;
        for (uint256 i = 0; i < recipient.length; i++) {
            for (uint256 j = i + 1; j < recipient.length; j++) {
                pairs += 1;
                if (recipient[i] == recipient[j]) shared += 1;
            }
        }
        int256 advantage = int256(shared * 1 ether / pairs);
        int256 baseline = 0.00 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.00 ether. Deposit denominations 1, 1, 10, 100 ether. Withdrawal denomination 1 ether.
    function test_Heuristic_CrossDenom() external {
        VM.recordLogs();
        pool.deposit{value: 1 ether}(1 ether, 1);
        pool.deposit{value: 1 ether}(1 ether, 2);
        pool.deposit{value: 10 ether}(10 ether, 3);
        pool.deposit{value: 100 ether}(100 ether, 4);
        Cheat.Log[] memory logs = VM.getRecordedLogs();
        uint256[4] memory denomination;
        uint256 n = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] != keccak256("Deposit(uint256,uint256,uint32)")) continue;
            denomination[n] = uint256(logs[i].topics[1]);
            n += 1;
        }
        if (n != 4) revert Unexpected("deposits");
        uint256 root = pool.rootHistory(1 ether, 1);
        VM.recordLogs();
        (bool ok, bytes memory data) = _withdraw(pool, 1 ether, root, 9, address(0xBEEF), address(0xCAFE), 0);
        if (!ok) revert Unexpected(data);
        logs = VM.getRecordedLogs();
        uint256 withdrawDenomination;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] != keccak256("Withdrawal(uint256,uint256,address,address,uint256)")) continue;
            withdrawDenomination = uint256(logs[i].topics[1]);
        }
        uint256 acceptedCross = 0;
        for (uint256 i = 0; i < denomination.length; i++) {
            bool differentDenomination = denomination[i] != withdrawDenomination;
            bool sameTree = denomination[i] == withdrawDenomination;
            if (differentDenomination && sameTree) acceptedCross += 1;
        }
        int256 advantage = int256(acceptedCross * 1 ether / denomination.length);
        int256 baseline = 0.00 ether;
        _check(advantage, baseline);
    }

    /// @dev Fresh verifier and pool so each withdraw starts from cold accounts. Same proof bytes.
    function _oneWithdrawGas(uint256 tag) private returns (uint256 used) {
        MockVerifier localVerifier = new MockVerifier();
        TwisterShieldedPool local = new TwisterShieldedPool(IPoseidonT3(poseidon), IVerifier(localVerifier));
        local.deposit{value: 1 ether}(1 ether, uint256(1));
        uint256 root = local.rootHistory(1 ether, 0);
        address recipient = address(uint160(0xA100 + tag));
        address relayer = address(uint160(0xB100 + tag));
        uint256[8] memory proof;
        bytes memory payload = abi.encodeCall(
            TwisterShieldedPool.withdraw, (uint256(1 ether), root, uint256(1), recipient, relayer, uint256(0), proof)
        );
        // Measure the call only. Copying returndata in the caller would charge
        // memory expansion that grows across the four samples.
        uint256 before = gasleft();
        bool ok;
        assembly {
            ok := call(gas(), local, 0, add(payload, 32), mload(payload), 0, 0)
        }
        used = before - gasleft();
        if (!ok) revert Unexpected("withdraw");
    }

    function _withdraw(
        TwisterShieldedPool target,
        uint256 denomination,
        uint256 root,
        uint256 nullifierHash,
        address recipient,
        address relayer,
        uint256 relayerFee
    ) private returns (bool ok, bytes memory data) {
        uint256[8] memory proof;
        (ok, data) = address(target).call(
            abi.encodeCall(
                TwisterShieldedPool.withdraw,
                (denomination, root, nullifierHash, recipient, relayer, relayerFee, proof)
            )
        );
    }
}
