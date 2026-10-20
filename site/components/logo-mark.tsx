export function LogoMark({ className = "size-10", bare = false }: { className?: string; bare?: boolean }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden ${bare ? "" : "rounded-lg bg-black"} ${className}`}>
      <img
        src="/logo.png"
        alt=""
        className={`absolute top-1/2 left-1/2 w-[250%] max-w-none -translate-x-1/2 -translate-y-[46%] ${bare ? "mix-blend-screen" : ""}`}
      />
    </span>
  );
}
