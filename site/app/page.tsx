"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo-mark";
import { SiteLinks } from "@/components/site-links";
import { Starfield } from "@/components/starfield";
import { LINKS } from "@/lib/chains";

type Provider = "Google" | "GitHub" | "Apple";

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path fill="#fff" d="M15.5 8.2c0-.6-.1-1.1-.2-1.6H8v3h4.2a3.6 3.6 0 0 1-1.6 2.4v2h2.5c1.5-1.4 2.4-3.4 2.4-5.8Z" />
      <path fill="#fff" d="M8 16c2.1 0 3.9-.7 5.2-1.9l-2.5-2A4.8 4.8 0 0 1 3.4 9.4H.8v2.1A8 8 0 0 0 8 16Z" opacity=".72" />
      <path fill="#fff" d="M3.4 9.4a4.8 4.8 0 0 1 0-3.1V4.2H.8a8 8 0 0 0 0 7.3l2.6-2.1Z" opacity=".5" />
      <path fill="#fff" d="M8 3.2c1.1 0 2.2.4 3 .1.1l2.2-2.2A8 8 0 0 0 .8 4.2l2.6 2.1A4.8 4.8 0 0 1 8 3.2Z" opacity=".85" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M8 0a8 8 0 0 0-2.5 15.6c.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.1-.9-1.1-.7-.5 0-.5 0-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.9 3.7-3.6 3.9.3.3.6.8.6 1.5v2.2c0 .2.1.5.5.4A8 8 0 0 0 8 0Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M11.2 1.2c.1 1-.3 2-1 2.7-.7.7-1.8 1.2-2.8 1.1.1-1 .4-1.9 1.1-2.6.7-.7 1.8-1.2 2.7-1.2Zm2.2 4.2c-1.5-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.1 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.2 1.2-2.4 1.3-2.5-0-0-2.4-1-2.4-3.7 0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.5-1.9Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function openDesk(label: string) {
    sessionStorage.setItem("twister-desk-name", label);
    router.push("/dashboard");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter an email address.");
      return;
    }
    if (password.length < 4) {
      setError("Enter a password of at least 4 characters. It stays in this browser.");
      return;
    }
    setError("");
    openDesk(email.trim());
  }

  function continueWith(provider: Provider) {
    openDesk(email.trim().includes("@") ? email.trim() : provider);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <Starfield />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[34%] -left-[22%] size-[46rem] rounded-full bg-[radial-gradient(circle_at_32%_28%,#4a4a4a,#161616_46%,#000_68%)] shadow-[inset_-60px_-24px_90px_#000]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[36%] -right-[24%] size-[40rem] rounded-full bg-[radial-gradient(circle_at_68%_62%,#3a3a3a,#101010_48%,#000_70%)] shadow-[inset_36px_12px_80px_#000]"
      />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <section className="hidden flex-col justify-center px-16 lg:flex">
          <LogoMark bare className="size-28" />
          <h1 className="mt-10 text-5xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-3 text-sm text-white/60">Sign in to continue to your account</p>
          <div className="mt-10 h-px w-16 bg-white/30" />
          <p className="mt-6 text-[11px] tracking-[0.28em] text-white/55 uppercase">Privacy · Freedom · Ownership</p>
          <div className="mt-10">
            <SiteLinks />
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10">
          <form
            onSubmit={submit}
            className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0c0c0c]/90 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-8"
          >
            <div className="flex flex-col items-center text-center">
              <LogoMark bare className="size-14" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                {mode === "sign-in" ? "Welcome back" : "Create your desk"}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                {mode === "sign-in" ? "Sign in to your account" : "Open a desk with your email"}
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              {(
                [
                  ["Google", <GoogleMark key="g" />],
                  ["GitHub", <GitHubMark key="gh" />],
                  ["Apple", <AppleMark key="a" />],
                ] as const
              ).map(([provider, icon]) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => continueWith(provider)}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-white/12 bg-white/[0.03] px-3 text-sm transition hover:bg-white/[0.07]"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-white/10">{icon}</span>
                    Continue with {provider}
                  </span>
                  <span aria-hidden className="text-white/40">
                    →
                  </span>
                </button>
              ))}
            </div>

            <div className="my-5 flex items-center gap-3 text-[11px] tracking-[0.2em] text-white/40">
              <span className="h-px flex-1 bg-white/15" />
              OR
              <span className="h-px flex-1 bg-white/15" />
            </div>

            <label className="block text-sm" htmlFor="email">
              Email address
            </label>
            <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-white/12 bg-black/40 px-3">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="text-white/45">
                <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" />
                <path d="m2 4 6 5 6-5" fill="none" stroke="currentColor" />
              </svg>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="text-sm" htmlFor="password">
                Password
              </label>
            </div>
            <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-white/12 bg-black/40 px-3">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="text-white/45">
                <rect x="3" y="7" width="10" height="7" rx="1.4" fill="none" stroke="currentColor" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" />
              </svg>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
              />
              <button
                type="button"
                className="text-white/45"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                  <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" fill="none" stroke="currentColor" />
                  <circle cx="8" cy="8" r="1.6" fill="none" stroke="currentColor" />
                </svg>
              </button>
            </div>
            <div className="mt-2 text-right">
              <a href={LINKS.telegram} className="text-xs text-white/45 hover:text-white">
                Forgot password?
              </a>
            </div>

            {error ? <p className="mt-3 text-sm text-white/70">{error}</p> : null}

            <button type="submit" className="mt-5 h-11 w-full rounded-lg bg-white text-sm font-medium text-black">
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </button>

            <p className="mt-4 text-center text-xs text-white/50">
              {mode === "sign-in" ? "Don't have an account?" : "Already have a desk?"}{" "}
              <button
                type="button"
                className="text-white underline underline-offset-4"
                onClick={() => {
                  setMode(mode === "sign-in" ? "create" : "sign-in");
                  setError("");
                }}
              >
                {mode === "sign-in" ? "Create one" : "Sign in"}
              </button>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
