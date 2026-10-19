import { Contract, JsonRpcProvider, Wallet, isAddress } from "ethers";
import { NonceBook } from "./policy.ts";

const abi = [
  "function withdraw(uint256 denomination,uint256 root,uint256 nullifierHash,address recipient,address relayer,uint256 relayerFee,uint256[8] proof)",
];

const denominations = new Set<bigint>([
  100000000000000000n,
  1000000000000000000n,
  10000000000000000000n,
  100000000000000000000n,
]);

export type WithdrawalRequest = {
  denomination: bigint;
  root: bigint;
  nullifierHash: bigint;
  recipient: string;
  relayerFee: bigint;
  proof: bigint[];
};

function asBigint(value: unknown): bigint | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

export function parseRequest(body: unknown, minFee: bigint): WithdrawalRequest | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const request = body as Record<string, unknown>;
  const denomination = asBigint(request.denomination);
  const root = asBigint(request.root);
  const nullifierHash = asBigint(request.nullifierHash);
  const relayerFee = asBigint(request.relayerFee);
  if (denomination === undefined || root === undefined || nullifierHash === undefined || relayerFee === undefined) {
    return undefined;
  }
  if (!denominations.has(denomination) || relayerFee < minFee) return undefined;
  if (typeof request.recipient !== "string" || !isAddress(request.recipient)) return undefined;
  if (!Array.isArray(request.proof) || request.proof.length !== 8) return undefined;
  const proof: bigint[] = [];
  for (const item of request.proof) {
    const parsed = asBigint(item);
    if (parsed === undefined) return undefined;
    proof.push(parsed);
  }
  return { denomination, root, nullifierHash, recipient: request.recipient, relayerFee, proof };
}

async function rpc(url: string, method: string): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
  });
  if (!response.ok) throw new Error("http");
  const payload = (await response.json()) as { result?: unknown };
  if (typeof payload.result !== "string") throw new Error("rpc");
  return payload.result;
}

/** Use the first URL that answers eth_blockNumber. The provider is pinned to that chain id. */
export async function connectProvider(urls: string[]): Promise<JsonRpcProvider | undefined> {
  for (const url of urls) {
    try {
      await rpc(url, "eth_blockNumber");
      const chainId = Number(BigInt(await rpc(url, "eth_chainId")));
      return new JsonRpcProvider(url, chainId, { staticNetwork: true });
    } catch {
      // try the next URL
    }
  }
  return undefined;
}

export async function submitWithdrawal(
  provider: JsonRpcProvider,
  wallet: Wallet,
  poolAddress: string,
  request: WithdrawalRequest,
  nonces: NonceBook,
): Promise<string | undefined> {
  if (wallet.address.toLowerCase() === request.recipient.toLowerCase()) return undefined;
  const pending = BigInt(await provider.getTransactionCount(wallet.address, "pending"));
  const nonce = nonces.take(pending);
  const pool = new Contract(poolAddress, abi, wallet);
  try {
    const tx = await pool.withdraw(
      request.denomination,
      request.root,
      request.nullifierHash,
      request.recipient,
      wallet.address,
      request.relayerFee,
      request.proof,
      { nonce },
    );
    return tx.hash as string;
  } catch {
    return undefined;
  }
}
