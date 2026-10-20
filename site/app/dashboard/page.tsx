"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CodeSlots } from "@/components/code-slots";
import { CopyButton } from "@/components/copy-button";
import { LogoLoop } from "@/components/logo-loop";
import { LogoMark } from "@/components/logo-mark";
import { SiteLinks } from "@/components/site-links";
import { CHAINS, LINKS, POOL_SIZES, txUrl, type PoolChain } from "@/lib/chains";
import { evmReceipt, sendPoolPayment } from "@/lib/wallet";

type Intent = {
  reference: string;
  address: string;
  chain: string;
  chainId: string;
  amount: string;
  symbol: string;
  name: string;
};

type Tab = "deposit" | "withdraw";

const WINDOW_SECONDS = 5 * 60;

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [chainId, setChainId] = useState(CHAINS[0].id);
  const [amount, setAmount] = useState("1");
  const [tab, setTab] = useState<Tab>("deposit");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [txId, setTxId] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECONDS);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const deadlineRef = useRef(0);
  const paidRef = useRef("");
  const expiredRef = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("twister-desk-name");
    if (!stored) {
      router.replace("/");
      return;
    }
    setName(stored);
  }, [router]);

  useEffect(() => {
    if (!intent || txId) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !paidRef.current && !expiredRef.current) {
        expiredRef.current = true;
        const closed = intent;
        setIntent(null);
        setStatus("The 5 minute window closed before payment. Press Deposit to open a new one.");
        void fetch("/api/deposit/expire", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(closed),
        });
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [intent, txId]);

  const chain = CHAINS.find((item) => item.id === chainId) ?? CHAINS[0];

  function clearPayment() {
    deadlineRef.current = 0;
    paidRef.current = "";
    setIntent(null);
    setTxId("");
    setSecondsLeft(WINDOW_SECONDS);
    setStatus("");
  }

  function selectChain(nextId: string) {
    setChainId(nextId);
    clearPayment();
  }

  function selectAmount(nextAmount: string) {
    setAmount(nextAmount);
    clearPayment();
  }

  async function reportPayment(prepared: Intent, payment: { txId: string; from: string }) {
    if (Date.now() > deadlineRef.current) return;
    paidRef.current = payment.txId;
    setTxId(payment.txId);
    setStatus("Payment submitted. The transaction id is the wallet's id.");
    await fetch("/api/deposit/paid", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...prepared, txId: payment.txId, from: payment.from }),
    });
    if (chain.kind !== "evm") {
      setStatus("Payment submitted.");
      return;
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 3000));
      const receipt = await evmReceipt(payment.txId);
      if (receipt === "confirmed") {
        setStatus("Payment confirmed on the network.");
        return;
      }
      if (receipt === "failed") {
        setStatus("The network rejected the payment.");
        return;
      }
    }
  }

  async function payWithWallet(prepared: Intent, selected: PoolChain) {
    if (paidRef.current || Date.now() > deadlineRef.current) return;
    setSending(true);
    try {
      const payment = await sendPoolPayment(selected, prepared.amount);
      await reportPayment(prepared, payment);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The wallet did not send the payment.");
    } finally {
      setSending(false);
    }
  }

  async function prepareDeposit() {
    setPending(true);
    setStatus("");
    setTxId("");
    paidRef.current = "";
    expiredRef.current = false;
    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, chainId: chain.id, amount }),
      });
      const body = (await response.json()) as Intent & { error?: string; notified?: number };
      if (!response.ok) {
        setStatus(body.error ?? "The pool could not prepare this deposit.");
        return;
      }
      const prepared: Intent = {
        reference: body.reference,
        address: body.address,
        chain: body.chain,
        chainId: chain.id,
        amount: body.amount,
        symbol: body.symbol,
        name,
      };
      deadlineRef.current = Date.now() + WINDOW_SECONDS * 1000;
      setSecondsLeft(WINDOW_SECONDS);
      setIntent(prepared);
      setStatus(
        body.notified && body.notified > 0
          ? "Deposit address is ready. Your Telegram receives the details. The transaction id appears after the wallet pays."
          : "Deposit address is ready. Send /operator and your desk code to @twisterprotocolbot once, from your own account.",
      );
      await payWithWallet(prepared, chain);
    } catch {
      setStatus("The pool could not reach the deposit API.");
    } finally {
      setPending(false);
    }
  }

  if (!name) return null;
  const explorer = txId ? txUrl(chain, txId) : undefined;

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
              Deposit {amount} {chain.symbol} on {chain.label}. You have 5 minutes to pay. The transaction id appears
              after the wallet sends it.
            </p>
            <button
              type="button"
              disabled={pending || sending}
              onClick={prepareDeposit}
              className="h-12 w-full rounded-xl bg-white text-sm font-semibold text-black disabled:opacity-60"
            >
              {pending || sending ? "Waiting for wallet" : "Deposit"}
            </button>
            {intent ? (
              <div className="space-y-4 rounded-xl border border-white/25 bg-[#101014] p-4">
                <div className="flex items-end justify-between">
                  <p className="text-xs tracking-[0.16em] text-white/50 uppercase">{txId ? "Paid" : "Time left"}</p>
                  <p className="font-mono text-3xl tracking-tight">{txId ? "Done" : clock(secondsLeft)}</p>
                </div>
                <div>
                  <p className="text-xs tracking-[0.16em] text-white/70 uppercase">Deposit address</p>
                  <p className="mt-2 font-mono text-sm leading-6 break-all">{intent.address}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={intent.address} />
                  <button
                    type="button"
                    disabled={sending || Boolean(txId)}
                    className="h-11 rounded-md bg-white px-4 text-sm font-semibold text-black disabled:opacity-60"
                    onClick={() => payWithWallet(intent, chain)}
                  >
                    {sending ? "Confirm in wallet" : "Send with wallet"}
                  </button>
                </div>
                {txId ? (
                  <div className="space-y-3">
                    <p className="text-xs tracking-[0.16em] text-white/70 uppercase">Transaction ID</p>
                    <CodeSlots key={intent.reference} text={intent.reference} />
                    <p className="font-mono text-xs leading-5 break-all">{txId}</p>
                    {explorer ? (
                      <a className="text-sm underline underline-offset-4" href={explorer}>
                        View payment
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-white/50">Transaction ID appears after the wallet pays.</p>
                )}
              </div>
            ) : null}
            {status ? <p className="text-sm leading-6 text-white/60">{status}</p> : null}
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            <p className="text-sm leading-6 text-white/60">
              A withdrawal is not created here. The transaction id from a paid deposit is the id your wallet returned.
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
