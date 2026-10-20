import { LINKS } from "@/lib/chains";

const items = [
  { href: LINKS.github, label: "GitHub" },
  { href: LINKS.x, label: "X" },
  { href: LINKS.telegram, label: LINKS.telegramHandle },
];

export function SiteLinks({ stacked = false }: { stacked?: boolean }) {
  return (
    <nav className={stacked ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-4"}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
