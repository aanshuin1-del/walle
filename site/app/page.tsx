"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <p className="text-sm tracking-[0.28em] uppercase">Twister</p>
          <SiteLinks />
        </div>
        <form onSubmit={openDesk} className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Open the pool desk</h1>
            <p className="text-sm text-muted-foreground">
              Fixed sizes are 0.1, 1, 10, and 100. A deposit is a transfer you send yourself to the treasury address
              shown for that network. Contact is only Telegram {LINKS.telegramHandle}.
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
              className="h-10"
            />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={name.trim().length < 2}>
            Continue
          </Button>
          <p className="text-xs text-muted-foreground">
            Wallet instructions also arrive from{" "}
            <a className="underline-offset-4 hover:underline" href={LINKS.bot}>
              @twisterprotocolbot
            </a>
            . Send /operator from the account that should receive deposit notices.
          </p>
        </form>
        <p className="text-xs text-muted-foreground">twisterwallet.com</p>
      </section>
      <section className="relative hidden min-h-screen overflow-hidden border-l border-border lg:block">
        <Vortex />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <p className="max-w-md text-lg text-foreground">
            The desk does not hold a secret key for you. The address on the next screen is the address that receives
            the funds.
          </p>
        </div>
      </section>
    </main>
  );
}
