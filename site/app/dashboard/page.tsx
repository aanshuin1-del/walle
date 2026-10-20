"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CodeSlots } from "@/components/code-slots";
import { CopyButton } from "@/components/copy-button";
import { LogoLoop } from "@/components/logo-loop";
import { LogoMark } from "@/components/logo-mark";
import { SiteLinks } from "@/components/site-links";
import { CHAINS, LINKS, POOL_SIZES, type PoolChain } from "@/lib/chains";

type Intent = {
  reference: string;
  address: string;
  chain: string;
  amount: string;
  symbol: string;
  notified: number;
};

type Tab = "deposit" | "withdraw";

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
  const [tab, setTab] = useState<Tab>("deposit");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [referenceLookup, setReferenceLookup] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("twister-desk-name");
    if (!stored) {
      router.replace("/");
      return;
    }
    setName(stored);
  }, [router]);

  const chain = CHAINS.find((item) => item.id === chainId) ?? CHAINS[0];

  function selectChain(nextId: string) {
    setChainId(nextId);
    setIntent(null);
    setStatus("");
  }

  function selectAmount(nextAmount: string) {
    setAmount(nextAmount);
    setIntent(null);
    setStatus("");
  }

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
        setStatus(body.error ?? "The pool could not prepare this deposit.");
        return;
      }
      setIntent(body);
      setStatus(
        body.notified > 0
          ? "Deposit address is ready. The operator was notified on Telegram."
          : "Deposit address is ready. Send /operator to @twisterprotocolbot if you want the notice there.",
      );
      if (chain.kind === "evm" && chain.chainId !== undefined) {
        await sendWithWallet(chain, body);
      }
    } catch {
      setStatus("The pool could not reach the deposit API.");
    } finally {
      setPending(false);
    }
  }

  async function sendWithWallet(selected: PoolChain, prepared: Intent) {
    const wei = parseAmount(prepared.amount);
    const ethereum = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
    if (!ethereum || selected.kind !== "evm" || selected.chainId === undefined || wei === null) {
      setStatus("Copy the deposit address into your wallet and send the amount on this network only.");
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
      setStatus(`Wallet returned ${String(tx)}. The recipient must match the deposit address on this page.`);
    } catch {
      setStatus("The wallet did not send. Copy the deposit address and pay it from your own wallet.");
    }
  }

  if (!name) return null;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <span className="inline-flex items-center gap-2.5">
          <LogoMark className="size-9" />
          <span className="text-sm font-semibold tracking-tight">Twister</span>
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <SiteLinks />
          <span className="text-xs text-white/50">{name}</span>
          <button
            type="button"
            className="h-8 rounded-md border border-white/15 px-3 text-xs"
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

      <main className="mx-auto w-full max-w-[560px] px-4 py-10">
        <label className="text-xs tracking-[0.16em] text-white/45 uppercase" htmlFor="pool-network">
          Pool
        </label>
        <select
          id="pool-network"
          value={chain.id}
          onChange={(event) => selectChain(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#141418] px-3 text-sm outline-none"
        >
          {CHAINS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} · {item.symbol}
            </option>
          ))}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {POOL_SIZES.map((size) => {
            const selected = amount === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => selectAmount(size)}
                className={`flex h-24 flex-col items-center justify-center rounded-xl border ${
                  selected ? "border-white bg-white/10" : "border-white/10 bg-[#141418] hover:border-white/30"
                }`}
              >
                <span className="text-2xl font-semibold tracking-tight">{size}</span>
                <span className="mt-1 text-xs text-white/55">{chain.symbol}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-[#141418] p-1">
          {(["deposit", "withdraw"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`h-10 rounded-lg text-sm capitalize ${tab === item ? "bg-white font-semibold text-black" : "text-white/70"}`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "deposit" ? (
          <section className="mt-5 space-y-4">
            <p className="text-sm leading-6 text-white/60">
              Deposit {amount} {chain.symbol} on {chain.label}. The address is created for this deposit when you press
              the button. Send only on {chain.label}.
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={prepareDeposit}
              className="h-12 w-full rounded-xl bg-white text-sm font-semibold text-black disabled:opacity-60"
            >
              {pending ? "Preparing" : "Deposit"}
            </button>
            {intent ? (
              <div className="space-y-4 rounded-xl border border-white/25 bg-[#101014] p-4">
                <div>
                  <p className="text-xs tracking-[0.16em] text-white/70 uppercase">Deposit address</p>
                  <p className="mt-2 font-mono text-sm leading-6 break-all">{intent.address}</p>
                </div>
                <CodeSlots key={intent.reference} text={intent.reference} />
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={intent.address} />
                  <button
                    type="button"
                    className="h-11 rounded-md bg-white px-4 text-sm font-semibold text-black"
                    onClick={() => sendWithWallet(chain, intent)}
                  >
                    Send with wallet
                  </button>
                </div>
                <p className="text-xs leading-5 text-white/50">
                  {intent.amount} {intent.symbol} · {intent.chain}. Contact {LINKS.telegramHandle}.
                </p>
              </div>
            ) : null}
            {status ? <p className="text-sm leading-6 text-white/60">{status}</p> : null}
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            <p className="text-sm leading-6 text-white/60">
              Paste the deposit reference from this desk. Twister does not build a withdrawal proof and does not create
              a spending key.
            </p>
            <textarea
              value={referenceLookup}
              onChange={(event) => setReferenceLookup(event.target.value)}
              placeholder="TW-••••••••"
              className="h-28 w-full rounded-xl border border-white/10 bg-[#141418] p-3 font-mono text-sm outline-none"
            />
            <p className="text-sm text-white/60">
              {/^TW-[0-9A-F]{8}$/i.test(referenceLookup.trim())
                ? "That reference matches a desk deposit. The funds were sent to the pool address shown on Deposit."
                : "A reference looks like TW- followed by 8 characters."}
            </p>
            <a className="inline-block text-sm text-white underline underline-offset-4" href={LINKS.telegram}>
              Ask {LINKS.telegramHandle}
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
