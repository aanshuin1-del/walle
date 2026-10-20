"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeSlots } from "@/components/code-slots";
import { CopyButton } from "@/components/copy-button";
import { LogoLoop } from "@/components/logo-loop";
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

  return (
    <main className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-sm tracking-[0.28em] uppercase">Twister</p>
          <p className="text-sm text-muted-foreground">Desk for {name}</p>
        </div>
        <SiteLinks />
      </header>
      <LogoLoop />
      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Deposit into the pool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Pick a network and an amount. Deposit shows the treasury address for that network. Reject a wallet prompt
              if the recipient is different. Contact is only {LINKS.telegramHandle}.
            </p>
            <div className="flex flex-wrap gap-2">
              {POOL_SIZES.map((size) => (
                <Button key={size} type="button" variant={amount === size ? "default" : "outline"} onClick={() => setAmount(size)}>
                  {size}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({chain.symbol})</Label>
              <Input id="amount" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <select
                id="network"
                value={chain.id}
                onChange={(event) => {
                  setChainId(event.target.value);
                  setIntent(null);
                }}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {CHAINS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" className="h-10" disabled={pending || !/^\d+(\.\d{1,18})?$/.test(amount)} onClick={prepareDeposit}>
              {pending ? "Preparing" : "Deposit"}
            </Button>
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{intent ? `${intent.chain} treasury` : "Treasury address"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {intent ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Reference {intent.reference}. Send {intent.amount} {intent.symbol} on {intent.chain} only.
                </p>
                <CodeSlots text={intent.address} />
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={intent.address} />
                  <Button type="button" className="h-9" onClick={() => sendWithWallet(chain, intent)}>
                    Send with wallet
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                The address stays hidden until you choose Deposit, so the network and the amount are fixed first.
              </p>
            )}
            <a className="inline-block text-sm underline-offset-4 hover:underline" href={LINKS.bot}>
              Open @twisterprotocolbot
            </a>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
