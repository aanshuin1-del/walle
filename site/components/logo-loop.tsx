import { LogoMark } from "@/components/logo-mark";
import { CHAINS } from "@/lib/chains";

const MARKS = ["Twister", ...CHAINS.map((chain) => chain.label)];

export function LogoLoop() {
  const row = [...MARKS, ...MARKS];
  return (
    <div className="marquee-mask overflow-hidden border-y border-white/10 bg-black/40">
      <div className="logo-marquee flex w-max items-center py-3">
        {row.map((mark, index) => (
          <span key={`${mark}-${index}`} className="flex items-center gap-3 px-5">
            <LogoMark className="size-7 rounded-md" />
            <span className="text-sm font-medium tracking-wide text-white/85">{mark}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
