import { Contract, JsonRpcProvider, Wallet, isAddress } from "ethers";

const abi = [
  "function withdraw(uint256 denomination,uint256 root,uint256 nullifierHash,address recipient,address relayer,uint256 relayerFee,uint256[8] proof)",
];

const denominations = new Set<bigint>([
  100000000000000000n,
  1000000000000000000n,
  10000000000000000000n,
  100000000000000000000n,
]);

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.log("missing " + name);
    process.exit(1);
  }
  return value;
}

function reject(): never {
  console.log("rejected");
  process.exit(1);
}

function asBigint(value: unknown): bigint {
  if (typeof value !== "string" || value.length === 0) reject();
  try {
    return BigInt(value);
  } catch {
    reject();
  }
}

async function readStdin(): Promise<string> {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk.toString();
  return raw;
}

async function main(): Promise<void> {
  const key = env("RELAYER_KEY");
  const minFee = asBigint(env("MIN_FEE"));
  const rpcUrl = env("RPC_URL");
  const poolAddress = env("POOL_ADDRESS");
  if (!isAddress(poolAddress)) reject();

  let body: unknown;
  try {
    body = JSON.parse(await readStdin());
  } catch {
    reject();
  }
  if (typeof body !== "object" || body === null) reject();
  const request = body as Record<string, unknown>;

  const denomination = asBigint(request.denomination);
  const root = asBigint(request.root);
  const nullifierHash = asBigint(request.nullifierHash);
  const relayerFee = asBigint(request.relayerFee);
  if (!denominations.has(denomination)) reject();
  if (relayerFee < minFee) reject();
  if (typeof request.recipient !== "string" || !isAddress(request.recipient)) reject();
  if (!Array.isArray(request.proof) || request.proof.length !== 8) reject();
  const proof = request.proof.map((item) => asBigint(item));

  let wallet: Wallet;
  try {
    wallet = new Wallet(key, new JsonRpcProvider(rpcUrl));
  } catch {
    reject();
  }
  if (wallet.address.toLowerCase() === request.recipient.toLowerCase()) reject();

  const pool = new Contract(poolAddress, abi, wallet);
  try {
    const tx = await pool.withdraw(
      denomination,
      root,
      nullifierHash,
      request.recipient,
      wallet.address,
      relayerFee,
      proof,
    );
    console.log("submitted");
    console.log(tx.hash);
  } catch {
    console.log("submit failed");
    process.exit(1);
  }
}

main();
