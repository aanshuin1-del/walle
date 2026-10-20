import Link from "next/link";
import { SiteLinks } from "@/components/site-links";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-between px-6 py-8">
      <Wordmark />
      <div className="space-y-6">
        <p className="font-display text-8xl leading-none tracking-tight">404</p>
        <h1 className="font-display text-4xl tracking-tight">This page is not on the desk.</h1>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          The address you opened does not match a Twister page. Return to the desk, or write @Twisteradmin on Telegram.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm text-primary-foreground"
          >
            Back to the desk
          </Link>
          <a
            href="https://t.me/Twisteradmin"
            className="inline-flex h-11 items-center rounded-md border border-white/15 px-5 text-sm"
          >
            Telegram
          </a>
        </div>
      </div>
      <SiteLinks />
    </main>
  );
}
