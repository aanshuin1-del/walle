"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeSlots } from "@/components/code-slots";
import { CopyButton } from "@/components/copy-button";
import { LogoLoop } from "@/components/logo-loop";
import { LogoMark } from "@/components/logo-mark";
import { SiteLinks } from "@/components/site-links";
import { Vortex } from "@/components/vortex";
import { CHAINS, LINKS, POOL_SIZES, type PoolChain } from "@/lib/chains";

type Intent = {
  reference: string;
  address: string;
  chain: string;
  amount: string;
  symbol: string;
  notified: number;
};

type Filter = "all" | "evm" | "bitcoin" | "solana" | "tron";

function parseAmount(value: string): bigint | null {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const padded = (fraction + "0".repeat(18)).slice(0, 18);
  try {
    return BigInt(whole) * 10n ** 18n + BigInt(padded);
  } catch {
    return null;
  }
}

function shortAddress(address: string) {
  if (address.length < 16) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [chainId, setChainId] = useState(CHAINS[0].id);
  const [amount, setAmount] = useState("1");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [history, setHistory] = useState<Intent[]>([]);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("twister-desk-name");
    if (!stored) {
      router.replace("/");
      return;
    }
    setName(stored);
  }, [router]);

  const chain = CHAINS.find((item) => item.id === chainId) ?? CHAINS[0];
  const visible = CHAINS.filter((item) => filter === "all" || item.kind === filter);

  async function prepareDeposit(selected: PoolChain, nextAmount: string) {
    setChainId(selected.id);
    setAmount(nextAmount);
    setPending(true);
    setStatus("");
    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, chainId: selected.id, amount: nextAmount }),
      });
      const body = (await response.json()) as Intent & { error?: string };
      if (!response.ok) {
        setStatus(body.error ?? "The desk could not prepare this deposit.");
        return;
      }
      setIntent(body);
      setHistory((current) => [body, ...current].slice(0, 8));
      setStatus(
        body.notified > 0
          ? "The Telegram operator was notified. The address in this panel receives this deposit."
          : "The address in this panel receives this deposit. Send /operator to @twisterprotocolbot so the notice reaches you.",
      );
      if (selected.kind === "evm" && selected.chainId !== undefined) {
        await sendWithWallet(selected, body);
      }
    } catch {
      setStatus("The desk could not reach the deposit API.");
    } finally {
      setPending(false);
    }
  }

  async function sendWithWallet(selected: PoolChain, prepared: Intent) {
    const wei = parseAmount(prepared.amount);
    const ethereum = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
    if (!ethereum || selected.kind !== "evm" || selected.chainId === undefined || wei === null) {
      setStatus("This network is paid by copying the address into your own wallet.");
      return;
    }
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${selected.chainId.toString(16)}` }],
      });
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const tx = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[0],
            to: prepared.address,
            value: `0x${wei.toString(16)}`,
          },
        ],
      });
      setStatus(`Wallet returned ${String(tx)}. Confirm the recipient matches the address on this pool.`);
    } catch {
      setStatus("The wallet did not send. You can still copy the address and pay it from your own wallet.");
    }
  }

  if (!name) return null;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 lg:flex lg:flex-col lg:items-stretch lg:justify-between lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="size-10" />
            <span>
              <span className="block text-sm font-semibold">Twister</span>
              <span className="block text-xs text-muted-foreground">Pool desk</span>
            </span>
          </span>
          <nav className="hidden gap-1 lg:grid">
            <span className="rounded-md bg-white/10 px-3 py-2 text-sm">Pools</span>
            <a className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5" href="#deposit">
              Deposit
            </a>
            <a className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5" href="#session">
              This session
            </a>
          </nav>
        </div>
        <div className="space-y-3">
          <div className="lg:hidden">
            <SiteLinks />
          </div>
          <div className="hidden lg:block">
            <SiteLinks stacked />
          </div>
          <a className="hidden text-xs text-muted-foreground hover:text-foreground lg:inline" href={LINKS.bot}>
            @twisterprotocolbot
          </a>
        </div>
      </aside>

      <div className="relative min-w-0">
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <Vortex />
        </div>
        <div className="relative z-10">
          <header className="flex flex-wrap items-end justify-between gap-3 px-4 py-5 sm:px-6">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Dashboard</p>
              <h1 className="text-3xl font-semibold tracking-tight">Pools</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Desk for <span className="text-foreground">{name}</span>
              </p>
              <button
                type="button"
                className="h-9 rounded-md border border-white/15 px-3 text-sm"
                onClick={() => {
                  sessionStorage.removeItem("twister-desk-name");
                  router.push("/");
                }}
              >
                Sign out
              </button>
            </div>
          </header>
          <LogoLoop />

          <div className="grid gap-5 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All pools"],
                    ["evm", "EVM"],
                    ["bitcoin", "Bitcoin"],
                    ["solana", "Solana"],
                    ["tron", "Tron"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`h-8 rounded-md px-3 text-xs ${filter === id ? "bg-primary text-primary-foreground" : "border border-white/15 text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {visible.map((item) => {
                  const active = item.id === chain.id;
                  return (
                    <article key={item.id} className={`rounded-xl border bg-black/75 p-4 ${active ? "border-white/40" : "border-white/10"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <LogoMark className="size-10" />
                          <div>
                            <h2 className="font-medium">{item.label}</h2>
                            <p className="text-xs text-muted-foreground">{item.symbol} pools</p>
                          </div>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground" title={item.address}>
                          {shortAddress(item.address)}
                        </p>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {POOL_SIZES.map((size) => {
                          const selected = active && amount === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setChainId(item.id);
                                setAmount(size);
                                setIntent(null);
                              }}
                              className={`h-10 rounded-md text-sm ${selected ? "bg-primary text-primary-foreground" : "border border-white/10 text-muted-foreground hover:text-foreground"}`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        type="button"
                        className="mt-4 h-10 w-full"
                        disabled={pending}
                        onClick={() => prepareDeposit(item, active ? amount : "1")}
                      >
                        {pending && active ? "Preparing" : `Deposit ${active ? amount : "1"} ${item.symbol}`}
                      </Button>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside id="deposit" className="h-fit space-y-4 rounded-xl border border-white/10 bg-black/80 p-5 xl:sticky xl:top-4">
              <div className="flex items-center gap-3">
                <LogoMark className="size-10" />
                <div>
                  <p className="text-xs text-muted-foreground">Selected pool</p>
                  <h2 className="text-lg font-semibold">
                    {amount} {chain.symbol} · {chain.label}
                  </h2>
                </div>
              </div>
              {intent ? (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Reference for this deposit. Send {intent.amount} {intent.symbol} on {intent.chain} to the address
                    that lands below.
                  </p>
                  <CodeSlots key={intent.reference} text={intent.reference} />
                  <p className="font-mono text-xs leading-5 break-all">{intent.address}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={intent.address} />
                    <Button type="button" className="h-11" onClick={() => sendWithWallet(chain, intent)}>
                      Send with wallet
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Pick a size, then Deposit. The pool pays {chain.address}. Reject a wallet prompt if the recipient is
                  different.
                </p>
              )}
              {status ? <p className="text-sm leading-6 text-muted-foreground">{status}</p> : null}
              <a className="inline-block text-xs text-muted-foreground hover:text-foreground" href={LINKS.bot}>
                Open @twisterprotocolbot
              </a>
            </aside>
          </div>

          <section id="session" className="px-4 pb-10 sm:px-6">
            <h2 className="text-lg font-semibold">This session</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Deposits you prepare on this desk show up here.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/75">
                {history.map((item) => (
                  <li key={item.reference} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      {item.amount} {item.symbol} · {item.chain}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
