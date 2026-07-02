import { ReactNode } from "react";
import { cn } from "./cn";

/** Semantic tones use tokens. Category tones (dev/design/copy/strategy) are the
 *  ONE sanctioned place for fixed data-viz hues — keep them here, never inline. */
type Tone = "neutral" | "success" | "warning" | "danger" | "dev" | "design" | "copy" | "strategy";

const DOT: Record<Tone, string> = {
  neutral: "bg-subtle",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  dev: "bg-cat-dev",
  design: "bg-cat-design",
  copy: "bg-warning",
  strategy: "bg-success",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-raised px-2 py-0.5 text-2xs font-medium text-muted",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}
