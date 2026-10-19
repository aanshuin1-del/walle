# Reference client

Static page. No build step and no backend. It reads `liveSetSize(uint256)` from a pool address through an RPC URL you type. It does not ship a default RPC URL.

## Serve locally

From this directory:

```
python3 -m http.server 43123 --bind 127.0.0.1
```

Open `http://127.0.0.1:43123/`. The page loads `app.js` from the same origin. It does not load a font, a script, or an image from anywhere else. The only network request it makes is `eth_call` to the RPC URL in the form.

## What the page shows

The plain-text line at the top is:

```
This is a reference client. It is not audited. Use at your own risk.
```

The withdraw button stays disabled until a read succeeds. After that read, the page shows:

```
You are withdrawing from a set of N.
```

`N` is `liveSetSize` for the selected denomination. If `N < 10`, the page also shows this warning and no other wording in its place:

```
Anonymity set is small. Withdrawal may be linkable by timing or amount.
```

Each successful read generates a new recipient address in the browser and discards the previous one. The page does not write it to a cookie or to local storage. The withdraw button does not broadcast a transaction. This client does not build a Groth16 proof.

## Known leakage

"Unlinkable" means: for any probabilistic polynomial-time adversary with full access to all on-chain data, the advantage of distinguishing "withdrawal W came from deposit D1" from "W came from D2" is negligible in the security parameter, given an anonymity set of size >= K, under the assumptions in ASSUMPTIONS.md.

The set size on this page is `liveSetSize[denomination]`. Below 10 the contract still accepts a withdrawal. The warning is there because a uniform guess is then already larger than 1/10, and timing and denomination have fewer candidates. The button stays disabled until `N` is on the page so the decision happens before a recipient is published.

| Adversary | Residual leakage this client does not remove |
| --- | --- |
| Chain analyst | Denomination, set size, time, recipient, relayer, and fee are public once a withdrawal is submitted. This page does not submit one. |
| RPC provider | The endpoint you type sees your network address, the pool, the denomination argument of `liveSetSize`, and the time of the read. A dishonest endpoint can lie about `N`. |
| Relayer operator | Not contacted by this page. An operator of a relayer you later use still sees the request fields described in `relayer/README.md`. |
| Frontend host | If the files you opened are the ones in this directory, the host of a later copy can still replace `app.js` and read the private key the page generates. |
| Mempool observer | This page does not broadcast. A later withdrawal transaction is visible before inclusion, including adjacency to a deposit. |
| Deposit-time observer | The deposit transaction's `from` address is visible even though `Deposit` has no depositor field. This page does not deposit. |
| Withdrawal-time observer | A later `Withdrawal` event publishes denomination, nullifier hash, recipient, relayer, and fee. It does not publish a commitment. |
| Colluding subset | The union of the rows above. A modified copy of this page plus any chain observer links the generated key and any witness the page is later changed to collect. |

Out of scope, matching `THREAT_MODEL.md`: network-level adversaries, legal and compliance questions, amount fingerprinting (mitigated by the four denominations, not eliminated), and the Monero bridge.
