import { ReactNode } from "react";
import { cn } from "./cn";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; direction?: "up" | "down" | "neutral"; good?: boolean };
  context?: string;
  className?: string;
}

/** Mono, tabular value is the premium tell. Label is a quiet micro-caption. */
export function StatTile({ label, value, delta, context, className }: StatTileProps) {
  const good = delta?.good ?? delta?.direction === "up";
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-5", className)}>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      {(delta || context) && (
        <div className="mt-1.5 flex items-center gap-2 font-mono text-2xs tabular-nums">
          {delta && (
            <span className={good ? "text-success" : "text-danger"}>
              {delta.direction === "up" ? "▲ " : delta.direction === "down" ? "▼ " : ""}
              {delta.value}
            </span>
          )}
          {context && <span className="text-subtle">{context}</span>}
        </div>
      )}
    </div>
  );
}
