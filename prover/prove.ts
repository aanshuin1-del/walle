import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getCached, putCached } from "./cache.ts";

export type ProvePaths = {
  snarkjs: string;
  wasm: string;
  zkey: string;
  zkeyExists: boolean;
};

export type ProveResult =
  | { status: 200; body: { cached: boolean; proof: unknown; publicSignals: unknown } }
  | { status: 400; body: { status: "rejected" } }
  | { status: 503; body: { status: "missing zkey"; detail: string } };

const missingZkey = "circuits/withdraw_phase2.zkey is missing. Follow circuits/PARAMS.md.";

/** Return a cached Groth16 proof, or prove with snarkjs when the phase-2 zkey exists. */
export function prove(rawBody: string, paths: ProvePaths): ProveResult {
  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { status: "rejected" } };
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { status: 400, body: { status: "rejected" } };
  }
  const cached = getCached(input);
  if (cached !== undefined) {
    const hit = cached as { proof: unknown; publicSignals: unknown };
    return { status: 200, body: { cached: true, proof: hit.proof, publicSignals: hit.publicSignals } };
  }
  if (!paths.zkeyExists) {
    return { status: 503, body: { status: "missing zkey", detail: missingZkey } };
  }
  const dir = mkdtempSync(path.join(tmpdir(), "twister-prove-"));
  try {
    const inputPath = path.join(dir, "input.json");
    const wtnsPath = path.join(dir, "out.wtns");
    const proofPath = path.join(dir, "proof.json");
    const publicPath = path.join(dir, "public.json");
    writeFileSync(inputPath, JSON.stringify(input));
    execFileSync(paths.snarkjs, ["wtns", "calculate", paths.wasm, inputPath, wtnsPath], { stdio: "ignore" });
    execFileSync(paths.snarkjs, ["groth16", "prove", paths.zkey, wtnsPath, proofPath, publicPath], { stdio: "ignore" });
    const proof = JSON.parse(readFileSync(proofPath, "utf8")) as unknown;
    const publicSignals = JSON.parse(readFileSync(publicPath, "utf8")) as unknown;
    putCached(input, { proof, publicSignals });
    return { status: 200, body: { cached: false, proof, publicSignals } };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
