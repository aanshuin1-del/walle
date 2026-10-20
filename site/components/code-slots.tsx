"use client";

import { useEffect, useState } from "react";

const GLYPHS = "ABCDEF0123456789";

function Slot({ char, delay }: { char: string; delay: number }) {
  const [glyph, setGlyph] = useState("·");
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started >= delay) {
        setGlyph(char);
        setLanded(true);
        window.clearInterval(timer);
        return;
      }
      setGlyph(GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? char);
    }, 45);
    return () => window.clearInterval(timer);
  }, [char, delay]);

  return (
    <span
      className={`grid h-10 w-6 place-items-center rounded-md border border-white/15 bg-black font-mono text-xs ${landed ? "slot-land border-white/40" : ""}`}
    >
      {glyph}
    </span>
  );
}

/** One-time code whose characters spring into their slots. */
export function CodeSlots({ text }: { text: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={text}>
      {text.split("").map((char, index) => (
        <Slot key={`${text}-${index}`} char={char} delay={90 + index * 55} />
      ))}
    </div>
  );
}
