export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden rounded-lg bg-black ${className}`}>
      <img
        src="/logo.png"
        alt=""
        className="absolute top-1/2 left-1/2 w-[250%] max-w-none -translate-x-1/2 -translate-y-[46%]"
      />
    </span>
  );
}
