import { LINKS } from "@/lib/chains";

export function SiteLinks() {
  return (
    <nav className="flex flex-wrap items-center gap-4 text-sm">
      <a className="underline-offset-4 hover:underline" href={LINKS.github}>
        GitHub
      </a>
      <a className="underline-offset-4 hover:underline" href={LINKS.x}>
        X
      </a>
      <a className="underline-offset-4 hover:underline" href={LINKS.telegram}>
        {LINKS.telegramHandle}
      </a>
    </nav>
  );
}
