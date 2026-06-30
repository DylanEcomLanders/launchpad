import { ReactNode } from "react";
import { cn } from "./cn";

/** Keyboard hint chip — sprinkle next to actions and in the ⌘K palette.
 *  Visible shortcuts are a core Raycast/Linear signal. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded-sm border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-2xs font-medium text-subtle leading-none",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
