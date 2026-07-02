import { ReactNode } from "react";
import { cn } from "./cn";

/** The label-over-value pair — THE repeating unit that makes a screen feel
 *  "at one with itself". Every metric/attribute on every page uses this. */
export function Field({
  label,
  value,
  align = "left",
  className,
}: {
  label: string;
  value: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", align === "right" && "items-end text-right", className)}>
      <span className="text-xs font-normal text-subtle">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

/** Even row of Fields. Compose: <Fields><Field .../><Field .../></Fields> */
export function Fields({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-x-12 gap-y-4", className)}>{children}</div>;
}
