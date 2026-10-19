# Security

This repository has no bug-bounty program and no private disclosure address beyond the maintainer of the git remote. A report belongs to that maintainer. Do not open a public issue that contains a working exploit, a proof that verifies against the checked-in verifier, or the trapdoor of a ceremony.

## What to send

A useful report names one broken claim and shows it.

- The file and the function, circuit template, or script.
- The claim you say is false. Point at a sentence in `README.md`, `ASSUMPTIONS.md`, `THREAT_MODEL.md`, or `docs/CEREMONY.md`.
- A proof of concept an outsider can run. A Foundry test in this repo, or a short script with the command line, is enough. The test should fail on the current tree and pass once the defect is fixed, or the reverse when it demonstrates a successful attack.
- The impact, in one of these terms: forged withdrawal (soundness), a second spend of one note, ether left in the contract or sent to the wrong account (solvency), or a concrete link from a withdrawal to a deposit that the threat model says is negligible (unlinkability). Say which assumption in `ASSUMPTIONS.md` you used. If the attack needs the ceremony trapdoor, say that. That trapdoor is a known limit of the local ceremony, not a new bug, unless the report shows the trapdoor still exists in a published artifact.
- What you think is out of scope. Network observation, a malicious RPC, and a modified frontend are already listed as residual leakage.

## Known limits that are not, by themselves, a vulnerability report

- The Groth16 parameters come from one machine. Soundness for mainnet is not claimed. `docs/CEREMONY.md`.
- `liveSetSize` can be 1. The contract still pays. `docs/USER_GUIDE.md`.
- The deposit transaction reveals `from`. `THREAT_MODEL.md`.
- No audit has been done. `docs/AUDIT.md`.

If you are reporting one of those as if the documentation denied it, the fix is a documentation change. If you are reporting that the code contradicts the documentation, send the proof of concept.
