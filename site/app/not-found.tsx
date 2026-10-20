import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { SiteLinks } from "@/components/site-links";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <LogoMark className="size-16" />
      <p className="text-7xl font-semibold tracking-tight">404</p>
      <h1 className="text-2xl font-semibold">This page is not on the desk</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        The address you opened does not match a Twister page. Go back to the pools, or write @Twisteradmin on Telegram.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground">
          Back to the pools
        </Link>
        <a
          href="https://t.me/Twisteradmin"
          className="inline-flex h-10 items-center rounded-md border border-white/15 px-4 text-sm"
        >
          Telegram
        </a>
      </div>
      <SiteLinks />
    </main>
  );
}
