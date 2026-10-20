"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-md border border-white/15 bg-white/[0.04] px-4 text-sm hover:bg-white/[0.08]"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden>
        {copied ? (
          <path d="M3 8.2 6.1 11 12 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        ) : (
          <>
            <rect x="5" y="3" width="7" height="9" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 11.5H3.2A1.2 1.2 0 0 1 2 10.3V3.2A1.2 1.2 0 0 1 3.2 2H9" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </>
        )}
      </svg>
      <span className="relative h-5 overflow-hidden">
        <span className={`block transition-transform duration-300 ${copied ? "-translate-y-5" : "translate-y-0"}`}>Copy address</span>
        <span className={`absolute inset-0 block transition-transform duration-300 ${copied ? "translate-y-0" : "translate-y-5"}`}>Copied</span>
      </span>
    </button>
  );
}
