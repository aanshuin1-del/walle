"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeSlots } from "@/components/code-slots";
import { CopyButton } from "@/components/copy-button";
import { LogoLoop } from "@/components/logo-loop";
import { SiteLinks } from "@/components/site-links";
import { Wordmark } from "@/components/wordmark";
import { CHAINS, LINKS, POOL_SIZES, type PoolChain } from "@/lib/chains";

type Intent = {
  reference: string;
  address: string;
  chain: string;
  amount: string;
  symbol: string;
  notified: number;
};

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

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [chainId, setChainId] = useState(CHAINS[0].id);
  const [amount, setAmount] = useState("1");
  const [intent, setIntent] = useState<Intent | null>(null);
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

  async function prepareDeposit() {
    setPending(true);
    setStatus("");
    setIntent(null);
    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, chainId: chain.id, amount }),
      });
      const body = (await response.json()) as Intent & { error?: string };
      if (!response.ok) {
        setStatus(body.error ?? "The desk could not prepare this deposit.");
        return;
      }
      setIntent(body);
      setStatus(
        body.notified > 0
          ? "The Telegram operator was notified. The address below is the one that receives this deposit."
          : "The address below is the one that receives this deposit. The bot has no operator yet, so no Telegram notice was sent.",
      );
      if (chain.kind === "evm" && chain.chainId !== undefined) {
        await sendWithWallet(chain, body);
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
      setStatus(`Wallet returned ${String(tx)}. Confirm the recipient matches the address on this page.`);
    } catch {
      setStatus("The wallet did not send. You can still copy the address and pay it from your own wallet.");
    }
  }

  if (!name) return null;

  const amountReady = /^\d+(\.\d{1,18})?$/.test(amount);

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <Wordmark />
        <div className="flex items-center gap-6">
          <p className="text-sm text-muted-foreground">
            Desk for <span className="text-foreground">{name}</span>
          </p>
          <SiteLinks />
        </div>
      </header>
      <LogoLoop />
      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel space-y-8 rounded-2xl border border-white/10 p-6 sm:p-8">
          <div className="space-y-2">
            <p className="text-[11px] tracking-[0.28em] text-[var(--gold)] uppercase">Deposit</p>
            <h1 className="font-display text-4xl tracking-tight">Into the pool</h1>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              The treasury address appears after Deposit. Reject a wallet prompt if the recipient is different. Contact
              is only {LINKS.telegramHandle}.
            </p>
          </div>
          <div className="space-y-4">
            <label htmlFor="amount" className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Amount
            </label>
            <div className="flex items-end gap-4 border-b border-white/10 pb-2">
              <input
                id="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="font-display w-full bg-transparent text-6xl tracking-tight outline-none"
                inputMode="decimal"
              />
              <span className="pb-2 text-[11px] tracking-[0.22em] text-muted-foreground uppercase">{chain.symbol}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POOL_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setAmount(size)}
                  className={`h-9 rounded-md px-3 text-sm transition ${
                    amount === size
                      ? "bg-primary text-primary-foreground"
                      : "border border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Network</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CHAINS.map((item) => {
                const selected = item.id === chain.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setChainId(item.id);
                      setIntent(null);
                    }}
                    className={`flex items-center justify-between rounded-md border px-3 py-3 text-left transition ${
                      selected ? "border-white/40 bg-white/[0.06]" : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <span>
                      <span className="block text-sm">{item.label}</span>
                      <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{item.symbol}</span>
                    </span>
                    <span className={`size-1.5 rounded-full ${selected ? "bg-[var(--gold)]" : "bg-white/20"}`} />
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="button" className="h-12 w-full text-[15px] tracking-wide" disabled={pending || !amountReady} onClick={prepareDeposit}>
            {pending ? "Preparing" : `Deposit ${amount || "0"} ${chain.symbol}`}
          </Button>
          {status ? <p className="text-sm leading-6 text-muted-foreground">{status}</p> : null}
        </div>
        <aside className="panel flex flex-col justify-between gap-8 rounded-2xl border border-white/10 p-6 sm:p-8">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.28em] text-[var(--gold)] uppercase">Treasury</p>
                <h2 className="font-display mt-2 text-4xl tracking-tight">{intent ? intent.chain : "Awaiting"}</h2>
              </div>
              {intent ? (
                <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">{intent.reference}</p>
              ) : null}
            </div>
            {intent ? (
              <>
                <p className="text-sm leading-6 text-muted-foreground">
                  Send {intent.amount} {intent.symbol} on {intent.chain} only. This is the address that receives it.
                </p>
                <CodeSlots key={intent.address + intent.reference} text={intent.address} />
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={intent.address} />
                  <Button type="button" className="h-11 px-4" onClick={() => sendWithWallet(chain, intent)}>
                    Send with wallet
                  </Button>
                </div>
              </>
            ) : (
              <p className="font-display text-2xl leading-snug italic text-foreground/80">
                The address stays hidden until the network and the amount are fixed.
              </p>
            )}
          </div>
          <a className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground" href={LINKS.bot}>
            Open @twisterprotocolbot
          </a>
        </aside>
      </section>
    </main>
  );
}
