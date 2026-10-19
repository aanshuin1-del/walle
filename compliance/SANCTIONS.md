# Sanctions screening

This repository does not include a sanctions screening module.

## Pre-deposit filter

`TwisterShieldedPool.deposit` checks the denomination and `msg.value`. It does not read `msg.sender` into storage, and it does not call an oracle. There is no allowlist and no denylist. A filter that refused an address would be a new contract, or a relayer policy in front of a deposit the user broadcasts themselves. The reference client does not deposit, and the reference relayer only submits withdrawals.

Adding a pre-deposit filter would be an operator's program, built and reviewed outside this tree. This file does not describe one as if it were running.

## Post-deposit monitor

Nothing in this repository watches deposits after they land and then freezes a note, alerts a vendor, or adds an address to a list. The pool has no admin function that could freeze a note. A spent note is only a nullifier hash marked used, and only the holder of a verifying proof can cause that write.

An operator who runs `relayer/server.ts` sees the withdrawal requests that operator chooses to accept, plus the TCP peer address used as a rate-limit key. That process does not compare those fields to a sanctions list. `relayer/SECURITY.md` is the policy for that process: it rate-limits, and it does not apply an identity rule it does not have.

## What not to infer

The absence of a filter is not a statement that sanctions law is inapplicable. `docs/TERMS.md` tells operators to talk to counsel. It is a statement about this codebase: there is no screening code to audit, because none is shipped.
