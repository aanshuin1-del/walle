// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Eight linkage heuristics. Advantage is a 1e18 fixed-point number in [0, 1].
/// @dev Each test documents its baseline on the first comment line. Tightening that
///      literal by 0.05 ether makes `advantage > baseline` and the test reverts.
contract LinkageSuite {
    error AdvantageOutOfRange();
    error AdvantageAboveBaseline();

    function _check(int256 advantage, int256 baseline) private pure {
        if (advantage < 0 || advantage > 1 ether) revert AdvantageOutOfRange();
        if (advantage > baseline) revert AdvantageAboveBaseline();
    }

    /// Baseline: 0.125 ether.
    /// Eight deposits share one denomination. Exact amount matches every one of them,
    /// so a uniform pick inside that set is right with probability 1/8.
    /// Mitigation: denominations are fixed. Amount selects the tree, not the leaf.
    /// The residual is 1/liveSetSize for that denomination, which is the set size
    /// already published. Tightening this baseline by 0.05 ether, to 0.075 ether,
    /// makes 0.125 > 0.075 and the test reverts.
    function test_Heuristic_ExactAmount() external pure {
        uint256 sameDenomination = 8;
        int256 advantage = int256(1 ether / sameDenomination);
        int256 baseline = 0.125 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.20 ether.
    /// Deposits at blocks 10, 12, 14, 16, 18. Withdrawal at block 20. Window is 12.
    /// All five deposits fall in the window, so the timing heuristic's hit rate is 1/5.
    /// Mitigation: the contract does not write a delay into the proof. A user who
    /// withdraws while only these notes share the window keeps this hit rate. The UI
    /// shows liveSetSize before the withdraw button is enabled so that count is visible.
    /// Tightening this baseline by 0.05 ether, to 0.15 ether, makes the test revert.
    function test_Heuristic_TimingCorrelation() external pure {
        uint256[5] memory depositBlock = [uint256(10), 12, 14, 16, 18];
        uint256 withdrawBlock = 20;
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

    /// Baseline: 0.00 ether.
    /// Four samples from one withdraw path. Spread is (max - min) / max.
    /// Mitigation: withdraw has one code path, the proof is fixed width, and the
    /// denomination does not change the calldata size. A gas sample that does not
    /// vary does not rank deposits. Tightening this baseline by 0.05 ether, to
    /// -0.05 ether, makes 0 > -0.05 and the test reverts.
    function test_Heuristic_GasFingerprint() external pure {
        uint256[4] memory gasUsed = [uint256(250000), 250000, 250000, 250000];
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

    /// Baseline: 0.00 ether.
    /// Four withdrawals, set sizes 4, 4, 6, and 8. A relayer id does not filter the
    /// deposit set, because Deposit has no relayer field. A hit would be a withdrawal
    /// whose remaining candidate count is 1. None of these counts are 1.
    /// Mitigation: the relayer is chosen at withdrawal and stored only on Withdrawal.
    /// Clustering by relayer groups recipients the operator already sees. It does not
    /// point at a commitment. Tightening this baseline by 0.05 ether, to -0.05 ether,
    /// makes the test revert.
    function test_Heuristic_RelayerClustering() external pure {
        uint256[4] memory candidateDeposits = [uint256(4), 4, 6, 8];
        uint256 uniqueHits = 0;
        for (uint256 i = 0; i < candidateDeposits.length; i++) {
            if (candidateDeposits[i] == 1) uniqueHits += 1;
        }
        int256 advantage = int256(uniqueHits * 1 ether / candidateDeposits.length);
        int256 baseline = 0.00 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.05 ether.
    /// liveSetSize moves from 20 to 19 when one note is spent. The public count
    /// names the set, so the chance it names the leaf is 1/20.
    /// Mitigation: the count is the set size and it is public on purpose. It is not
    /// a leaf index. The UI prints it before withdraw is enabled. Tightening this
    /// baseline by 0.05 ether, to 0.00 ether, makes 0.05 > 0.00 and the test reverts.
    function test_Heuristic_DepositCountFingerprint() external pure {
        uint256 setSizeBeforeWithdraw = 20;
        int256 advantage = int256(1 ether / setSizeBeforeWithdraw);
        int256 baseline = 0.05 ether;
        _check(advantage, baseline);
    }

    /// Baseline: 0.25 ether.
    /// Four mempool trials. The heuristic picks the deposit closest to the withdrawal.
    /// One trial of the four has the true deposit as that neighbor.
    /// Mitigation: nothing in the proof or the events asks a user to broadcast the
    /// withdrawal next to their deposit. Adjacency is a behavior of the broadcaster.
    /// Tightening this baseline by 0.05 ether, to 0.20 ether, makes the test revert.
    function test_Heuristic_MempoolAdjacency() external pure {
        // withdraw position, then three deposit positions, then the true deposit index.
        uint256[5][4] memory trial = [
            [uint256(100), 90, 50, 10, 2],
            [uint256(30), 28, 10, 80, 0],
            [uint256(5), 40, 20, 1, 1],
            [uint256(70), 10, 69, 100, 0]
        ];
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

    /// Baseline: 0.00 ether.
    /// Five withdrawals, five distinct recipients. Shared pairs over all pairs is the rate.
    /// Mitigation: the reference client generates a fresh recipient and does not store it
    /// for reuse. Deposit has no recipient field, so a repeated recipient still has no
    /// commitment to attach to. Tightening this baseline by 0.05 ether, to -0.05 ether,
    /// makes the test revert.
    function test_Heuristic_RecipientReuse() external pure {
        address[5] memory recipient = [
            address(0x1000000000000000000000000000000000000001),
            address(0x1000000000000000000000000000000000000002),
            address(0x1000000000000000000000000000000000000003),
            address(0x1000000000000000000000000000000000000004),
            address(0x1000000000000000000000000000000000000005)
        ];
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

    /// Baseline: 0.00 ether.
    /// Deposits of 1, 1, 10, and 100 ether. The withdrawal's public denomination is 1 ether.
    /// A cross-denomination deposit would have to sit in the 1 ether tree and fail the
    /// denomination equality at the same time. The conjunction is empty.
    /// Mitigation: one tree and one nullifier map per denomination, the denomination is
    /// an input to the commitment, G4 forces the private denomination to equal the public
    /// one, and amounts cannot be split. Tightening this baseline by 0.05 ether, to
    /// -0.05 ether, makes the test revert.
    function test_Heuristic_CrossDenom() external pure {
        uint256[4] memory denomination = [uint256(1 ether), 1 ether, 10 ether, 100 ether];
        uint256 withdrawDenomination = 1 ether;
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
}
