"use client";
import { cn } from "./cn";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  variant = "boxed",
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  /** "boxed" = bordered container (default). "ghost" = borderless, active
   *  gets a soft raised pill, inactive is bare muted text (Linear pattern). */
  variant?: "boxed" | "ghost";
}) {
  const ghost = variant === "ghost";
  return (
    <div
      className={cn(
        ghost
          ? "inline-flex gap-0.5"
          : "inline-flex gap-0.5 rounded-md border border-border bg-surface-raised p-0.5",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1 text-2xs font-medium transition-colors",
            ghost ? "rounded-md" : "rounded-sm",
            o.value === value
              ? ghost
                ? "bg-surface-raised text-foreground"
                : "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
