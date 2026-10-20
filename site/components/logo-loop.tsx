const MARKS = [
  "Twister",
  "Ethereum",
  "Bitcoin",
  "Solana",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "BNB",
  "Linea",
  "Tron",
  "Monad",
  "Arc",
];

export function LogoLoop() {
  const row = [...MARKS, ...MARKS];
  return (
    <div className="overflow-hidden border-y border-border/70 bg-card/40">
      <div className="logo-marquee flex w-max gap-8 py-3 pr-8">
        {row.map((mark, index) => (
          <span key={`${mark}-${index}`} className="font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase">
            {mark}
          </span>
        ))}
      </div>
    </div>
  );
}
