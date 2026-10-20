export type ChainKind = "evm" | "bitcoin" | "solana" | "tron";

export type PoolChain = {
  id: string;
  label: string;
  symbol: string;
  kind: ChainKind;
  chainId?: number;
  address: string;
};

/** Treasury addresses. A deposit on a network is paid to that network's address. */
export const CHAINS: PoolChain[] = [
  { id: "ethereum", label: "Ethereum", symbol: "ETH", kind: "evm", chainId: 1, address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "bitcoin", label: "Bitcoin", symbol: "BTC", kind: "bitcoin", address: "bc1qzsuhlxs76dkh69rpsevwp3z5hxyyzaqpneh04e" },
  { id: "solana", label: "Solana", symbol: "SOL", kind: "solana", address: "GMdyHYeCfo16zXye7KVLhV7GneE5ucW856pHAikwyLab" },
  { id: "linea", label: "Linea", symbol: "ETH", kind: "evm", chainId: 59144, address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "arc", label: "Arc", symbol: "ARC", kind: "evm", address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "base", label: "Base", symbol: "ETH", kind: "evm", chainId: 8453, address: "0xCe6921a4b9fD0b32eac61DE9519B3b1286e59A4E" },
  { id: "bnb", label: "BNB Chain", symbol: "BNB", kind: "evm", chainId: 56, address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "polygon", label: "Polygon", symbol: "POL", kind: "evm", chainId: 137, address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "monad", label: "Monad", symbol: "MON", kind: "evm", chainId: 143, address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "optimism", label: "Optimism", symbol: "ETH", kind: "evm", chainId: 10, address: "0xCe6921a4b9fD0b32eac61DE9519B3b1286e59A4E" },
  { id: "arbitrum", label: "Arbitrum", symbol: "ETH", kind: "evm", chainId: 42161, address: "0xce6b8715c53012d1dd001d8b01272e89df34da4e" },
  { id: "tron", label: "Tron", symbol: "TRX", kind: "tron", address: "TSnoGzsm1aDw9UktJbXGL67WiwBS7BiRBQ" },
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
