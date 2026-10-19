import { createHash } from "crypto";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const circomSrc = fs.readFileSync(
  path.join(repoRoot, "circuits/node_modules/circomlib/circuits/poseidon_constants.circom"),
  "utf8",
);
const P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const N_ROUNDS_F = 8;
const N_ROUNDS_P = { 2: 56, 3: 57, 5: 60 };

function extractBranch(fnName, tValue) {
  const fnStart = circomSrc.indexOf(`function ${fnName}(t)`);
  const nextFn = circomSrc.indexOf("\nfunction ", fnStart + 10);
  const body = circomSrc.slice(fnStart, nextFn === -1 ? circomSrc.length : nextFn);
  const marker = tValue === 2 ? /if\s*\(\s*t\s*==\s*2\s*\)/ : new RegExp(`else if\\s*\\(\\s*t\\s*==\\s*${tValue}\\s*\\)`);
  const m = marker.exec(body);
  if (!m) throw new Error(`missing ${fnName} t=${tValue}`);
  const brace = body.indexOf("{", m.index);
  let depth = 0;
  let end = brace;
  for (; end < body.length; end++) {
    if (body[end] === "{") depth++;
    else if (body[end] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return [...body.slice(brace, end + 1).matchAll(/0x[0-9a-fA-F]+/g)].map((x) => BigInt(x[0]));
}

function tables(t) {
  const C = extractBranch("POSEIDON_C", t);
  const Mflat = extractBranch("POSEIDON_M", t);
  const Pflat = extractBranch("POSEIDON_P", t);
  const S = extractBranch("POSEIDON_S", t);
  const nRoundsP = N_ROUNDS_P[t];
  if (C.length !== t * N_ROUNDS_F + nRoundsP) throw new Error(`C ${t} ${C.length}`);
  if (Mflat.length !== t * t || Pflat.length !== t * t) throw new Error(`M ${t}`);
  if (S.length !== nRoundsP * (t * 2 - 1)) throw new Error(`S ${t} ${S.length}`);
  const mat = (flat) => {
    const rows = [];
    for (let i = 0; i < t; i++) rows.push(flat.slice(i * t, (i + 1) * t));
    return rows;
  };
  return { C, M: mat(Mflat), PM: mat(Pflat), S, nRoundsP };
}

const cache = {};
function poseidon(inputs) {
  const t = inputs.length + 1;
  if (!cache[t]) cache[t] = tables(t);
  const { C, M, PM, S, nRoundsP } = cache[t];
  const add = (a, b) => (a + b) % P;
  const mul = (a, b) => (a * b) % P;
  const sbox = (x) => {
    const x2 = mul(x, x);
    const x4 = mul(x2, x2);
    return mul(x4, x);
  };
  const mix = (matrix, state) => {
    const out = Array(t).fill(0n);
    for (let i = 0; i < t; i++) {
      let lc = 0n;
      for (let j = 0; j < t; j++) lc = add(lc, mul(matrix[j][i], state[j]));
      out[i] = lc;
    }
    return out;
  };
  const mixS = (state, r) => {
    const base = (t * 2 - 1) * r;
    let lc = 0n;
    for (let i = 0; i < t; i++) lc = add(lc, mul(S[base + i], state[i]));
    const out = Array(t).fill(0n);
    out[0] = lc;
    for (let i = 1; i < t; i++) out[i] = add(state[i], mul(state[0], S[base + t + i - 1]));
    return out;
  };
  let state = [0n, ...inputs.map((x) => x % P)];
  state = state.map((v, i) => add(v, C[i]));
  for (let r = 0; r < N_ROUNDS_F / 2 - 1; r++) {
    state = state.map(sbox);
    const off = (r + 1) * t;
    state = state.map((v, i) => add(v, C[off + i]));
    state = mix(M, state);
  }
  state = state.map(sbox);
  state = state.map((v, i) => add(v, C[(N_ROUNDS_F / 2) * t + i]));
  state = mix(PM, state);
  for (let r = 0; r < nRoundsP; r++) {
    state = [add(sbox(state[0]), C[(N_ROUNDS_F / 2 + 1) * t + r]), ...state.slice(1)];
    state = mixS(state, r);
  }
  for (let r = 0; r < N_ROUNDS_F / 2 - 1; r++) {
    state = state.map(sbox);
    const off = (N_ROUNDS_F / 2 + 1) * t + nRoundsP + r * t;
    state = state.map((v, i) => add(v, C[off + i]));
    state = mix(M, state);
  }
  state = state.map(sbox);
  let lc = 0n;
  for (let j = 0; j < t; j++) lc = add(lc, mul(M[j][0], state[j]));
  return lc;
}

function circomPoseidon2(pairs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "poseidon2-"));
  fs.writeFileSync(
    path.join(dir, "t.circom"),
    `pragma circom 2.0.0;
include "poseidon.circom";
template Main() {
    signal input a;
    signal input b;
    signal output out;
    component h = Poseidon(2);
    h.inputs[0] <== a;
    h.inputs[1] <== b;
    out <== h.out;
}
component main = Main();
`,
  );
  execFileSync("/tmp/circom", [path.join(dir, "t.circom"), "--wasm", "-o", dir, "-l", path.join(repoRoot, "circuits/node_modules/circomlib/circuits")], {
    stdio: "inherit",
  });
  const wasm = path.join(dir, "t_js/t.wasm");
  const snarkjs = path.join(repoRoot, "circuits/node_modules/.bin/snarkjs");
  const outs = [];
  for (const [a, b] of pairs) {
    const input = path.join(dir, "in.json");
    const wtns = path.join(dir, "out.wtns");
    const json = path.join(dir, "out.json");
    fs.writeFileSync(input, JSON.stringify({ a: a.toString(), b: b.toString() }));
    execFileSync(snarkjs, ["wtns", "calculate", wasm, input, wtns], { stdio: "inherit" });
    execFileSync(snarkjs, ["wtns", "export", "json", wtns, json], { stdio: "inherit" });
    const witness = JSON.parse(fs.readFileSync(json, "utf8"));
    outs.push(BigInt(witness[1]));
  }
  return outs;
}

const fixed = [
  [0n, 0n],
  [1n, 2n],
  [P - 1n, 0n],
  [0n, P - 1n],
  [1n, 1n],
  [2n, 2n],
  [3n, 5n],
  [8n, 13n],
];
const seedLabel = "twister-poseidon-vectors-v1";
let seed = Buffer.from(seedLabel);
const random = [];
for (let i = 0; i < 4; i++) {
  seed = createHash("sha256").update(seed).digest();
  const left = BigInt("0x" + seed.toString("hex")) % P;
  seed = createHash("sha256").update(seed).digest();
  const right = BigInt("0x" + seed.toString("hex")) % P;
  random.push([left, right]);
}
const pairs = fixed.concat(random);
const jsOut = pairs.map(([a, b]) => poseidon([a, b]));
const circomOut = circomPoseidon2(pairs);
for (let i = 0; i < pairs.length; i++) {
  if (jsOut[i] !== circomOut[i]) {
    throw new Error(`poseidon mismatch at ${i}: js ${jsOut[i]} circom ${circomOut[i]}`);
  }
}

const fixtures = path.join(repoRoot, "test/fixtures");
fs.mkdirSync(fixtures, { recursive: true });
fs.writeFileSync(
  path.join(fixtures, "poseidon_vectors.json"),
  JSON.stringify(
    {
      seed: seedLabel,
      vectors: pairs.map(([left, right], i) => ({
        left: left.toString(),
        right: right.toString(),
        hash: circomOut[i].toString(),
      })),
    },
    null,
    2,
  ) + "\n",
);

const partial = tables(3).C.slice(15, 72);
if (partial.length !== 57) throw new Error("partial length");
fs.writeFileSync(
  path.join(fixtures, "circomlib_poseidon_t3_constants.json"),
  JSON.stringify(
    {
      source: "circomlib 2.0.5 POSEIDON_C(3), partial-round constants at indices 15 through 71",
      partialRoundConstants: partial.map((x) => x.toString()),
    },
    null,
    2,
  ) + "\n",
);

const secret = 1n;
const nullifier = 2n;
const denomination = 1000000000000000000n;
const poolId = 0x54776973746572n;
const recipient = 0xbeefn;
const relayer = 0xcafen;
const commitment = poseidon([secret, nullifier, denomination, poolId]);
const nullifierHash = poseidon([nullifier]);
const zeros = [];
let z = 0n;
for (let i = 0; i < 20; i++) {
  zeros.push(z);
  z = poseidon([z, z]);
}
let current = commitment;
for (let i = 0; i < 20; i++) current = poseidon([current, zeros[i]]);
const merkleRoot = current;
const input = {
  root: merkleRoot.toString(),
  nullifierHash: nullifierHash.toString(),
  denomination: denomination.toString(),
  recipient: recipient.toString(),
  relayer: relayer.toString(),
  secret: secret.toString(),
  nullifier: nullifier.toString(),
  privateDenomination: denomination.toString(),
  pathElements: zeros.map((x) => x.toString()),
  pathIndices: Array(20).fill("0"),
};
fs.writeFileSync("/tmp/withdraw_input.json", JSON.stringify(input, null, 2));
fs.writeFileSync(
  "/tmp/withdraw_meta.json",
  JSON.stringify({ commitment: commitment.toString(), root: merkleRoot.toString(), nullifierHash: nullifierHash.toString() }),
);
console.log("commitment", commitment.toString());
console.log("root", merkleRoot.toString());
console.log("nullifierHash", nullifierHash.toString());
console.log("vectors", pairs.length);
