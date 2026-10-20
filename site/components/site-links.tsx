import { LINKS } from "@/lib/chains";

const items = [
  { href: LINKS.github, label: "GitHub" },
  { href: LINKS.x, label: "X" },
  { href: LINKS.telegram, label: "Telegram" },
];

export function SiteLinks() {
  return (
    <nav className="flex items-center gap-5">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
