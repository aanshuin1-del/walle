# Terms

This file is a description of how the reference code is offered. It is not legal advice, and it is not a contract with a user. It does not say that depositing or withdrawing is lawful in any jurisdiction.

## Jurisdictional analysis

This protocol is designed to be jurisdiction-agnostic: the contracts do not encode a country, a sanctions list, or a customer record. Operators should consult with local counsel regarding money transmission laws before they run a relayer, host the page, or custody ether that is not their own note. The maintainers of this repository do not provide that advice.

## Relayer structure

The contract does not appoint a relayer. Any account can be the `relayer` argument of `withdraw`, subject to the checks in the contract: the address is nonzero, it differs from `recipient`, and `relayerFee` is strictly less than `denomination`.

`relayer/` is a reference process. An operator who sets `RELAYER_KEY` runs that process for themselves. This repository does not run a hosted relayer, and it does not keep a registry of operators. There is no on-chain list of approved relayers. Calling that a network would overstate what is deployed: the tree contains one reference implementation, not a set of operating businesses.

## What the contracts will do

They will accept a deposit of a supported denomination from any sender, and they will pay a withdrawal that carries a verifying proof for a stored root and an unused nullifier. They will not ask who the sender is. See `compliance/SANCTIONS.md`.
