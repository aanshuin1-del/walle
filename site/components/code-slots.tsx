"use client";

import { useEffect, useState } from "react";

const GLYPHS = "abcdef0123456789ABCDEFxT";

/** Reveals an address one settled character at a time. */
export function CodeSlots({ text }: { text: string }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      const next = text
        .split("")
        .map((character, index) => {
          if (step > index + 6) return character;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? character;
        })
        .join("");
      setShown(next);
      if (step > text.length + 8) window.clearInterval(timer);
    }, 32);
    return () => window.clearInterval(timer);
  }, [text]);

  return <p className="font-mono text-sm leading-6 break-all text-foreground">{shown}</p>;
}
