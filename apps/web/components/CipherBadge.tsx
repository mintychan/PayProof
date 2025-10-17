interface CipherBadgeProps {
  label?: string;
}

export default function CipherBadge({ label = "Encrypted on-chain" }: CipherBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
      {label}
    </span>
  );
}
