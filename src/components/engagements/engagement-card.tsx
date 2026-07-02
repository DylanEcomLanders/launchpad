import { Card, Field, Fields, StatusGlyph, type Status } from "@/components/ui";
import {
  BUCKETS,
  ENGAGEMENT_DELIVERABLES,
} from "@/lib/engagement-template";
import type { MockEngagement } from "@/lib/engagement-mocks";

/* ─────────────────────────────────────────────────────────────────────────
   EngagementCard — the V2 engagement summary (matches launchpad-v2-cards.html).
   Label/value Field grid on top, monochrome StatusGlyph request rows below.

   ONE colour event per card: the brand mark is monochrome; the single most
   urgent request carries the only colour — red if blocked, amber ▲ if overdue,
   nothing when all is calm. Everything else stays grey, meaning through shape.
   ───────────────────────────────────────────────────────────────────────── */

type Request = { id: string; name: string; status: Status; dueDay: number };

/** Two-letter monogram for the (monochrome) brand mark. */
function monogram(brand: string): string {
  const parts = brand.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ageLabel(dueDay: number, currentDay: number): string {
  const diff = dueDay - currentDay;
  if (diff < 0) return `${Math.abs(diff)}d late`;
  if (diff === 0) return "today";
  return `${diff}d`;
}

export function EngagementCard({ engagement }: { engagement: MockEngagement }) {
  const isRetainer = engagement.kind === "retainer";
  const currentDay = engagement.currentDay;
  const bucketDef = engagement.bucket
    ? BUCKETS.find((b) => b.size === engagement.bucket)
    : null;

  // Same source-of-truth as the list health calc: retainer audit stack (template)
  // + custom build/test deliverables; buckets are custom-only.
  const stateById = new Map(engagement.deliverables.map((d) => [d.templateId, d]));
  const templateReqs: Request[] = isRetainer
    ? ENGAGEMENT_DELIVERABLES.map((d) => ({
        id: d.id,
        name: d.name,
        status: (stateById.get(d.id)?.status ?? "todo") as Status,
        dueDay: d.dueDay,
      }))
    : [];
  const customReqs: Request[] = engagement.customDeliverables.map((d) => ({
    id: d.id,
    name: d.name,
    status: (stateById.get(d.id)?.status ?? "todo") as Status,
    dueDay: d.dueDay,
  }));

  const all = [...templateReqs, ...customReqs];
  const open = all.filter((r) => r.status !== "done");

  const isOverdue = (r: Request) => r.status !== "done" && r.dueDay < currentDay;
  const isBlocked = (r: Request) => r.status === "blocked";

  // The single headline request = the one allowed colour event. Blocked beats
  // overdue; ties break on the most-overdue (smallest dueDay).
  const urgent = open
    .filter((r) => isBlocked(r) || isOverdue(r))
    .sort((a, b) => {
      if (isBlocked(a) !== isBlocked(b)) return isBlocked(a) ? -1 : 1;
      return a.dueDay - b.dueDay;
    });
  const headline = urgent[0] ?? null;

  // Important = the single headline urgent item. Other = the rest of the open
  // work, soonest-first, capped so the card stays a summary (not the full plan).
  const important = headline ? [headline] : [];
  const other = open
    .filter((r) => r.id !== headline?.id)
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 4);
  const hiddenCount = open.length - important.length - other.length;

  const status = engagement.podNumber === 0 ? "Onboarding" : "Active";
  const tier = isRetainer ? "CE retainer" : bucketDef?.label ?? "Bucket";
  const pod = engagement.podNumber === 0 ? "Unassigned" : `Pod ${engagement.podNumber}`;

  return (
    <Card className="mb-5 p-6 md:p-7">
      {/* Header — monochrome brand mark + name */}
      <div className="flex items-center gap-3 mb-6">
        <span className="size-8 shrink-0 inline-flex items-center justify-center rounded-md border border-border bg-surface-raised font-mono text-xs font-semibold text-muted">
          {monogram(engagement.brand)}
        </span>
        <h1 className="font-heading text-xl font-medium tracking-tight text-foreground">
          {engagement.brand}
        </h1>
      </div>

      {/* Label/value grid — THE unit */}
      <Fields className="gap-x-12 gap-y-4">
        <Field label="Status" value={status} />
        <Field label="Tier" value={tier} />
        <Field
          label="Revenue"
          value={
            <>
              {engagement.retainer}
              {isRetainer && <span className="text-subtle"> /mo</span>}
            </>
          }
        />
        <Field label="Pod" value={pod} align="right" className="ml-auto" />
      </Fields>

      <div className="h-px bg-border my-6" />

      {/* Requests */}
      <div className="flex items-baseline gap-2 text-base font-medium text-foreground mb-1">
        Requests
        <span className="font-mono text-sm tabular-nums text-muted">{open.length}</span>
      </div>

      {open.length === 0 ? (
        <p className="mt-3 text-sm text-subtle">Nothing open right now.</p>
      ) : (
        <>
          {important.length > 0 && (
            <RequestSection label="Important">
              {important.map((r) => (
                <RequestRow key={r.id} req={r} currentDay={currentDay} headline />
              ))}
            </RequestSection>
          )}
          {other.length > 0 && (
            <RequestSection label="Other">
              {other.map((r) => (
                <RequestRow key={r.id} req={r} currentDay={currentDay} />
              ))}
            </RequestSection>
          )}
          {hiddenCount > 0 && (
            <p className="mt-3 text-xs text-subtle">+{hiddenCount} more in the delivery plan below</p>
          )}
        </>
      )}
    </Card>
  );
}

/** Eyebrow label with a trailing hairline. */
function RequestSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-4">
      <div className="flex items-center gap-3 mb-2 text-xs text-subtle">
        <span>{label}</span>
        <span className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

function RequestRow({
  req,
  currentDay,
  headline = false,
}: {
  req: Request;
  currentDay: number;
  headline?: boolean;
}) {
  const blocked = req.status === "blocked";
  const overdue = req.status !== "done" && req.dueDay < currentDay;

  // Only the headline row may carry colour: blocked → red glyph (the colour
  // event); overdue-not-blocked → monochrome glyph + a single amber ▲. Every
  // other row coerces blocked to a monochrome shape so grey stays grey.
  const glyph: Status = blocked ? (headline ? "blocked" : "in_progress") : req.status;
  const showAmber = headline && overdue && !blocked;

  return (
    <div className="flex items-center gap-3 py-1.5 text-sm text-foreground">
      <StatusGlyph status={glyph} />
      <span className="truncate">{req.name}</span>
      <span className="ml-auto flex items-center gap-2.5">
        {showAmber && <span className="text-warning text-[11px] leading-none">▲</span>}
        <span className="font-mono text-xs tabular-nums text-subtle">
          {ageLabel(req.dueDay, currentDay)}
        </span>
      </span>
    </div>
  );
}
