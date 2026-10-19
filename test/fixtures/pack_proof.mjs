import fs from "fs";

const proof = JSON.parse(fs.readFileSync("/tmp/withdraw_proof.json", "utf8"));
const pub = JSON.parse(fs.readFileSync("/tmp/withdraw_public.json", "utf8"));
const meta = JSON.parse(fs.readFileSync("/tmp/withdraw_meta.json", "utf8"));
if (pub.length !== 5) throw new Error("public length " + pub.length);
const flat = [
  proof.pi_a[0],
  proof.pi_a[1],
  proof.pi_b[0][0],
  proof.pi_b[0][1],
  proof.pi_b[1][0],
  proof.pi_b[1][1],
  proof.pi_c[0],
  proof.pi_c[1],
];
if (flat.length !== 8) throw new Error("proof length");
const out = {
  proof: flat.map((x) => x.toString()),
  publicInputs: pub.map((x) => x.toString()),
  commitment: meta.commitment,
};
fs.writeFileSync(
  new URL("./valid_proof.json", import.meta.url),
  JSON.stringify(out, null, 2) + "\n",
);
console.log("wrote test/fixtures/valid_proof.json");
