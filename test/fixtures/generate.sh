#!/bin/sh
# Build a Groth16 fixture for the checked-in withdraw circuit.
# Requires the power-14 zkey from circuits/PARAMS.md at circuits/withdraw_0001.zkey.
set -eu
cd "$(dirname "$0")/../.."
SNARKJS=circuits/node_modules/.bin/snarkjs
node test/fixtures/prepare.mjs
"$SNARKJS" wtns calculate circuits/withdraw_js/withdraw.wasm /tmp/withdraw_input.json /tmp/withdraw.wtns
"$SNARKJS" groth16 prove circuits/withdraw_0001.zkey /tmp/withdraw.wtns /tmp/withdraw_proof.json /tmp/withdraw_public.json
node test/fixtures/pack_proof.mjs
sha256sum test/fixtures/valid_proof.json
