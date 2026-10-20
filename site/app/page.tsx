"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLoop } from "@/components/logo-loop";
import { LogoMark } from "@/components/logo-mark";
import { SiteLinks } from "@/components/site-links";
import { Vortex } from "@/components/vortex";
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
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="size-9" />
            <span className="text-sm font-semibold">Twister Wallet</span>
          </span>
          <SiteLinks />
        </div>
        <form onSubmit={openDesk} className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <LogoMark className="size-14" />
            <h1 className="text-3xl font-semibold tracking-tight">Open the pools</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Twelve networks, four sizes each. Deposit sends the amount to that pool&apos;s treasury address. Contact is
              only Telegram {LINKS.telegramHandle}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desk-name">Name on the desk</Label>
            <Input
              id="desk-name"
              autoComplete="nickname"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How the bot should address you"
              className="h-11"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={name.trim().length < 2}>
            Continue
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            Wallet instructions also arrive from{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={LINKS.bot}>
              @twisterprotocolbot
            </a>
            . Send /operator from the account that should receive deposit notices.
          </p>
        </form>
        <p className="text-xs text-muted-foreground">twisterwallet.com</p>
      </section>
      <section className="relative hidden min-h-screen overflow-hidden border-l border-white/10 lg:flex lg:flex-col">
        <Vortex />
        <div className="relative z-10 mt-auto">
          <LogoLoop />
        </div>
      </section>
    </main>
  );
}
