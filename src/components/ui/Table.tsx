import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./cn";

export function Table({ className, ...p }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse", className)} {...p} />;
}
export function THead({ className, ...p }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_th]:border-b [&_th]:border-border", className)} {...p} />;
}
export function TBody(p: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...p} />;
}
export function TR({
  className,
  hover = true,
  ...p
}: HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }) {
  return (
    <tr
      className={cn("border-b border-border last:border-0", hover && "transition-colors hover:bg-surface-raised", className)}
      {...p}
    />
  );
}
type Align = { align?: "left" | "right" | "center" };
export function TH({ className, align = "left", ...p }: ThHTMLAttributes<HTMLTableCellElement> & Align) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-subtle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
      {...p}
    />
  );
}
export function TD({ className, align = "left", ...p }: TdHTMLAttributes<HTMLTableCellElement> & Align) {
  return (
    <td
      className={cn(
        "px-5 py-3 text-sm text-foreground align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...p}
    />
  );
}
/** For figures: wrap numeric cell content so columns align. */
export function Num({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("font-mono tabular-nums", className)}>{children}</span>;
}
