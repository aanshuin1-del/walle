import Link from "next/link";
import { SiteLinks } from "@/components/site-links";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <p className="font-mono text-6xl font-semibold tracking-tight">404</p>
      <h1 className="text-2xl font-semibold">This page is not on the desk</h1>
      <p className="text-sm text-muted-foreground">
        The address you opened does not match a Twister page. Go back to the desk, or write @Twisteradmin on Telegram.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground">
          Back to the desk
        </Link>
        <a
          href="https://t.me/Twisteradmin"
          className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm"
        >
          Telegram
        </a>
      </div>
      <SiteLinks />
    </main>
  );
}
