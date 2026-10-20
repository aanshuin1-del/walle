export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="text-[var(--gold)]">
        <circle cx="11" cy="11" r="9.25" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.45" />
        <path
          d="M11 3.5c2.6 1.8 4.2 4.2 4.2 7.5S13.6 16.7 11 18.5C8.4 16.7 6.8 14.3 6.8 11S8.4 5.3 11 3.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        <circle cx="11" cy="11" r="1.15" fill="currentColor" />
      </svg>
      <span className="text-[13px] tracking-[0.32em] uppercase">Twister</span>
    </span>
  );
}
