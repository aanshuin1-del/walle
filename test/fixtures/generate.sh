#!/bin/sh
# Regenerate test/fixtures/valid_proof.json for the checked-in withdraw circuit.
#
# Workflow (circuits/PARAMS.md): compile withdraw.circom, run the power-14
# Groth16 ceremony, export contracts/Groth16Verifier.sol from the final zkey,
# and copy that zkey to circuits/withdraw_phase2.zkey. Then run this script.
# It builds the witness, proves with that zkey, and writes valid_proof.json.
#
# The zkey is not in git. If it is missing, this script exits. It does not
# create a key and it does not prove against any other file.
set -eu
cd "$(dirname "$0")/../.."
if [ ! -f circuits/withdraw_phase2.zkey ]; then
  echo "circuits/withdraw_phase2.zkey is missing. Follow circuits/PARAMS.md, then place the final zkey at that path. Refusing to write a fixture." >&2
  exit 1
fi
SNARKJS=circuits/node_modules/.bin/snarkjs
node test/fixtures/prepare.mjs
"$SNARKJS" wtns calculate circuits/withdraw_js/withdraw.wasm /tmp/withdraw_input.json /tmp/withdraw.wtns
"$SNARKJS" groth16 prove circuits/withdraw_phase2.zkey /tmp/withdraw.wtns /tmp/withdraw_proof.json /tmp/withdraw_public.json
node test/fixtures/pack_proof.mjs
sha256sum test/fixtures/valid_proof.json
