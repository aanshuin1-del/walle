import { JsonRpcProvider } from "ethers";

export type Health =
  | { ok: true; rpcLatencyMs: number; gasPriceWei: string }
  | { ok: false; rpcLatencyMs: number; gasPriceWei: null };

/** One eth_blockNumber round trip, then eth_gasPrice. Latency is the block-number call. */
export async function sample(provider: JsonRpcProvider): Promise<Health> {
  const started = Date.now();
  try {
    await provider.getBlockNumber();
    const rpcLatencyMs = Date.now() - started;
    const gasPriceWei = (await provider.send("eth_gasPrice", [])) as string;
    return { ok: true, rpcLatencyMs, gasPriceWei: BigInt(gasPriceWei).toString() };
  } catch {
    return { ok: false, rpcLatencyMs: Date.now() - started, gasPriceWei: null };
  }
}
