"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLinks } from "@/components/site-links";
import { Vortex } from "@/components/vortex";
import { Wordmark } from "@/components/wordmark";
import { LINKS } from "@/lib/chains";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  function openDesk(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    sessionStorage.setItem("twister-desk-name", trimmed);
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="flex flex-col justify-between px-6 py-7 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between gap-6">
          <Wordmark />
          <SiteLinks />
        </div>
        <form onSubmit={openDesk} className="mx-auto w-full max-w-md space-y-8 py-16">
          <div className="space-y-4">
            <p className="text-[11px] tracking-[0.28em] text-[var(--gold)] uppercase">Twister pool</p>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-balance sm:text-6xl">
              A private desk for the pool.
            </h1>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Choose 0.1, 1, 10, or 100. Deposit shows the treasury address for that network, and you send the funds
              yourself. Contact is only Telegram {LINKS.telegramHandle}.
            </p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="desk-name" className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Name on the desk
            </Label>
            <Input
              id="desk-name"
              autoComplete="nickname"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How the bot should address you"
              className="h-12 border-white/15 bg-white/[0.03] px-4 text-base"
            />
          </div>
          <Button type="submit" className="h-12 w-full text-[15px] tracking-wide" disabled={name.trim().length < 2}>
            Continue
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            Instructions also arrive from{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={LINKS.bot}>
              @twisterprotocolbot
            </a>
            . Send /operator from the account that should receive deposit notices.
          </p>
        </form>
        <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase">twisterwallet.com</p>
      </section>
      <section className="relative hidden min-h-screen overflow-hidden border-l border-white/10 lg:block">
        <Vortex />
        <div className="relative z-10 flex h-full flex-col justify-end p-14">
          <p className="font-display max-w-sm text-3xl leading-snug italic text-foreground/95">
            The address on the next screen is the address that receives the funds.
          </p>
        </div>
      </section>
    </main>
  );
}
