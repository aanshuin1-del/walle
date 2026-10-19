# Relayer policy

`relayer/index.ts` reads one withdrawal JSON object on stdin and submits it. `relayer/server.ts` accepts `POST /withdraw` on `127.0.0.1:43127` and uses the same submission path. Both sign with `RELAYER_KEY`. The `relayer` argument of `withdraw` is that key's address. The request does not choose it.

## What is refused

- A denomination outside `{0.1, 1, 10, 100}` ETH in wei.
- `relayerFee` below `MIN_FEE`.
- A recipient that is not an address, or that equals the relayer's own address.
- A proof that is not eight decimal strings.
- On the HTTP listener: more than `RATE_IP` requests per 60 seconds from one TCP peer address (default 5), and more than `RATE_ADDRESS` requests per 60 seconds for one recipient (default 3).
- On the HTTP listener: a second in-flight or already broadcast request with the same `denomination` and `nullifierHash` in this process. A failed broadcast releases the key so the caller can retry.

The chain still enforces `NullifierUsed`. The process-local replay set is empty after a restart. It is there so two overlapping requests do not both broadcast.

## What is not a policy

This process does not censor by identity, geography, or a sanctions list. It has no list. Rate limits and the fee floor are the only request filters. See `compliance/SANCTIONS.md`.

The HTTP listener sees the TCP peer address and keeps it in the rate-limit window in memory. It does not write the address, the recipient, the nullifier hash, or the proof to a file or to the log. A submitted response is `{"status":"submitted","tx":"..."}`. A refusal is `{"status":"rejected"}` or `{"status":"rpc unavailable"}` or `{"status":"submit failed"}`.

## RPC failover

`RPC_URL` is tried first. `RPC_URL_FALLBACK`, when set, is tried only if the first URL does not answer `eth_blockNumber`. The process does not send the withdrawal to both. Nonces come from `eth_getTransactionCount` at the `"pending"` block tag, then from an in-process cursor so two overlapping submissions do not reuse a nonce.

## What a compromise still means

Whoever can read the process can see the request and can take `RELAYER_KEY`. They can refuse, delay, or sign other transactions. They still cannot open `secret` or `nullifier` from the proof. That is the Groth16 zero-knowledge assumption in `ASSUMPTIONS.md`, not a property of this policy. The key should hold only the ether used for gas.

This is a reference implementation. The rate limit resets on restart. The listener binds to loopback unless you change the code. Neither fact makes it a production relayer.
