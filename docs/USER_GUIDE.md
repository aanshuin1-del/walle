# User guide

The reference page in `web/` reads `liveSetSize` for one denomination from an RPC URL you type. It does not ship an RPC, it does not build a Groth16 proof, and it does not broadcast a withdrawal. The line at the top of the page says the client is a reference and is not audited.

Read `docs/CEREMONY.md` before you send a mainnet deposit to a pool that uses `contracts/Groth16Verifier.sol` from this tree. That verifier comes from a one-machine ceremony.

## What the count is

`liveSetSize[denomination]` is how many notes of that denomination have been deposited and not yet withdrawn. The page is required to show `You are withdrawing from a set of N.` before a withdraw control can be enabled. If N is less than 10 it also shows `Anonymity set is small. Withdrawal may be linkable by timing or amount.`

The contract does not block the withdrawal when N is small. The warning is for the person about to publish a recipient.

## How the set gets larger

The count grows when other people deposit the same denomination and have not withdrawn yet. It does not grow because of a score, a fee, or a wait inside the contract. The contract has no waiting period.

Practical consequences, all of which are already in `THREAT_MODEL.md`:

- A unique denomination is a smaller set than a busy one. The contract will not split a 10 ETH note into 0.1 ETH notes.
- A fresh recipient address is not linked on-chain to your previous recipients. Reusing one links those withdrawals to each other.
- The relayer you choose sees the recipient before the transaction is included.
- The account that sends the deposit transaction is visible as `tx.from` even though `Deposit` has no depositor field.

## Why a large set does not mean you are safe

`liveSetSize` is a count, not a guarantee. The unlinkability sentence in `README.md` is conditional on the assumptions in `ASSUMPTIONS.md` and on a set of size at least K. The repository does not pick a K that makes the advantage negligible, and it does not treat 10 as that K.

If you deposit and withdraw in the same hour, the anonymity set that timing points at can be a single note even when the count was large earlier. If you are the only live note, the set size is 1. Timing, the denomination, the relayer, and the recipient stay public after a careful wait. A modified copy of the web page can read the secret before a proof exists. A relayer can delay or refuse. None of those are repaired by a larger count.
