# Relayer

Reference process that reads one withdrawal request on stdin and submits it to `TwisterShieldedPool.withdraw`.

## Run

```
cd relayer
npm install ethers
export RELAYER_KEY=0x...
export MIN_FEE=1000000000000000
export RPC_URL=http://127.0.0.1:8545
export POOL_ADDRESS=0x...
node --experimental-strip-types index.ts
```

Stdin is one JSON object:

```
{"denomination":"1000000000000000000","root":"1","nullifierHash":"2","recipient":"0x0000000000000000000000000000000000000001","relayerFee":"1000000000000000","proof":["0","0","0","0","0","0","0","0"]}
```

`RELAYER_KEY` is the signing key. The `relayer` argument of `withdraw` is that key's address. The request does not choose it. A request is rejected when `relayerFee` is below `MIN_FEE`, when the recipient is that same address, or when the JSON shape is wrong. There is no default RPC URL.

`RPC_URL_FALLBACK`, when set, is used only if `RPC_URL` does not answer `eth_blockNumber`. The nonce is the pending transaction count for the key, then a local cursor. See `relayer/SECURITY.md`.

`node --experimental-strip-types server.ts` listens on `127.0.0.1:43127` and applies the per-IP and per-recipient rate limits documented there. The stdin process has no peer address, so it does not apply the IP limit.

The process does not log the recipient, the nullifier hash, or the proof. It does not write a file. It calls only the RPC URL that answered.

## What the relayer learns

The request body: denomination, root, nullifier hash, recipient, fee, and proof. It also knows its own address and the time the request arrived.

## What it cannot learn

It cannot read `secret`, `nullifier`, or the leaf index out of the proof. That is the Groth16 zero-knowledge assumption in `ASSUMPTIONS.md`. The proof does not contain a commitment, and the pool's `Withdrawal` event does not either. Seeing the recipient tells the operator who was paid. It does not tell them which `Deposit` funded the note.

## If this process is compromised

Whoever can read its memory or its environment can see the request fields and can take `RELAYER_KEY`. They can refuse to submit, delay submission, or sign other transactions with that key. They still cannot open the note from the proof alone. Timing of the request remains a leak if they also watched deposits. The key should hold only the ether used to pay gas.

This relayer is a reference implementation. Rate limits and the replay set live in memory and reset when the process exits. `relayer/SECURITY.md` is the policy.
