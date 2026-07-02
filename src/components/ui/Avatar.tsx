import { cn } from "./cn";

export function Avatar({
  initials,
  size = 24,
  className,
}: {
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border bg-surface-raised font-mono font-semibold text-muted shrink-0",
        className,
      )}
    >
      {initials}
    </span>
  );
}
