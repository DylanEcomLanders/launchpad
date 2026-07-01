import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Open/selected state — adds the soft surface fill so an active
   *  control (open menu, set filter) reads at a glance. */
  active?: boolean;
  /** "value" shows a selected value, so it stays foreground even when idle
   *  (client / scope pickers). "action" is a tertiary control that sits
   *  muted until hovered or open (the Display menu). */
  tone?: "value" | "action";
}

/** The header control chip: a token-only bordered trigger at control
 *  height. Used for dropdown triggers + menu buttons so the whole header
 *  shares one spec instead of six copies. Compose children freely
 *  (label + chevron, icon + label); override padding via className. */
export const Pill = forwardRef<HTMLButtonElement, PillProps>(
  ({ active = false, tone = "value", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-border text-2xs font-medium transition-colors",
        tone === "action" && !active && "text-muted hover:text-foreground hover:bg-surface",
        tone === "action" && active && "text-foreground bg-surface",
        tone === "value" && !active && "text-foreground hover:bg-surface",
        tone === "value" && active && "text-foreground bg-surface",
        className,
      )}
      {...props}
    />
  ),
);
Pill.displayName = "Pill";
