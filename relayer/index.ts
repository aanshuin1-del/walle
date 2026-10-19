import { Wallet, isAddress } from "ethers";
import { NonceBook } from "./policy.ts";
import { connectProvider, parseRequest, submitWithdrawal } from "./submit.ts";

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

async function readStdin(): Promise<string> {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk.toString();
  return raw;
}

async function main(): Promise<void> {
  const key = env("RELAYER_KEY");
  const minFee = (() => {
    try {
      return BigInt(env("MIN_FEE"));
    } catch {
      reject();
    }
  })();
  const poolAddress = env("POOL_ADDRESS");
  if (!isAddress(poolAddress)) reject();
  const urls = [env("RPC_URL")];
  if (process.env.RPC_URL_FALLBACK) urls.push(process.env.RPC_URL_FALLBACK);

  let body: unknown;
  try {
    body = JSON.parse(await readStdin());
  } catch {
    reject();
  }
  const request = parseRequest(body, minFee);
  if (!request) reject();

  const provider = await connectProvider(urls);
  if (!provider) {
    console.log("rpc unavailable");
    process.exit(1);
  }
  let wallet: Wallet;
  try {
    wallet = new Wallet(key, provider);
  } catch {
    reject();
  }
  if (wallet.address.toLowerCase() === request.recipient.toLowerCase()) reject();
  const hash = await submitWithdrawal(provider, wallet, poolAddress, request, new NonceBook());
  if (!hash) {
    console.log("submit failed");
    process.exit(1);
  }
  console.log("submitted");
  console.log(hash);
}

main();
