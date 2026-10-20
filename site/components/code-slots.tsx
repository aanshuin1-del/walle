"use client";

import { useEffect, useState } from "react";

const GLYPHS = "abcdef0123456789ABCDEFxT";

/** Reveals an address by settling one character at a time. */
export function CodeSlots({ text }: { text: string }) {
  const [shown, setShown] = useState(() => text.replace(/[A-Za-z0-9]/g, "·"));

  useEffect(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      const next = text
        .split("")
        .map((character, index) => {
          if (step > index + 4) return character;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? character;
        })
        .join("");
      setShown(next);
      if (step > text.length + 6) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <div className="slot-plate rounded-md border border-white/10 bg-black/30 px-4 py-4">
      <p className="font-mono text-[13px] leading-6 break-all tracking-[0.04em] text-foreground">{shown}</p>
    </div>
  );
}
