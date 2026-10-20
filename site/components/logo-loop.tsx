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
    <div className="marquee-mask overflow-hidden border-y border-white/10 bg-white/[0.02]">
      <div className="logo-marquee flex w-max items-center gap-8 py-3.5 pr-8">
        {row.map((mark, index) => (
          <span key={`${mark}-${index}`} className="flex items-center gap-8">
            <span className="font-display text-[15px] tracking-[0.18em] text-foreground/80 uppercase">{mark}</span>
            <span className="size-1 rounded-full bg-[var(--gold)]" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}
