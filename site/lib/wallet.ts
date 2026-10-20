"use client";

import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import type { PoolChain } from "@/lib/chains";

export type WalletPayment = { txId: string; from: string };

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type SolanaProvider = {
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
};

type TronWeb = {
  ready?: boolean;
  defaultAddress?: { base58?: string };
  trx: {
    sendTransaction: (to: string, sun: number) => Promise<{ txid?: string; transaction?: { txID?: string } }>;
  };
};

function baseUnits(amount: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error("Amount is not a number.");
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) throw new Error("Too many decimal places for this network.");
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

function asNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`Amount is too large for one ${label} transfer.`);
  return Number(value);
}

function ethereum(): EthereumProvider | undefined {
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

function walletMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  const record = error as { code?: number; message?: string };
  if (record?.code === 4001) return "The wallet request was rejected.";
  if (typeof record?.message === "string" && record.message) return record.message;
  return fallback;
}

async function sendEvm(chain: PoolChain, amount: string): Promise<WalletPayment> {
  const provider = ethereum();
  if (!provider || chain.chainId === undefined || !chain.rpc || !chain.explorer) {
    throw new Error("This network is paid by copying the address into your own wallet.");
  }
  const chainId = `0x${chain.chainId.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: chain.label,
          nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: chain.decimals },
          rpcUrls: [chain.rpc],
          blockExplorerUrls: [chain.explorer],
        },
      ],
    });
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("The wallet did not return an account.");
  const value = baseUnits(amount, chain.decimals);
  const txId = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: chain.address, value: `0x${value.toString(16)}` }],
  })) as string;
  if (!txId) throw new Error("The wallet did not return a transaction id.");
  return { txId, from };
}

export async function evmReceipt(txId: string): Promise<"confirmed" | "failed" | "pending"> {
  const provider = ethereum();
  if (!provider) return "pending";
  const receipt = (await provider.request({
    method: "eth_getTransactionReceipt",
    params: [txId],
  })) as { status?: string } | null;
  if (!receipt) return "pending";
  return receipt.status === "0x1" ? "confirmed" : "failed";
}

async function sendSolana(chain: PoolChain, amount: string): Promise<WalletPayment> {
  const provider = (window as Window & { solana?: SolanaProvider }).solana;
  if (!provider || !chain.rpc) throw new Error("Install Phantom, then press Send with wallet again.");
  const connected = provider.publicKey ? { publicKey: provider.publicKey } : await provider.connect();
  const fromText = connected.publicKey.toString();
  const from = new PublicKey(fromText);
  const connection = new Connection(chain.rpc, "confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: new PublicKey(chain.address),
      lamports: asNumber(baseUnits(amount, chain.decimals), "Solana"),
    }),
  );
  tx.feePayer = from;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const result = await provider.signAndSendTransaction(tx);
  if (!result.signature) throw new Error("Phantom did not return a transaction id.");
  return { txId: result.signature, from: fromText };
}

async function sendTron(chain: PoolChain, amount: string): Promise<WalletPayment> {
  const win = window as Window & { tronLink?: { request: (args: unknown) => Promise<unknown> }; tronWeb?: TronWeb };
  if (win.tronLink?.request) await win.tronLink.request({ method: "tron_requestAccounts" });
  const tronWeb = win.tronWeb;
  const from = tronWeb?.defaultAddress?.base58;
  if (!tronWeb || !from) throw new Error("Install and unlock TronLink, then press Send with wallet again.");
  const result = await tronWeb.trx.sendTransaction(chain.address, asNumber(baseUnits(amount, chain.decimals), "Tron"));
  const txId = result.txid || result.transaction?.txID;
  if (!txId) throw new Error("TronLink did not return a transaction id.");
  return { txId, from };
}

async function sendBitcoin(chain: PoolChain, amount: string): Promise<WalletPayment> {
  const unisat = (window as Window & { unisat?: { requestAccounts: () => Promise<string[]>; sendBitcoin: (to: string, sats: number) => Promise<string> } }).unisat;
  if (!unisat) throw new Error("Install UniSat, then press Send with wallet again.");
  const accounts = await unisat.requestAccounts();
  const from = accounts[0];
  if (!from) throw new Error("UniSat did not return an account.");
  const txId = await unisat.sendBitcoin(chain.address, asNumber(baseUnits(amount, chain.decimals), "Bitcoin"));
  if (!txId) throw new Error("UniSat did not return a transaction id.");
  return { txId, from };
}

export async function sendPoolPayment(chain: PoolChain, amount: string): Promise<WalletPayment> {
  try {
    if (chain.kind === "evm") return await sendEvm(chain, amount);
    if (chain.kind === "solana") return await sendSolana(chain, amount);
    if (chain.kind === "tron") return await sendTron(chain, amount);
    return await sendBitcoin(chain, amount);
  } catch (error) {
    throw new Error(walletMessage(error, "The wallet did not send the payment."));
  }
}
