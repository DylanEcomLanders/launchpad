import { ReactNode } from "react";
import { cn } from "./cn";
import { StatusGlyph, type Status } from "./StatusGlyph";

/** The Launchpad "roadmap" card — a project / deliverable read at a glance:
 *  a leading type icon + title on one line with a small status-glyph cluster
 *  on the right, then a muted description and a category / meta footer.
 *
 *  Token-only. Status reads through SHAPE via StatusGlyph so colour stays
 *  scarce; the surface is a flat token panel that lifts on hover when clickable.
 */
export function ProjectCard({
  icon,
  title,
  status,
  cluster,
  description,
  footer,
  onClick,
  className,
}: {
  /** Leading type icon (deliverable / project type). */
  icon?: ReactNode;
  title: string;
  /** Single status → a StatusGlyph on the right. Ignored when `cluster` is set. */
  status?: Status;
  /** Full custom glyph cluster (e.g. health · status · progress). Overrides `status`. */
  cluster?: ReactNode;
  description?: string;
  /** Category / client / meta line. */
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border bg-surface p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-surface-raised",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon && (
          <span className="shrink-0 mt-px text-muted [&>svg]:size-4">{icon}</span>
        )}
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground line-clamp-2">
          {title}
        </p>
        {(cluster || status) && (
          <span className="shrink-0 flex items-center gap-1.5 text-muted">
            {cluster ?? (status && <StatusGlyph status={status} />)}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-2">
          {description}
        </p>
      )}
      {footer && (
        <div className="mt-3 flex items-center gap-1.5 text-2xs text-subtle">
          {footer}
        </div>
      )}
    </div>
  );
}
