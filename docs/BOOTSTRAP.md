# Bootstrapping the anonymity set

`liveSetSize[denomination]` starts at 0. The first deposit of a denomination makes a set of size 1. A withdrawal while that count is 1 pays a note that is the only live note of that denomination. Observers do not need a heuristic to name it.

Later deposits of the same denomination increase the count. Withdrawals decrease it. Deposits of a different denomination go in a different tree and do not enlarge this one. The four trees are separate anonymity sets.

## Subsidized deposits

This repository does not move ether and does not promise that anyone will. A sentence of the form "the protocol team will deposit 10 ETH" is not a commitment this tree can keep: there is no treasury, no admin key, and no scheduled deposit.

A person who wants a larger set deposits through `deposit`, the same function as everyone else. Those notes are real notes. They can be withdrawn by whoever holds the preimage. They are not a protocol-owned cushion, and they do not change the ceremony or the threat model.

## Denomination policy

The contract accepts only `0.1 ether`, `1 ether`, `10 ether`, and `100 ether`. Any other `msg.value`, and any other `denomination` argument, reverts with `NotDenomination`. Arbitrary amounts are rejected so that a unique wei value cannot fingerprint a note inside a tree. The choice of which of the four denominations was used is still public. That choice is a residual leakage, described in `THREAT_MODEL.md`.
