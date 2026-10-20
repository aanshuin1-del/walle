export type ChainKind = "evm" | "bitcoin" | "solana" | "tron";

export type PoolChain = {
  id: string;
  label: string;
  symbol: string;
  kind: ChainKind;
  chainId?: number;
  address: string;
  decimals: number;
  rpc?: string;
  explorer?: string;
};

/** Treasury addresses. A deposit on a network is paid to that network's address. */
export const CHAINS: PoolChain[] = [
  { id: "ethereum", label: "Ethereum", symbol: "ETH", kind: "evm", chainId: 1, decimals: 18, rpc: "https://ethereum.publicnode.com", explorer: "https://etherscan.io", address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "bitcoin", label: "Bitcoin", symbol: "BTC", kind: "bitcoin", decimals: 8, explorer: "https://mempool.space", address: "bc1qzsuhlxs76dkh69rpsevwp3z5hxyyzaqpneh04e" },
  { id: "solana", label: "Solana", symbol: "SOL", kind: "solana", decimals: 9, rpc: "https://api.mainnet-beta.solana.com", explorer: "https://solscan.io", address: "GMdyHYeCfo16zXye7KVLhV7GneE5ucW856pHAikwyLab" },
  { id: "linea", label: "Linea", symbol: "ETH", kind: "evm", chainId: 59144, decimals: 18, rpc: "https://rpc.linea.build", explorer: "https://lineascan.build", address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "arc", label: "Arc", symbol: "ARC", kind: "evm", decimals: 18, address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "base", label: "Base", symbol: "ETH", kind: "evm", chainId: 8453, decimals: 18, rpc: "https://mainnet.base.org", explorer: "https://basescan.org", address: "0xCe6921a4b9fD0b32eac61DE9519B3b1286e59A4E" },
  { id: "bnb", label: "BNB Chain", symbol: "BNB", kind: "evm", chainId: 56, decimals: 18, rpc: "https://bsc-dataseed.binance.org", explorer: "https://bscscan.com", address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "polygon", label: "Polygon", symbol: "POL", kind: "evm", chainId: 137, decimals: 18, rpc: "https://polygon-rpc.com", explorer: "https://polygonscan.com", address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "monad", label: "Monad", symbol: "MON", kind: "evm", chainId: 143, decimals: 18, rpc: "https://rpc.monad.xyz", explorer: "https://monadvision.com", address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "optimism", label: "Optimism", symbol: "ETH", kind: "evm", chainId: 10, decimals: 18, rpc: "https://mainnet.optimism.io", explorer: "https://optimistic.etherscan.io", address: "0xCe6921a4b9fD0b32eac61DE9519B3b1286e59A4E" },
  { id: "arbitrum", label: "Arbitrum", symbol: "ETH", kind: "evm", chainId: 42161, decimals: 18, rpc: "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io", address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "tron", label: "Tron", symbol: "TRX", kind: "tron", decimals: 6, explorer: "https://tronscan.org", address: "TSnoGzsm1aDw9UktJbXGL67WiwBS7BiRBQ" },
];

export const POOL_SIZES = ["0.1", "1", "10", "100"] as const;

export const LINKS = {
  github: "https://github.com/TwisterWallet/twisterprotocol",
  x: "https://x.com/TwisterWallet",
  telegram: "https://t.me/Twisteradmin",
  telegramHandle: "@Twisteradmin",
  bot: "https://t.me/twisterprotocolbot",
};

export function chainById(id: string): PoolChain | undefined {
  return CHAINS.find((chain) => chain.id === id);
}

export function addressList(): string {
  return CHAINS.map((chain) => `${chain.label}: ${chain.address}`).join("\n");
}

export function txUrl(chain: PoolChain, txId: string): string | undefined {
  if (!chain.explorer) return undefined;
  if (chain.kind === "tron") return `${chain.explorer}/#/transaction/${txId}`;
  return `${chain.explorer}/tx/${txId}`;
}
