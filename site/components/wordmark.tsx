import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
      <LogoMark className="size-9" />
      <span className="text-sm font-semibold tracking-tight">Twister</span>
    </Link>
  );
}
