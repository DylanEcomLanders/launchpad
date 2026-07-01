import { cn } from "./cn";

/** Monochrome status iconography — meaning through SHAPE, not colour, so the
 *  palette stays grey. This is what lets you pull colour out of tables. */
export type Status = "backlog" | "todo" | "in_progress" | "review" | "blocked" | "done";

export function StatusGlyph({ status, className }: { status: Status; className?: string }) {
  const c = cn("h-4 w-4 text-muted", className);
  switch (status) {
    case "backlog":
      return (
        <svg className={c} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.2 2.2">
          <circle cx="8" cy="8" r="6.2" />
        </svg>
      );
    case "todo":
      return (
        <svg className={c} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.2" />
        </svg>
      );
    case "in_progress":
      return (
        <svg className={c} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.2" />
          <path d="M8 1.8a6.2 6.2 0 0 1 0 12.4z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "review":
      return (
        <svg className={c} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M8 1.5l5.5 3.2v6.6L8 14.5 2.5 11.3V4.7z" />
        </svg>
      );
    case "blocked":
      return (
        <svg className={cn(c, "text-danger")} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M5.4 1.5h5.2l3.9 3.9v5.2l-3.9 3.9H5.4l-3.9-3.9V5.4z" />
          <path d="M8 5v3.5" /><path d="M8 11v.2" />
        </svg>
      );
    case "done":
      return (
        <svg className={c} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.2" fill="currentColor" opacity=".18" />
          <path d="M5.2 8.2l1.9 1.9 3.7-3.9" />
        </svg>
      );
  }
}
