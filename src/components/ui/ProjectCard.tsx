import { DragEvent, ReactNode } from "react";
import { cn } from "./cn";
import { StatusGlyph, type Status } from "./StatusGlyph";

/** The Launchpad card primitive — a project / deliverable read at a glance:
 *  a leading type icon + title on one line with a status cluster on the right,
 *  then an optional description and a footer. Token-only.
 *
 *  `variant="compact"` renders the dense scan-bar (one line: icon · title ·
 *  trailing cluster). `overdue` swaps the flat surface for the subtle red
 *  gradient. Drag + click wiring is passed through so boards can make it
 *  draggable without the primitive owning that logic.
 */
export function ProjectCard({
  variant = "default",
  icon,
  title,
  status,
  cluster,
  description,
  footer,
  overdue = false,
  live = false,
  dragging = false,
  draggable,
  onDragStart,
  onDragEnd,
  onClick,
  tooltip,
  className,
}: {
  variant?: "default" | "compact";
  /** Leading type icon node (sized/coloured by the caller). */
  icon?: ReactNode;
  title: string;
  /** Single status → a StatusGlyph in the cluster. Ignored when `cluster` is set. */
  status?: Status;
  /** Right-side cluster (status dot + badges, or a trailing marker in compact). */
  cluster?: ReactNode;
  /** Secondary context line (default variant only). */
  description?: ReactNode;
  /** Footer row — e.g. assignee + due (default variant only). */
  footer?: ReactNode;
  overdue?: boolean;
  /** Test is live in market — subtle green tint (mirrors `overdue`). */
  live?: boolean;
  dragging?: boolean;
  draggable?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
  /** HTML title attribute (hover tooltip). */
  tooltip?: string;
  className?: string;
}) {
  const clusterContent = cluster ?? (status && <StatusGlyph status={status} />);

  if (variant === "compact") {
    return (
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        title={tooltip}
        className={cn(
          "flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-[6px] border cursor-grab active:cursor-grabbing transition-colors",
          live
            ? "bg-[image:var(--card-live)] border-status-ontrack/20 hover:bg-[image:var(--card-live-hover)] hover:border-status-ontrack/30"
            : "bg-surface border-white/[0.05] hover:bg-surface-raised hover:border-white/[0.09]",
          dragging && "opacity-40 scale-[0.98]",
          className,
        )}
      >
        {icon}
        <span className="text-2xs text-foreground truncate flex-1 min-w-0">
          {title}
        </span>
        {clusterContent}
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={tooltip}
      className={cn(
        "p-3.5 rounded-[6px] border cursor-grab active:cursor-grabbing transition-colors",
        overdue
          ? "bg-[image:var(--card-overdue)] border-status-late/20 hover:bg-[image:var(--card-overdue-hover)] hover:border-status-late/30"
          : live
            ? "bg-[image:var(--card-live)] border-status-ontrack/20 hover:bg-[image:var(--card-live-hover)] hover:border-status-ontrack/30"
            : "bg-surface border-white/[0.05] hover:bg-surface-raised hover:border-white/[0.09]",
        dragging && "opacity-40 scale-[0.98]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          {icon}
          <p className="min-w-0 text-[13.5px] font-medium leading-snug text-foreground line-clamp-2 min-h-[37px]">
            {title}
          </p>
        </div>
        {clusterContent && (
          <div className="flex items-center gap-1.5 shrink-0 mt-px">{clusterContent}</div>
        )}
      </div>

      {description && (
        <p className="mt-1.5 text-3xs text-subtle truncate">{description}</p>
      )}

      {footer && (
        <div className="mt-3 flex items-center justify-between gap-2 text-3xs">
          {footer}
        </div>
      )}
    </div>
  );
}
