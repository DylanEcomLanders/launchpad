"use client";

/* PREVIEW PAGE - not wired to real data.
 *
 * Demonstrates three proposed changes to the pods/clients area:
 *   1. Strategist as a first-class pod member, with their work surfaced
 *      so designers and devs can see what's coming.
 *   2. Deliverable view that groups strategy/design/dev work together
 *      instead of three independent task rows.
 *   3. Strategic docs section per client with an internal view and a
 *      branded client-share view (toggle, same data).
 *
 * Mock data only. No real Pod/Client/Task records are read or written.
 * Once the shape is approved, integration plan goes against the real
 * pods-v2 surfaces (large files, separate task).
 */

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  EyeIcon,
  LockClosedIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

// ─── Mock types (strategist would be added to real PodMemberRole) ───
type Discipline = "strategy" | "design" | "development";
type SliceStatus =
  | "not_started"
  | "queued"
  | "in_progress"
  | "in_review"
  | "done";

interface MockMember {
  id: string;
  name: string;
  role: string;
  isStrategist?: boolean;
}

interface DisciplineSlice {
  discipline: Discipline;
  status: SliceStatus;
  owner?: string;
  due?: string;
  note?: string;
}

interface MockDeliverable {
  id: string;
  title: string;
  type: "Test" | "Page" | "Sequence" | "Asset";
  target_ship: string;
  slices: DisciplineSlice[];
}

interface MockDoc {
  id: string;
  title: string;
  type: "Positioning" | "Audit" | "Roadmap" | "Monthly review" | "Kickoff";
  visibility: "internal" | "client_shared";
  uploaded_at: string;
  uploaded_by: string;
  size: string;
}

// ─── Mock data ───────────────────────────────────────────────────────

const POD = {
  name: "Pod 2",
  tagline: "Sarah's pod",
};

const MEMBERS: MockMember[] = [
  { id: "m1", name: "Dan Forsyth", role: "CRO lead" },
  { id: "m2", name: "Maya Lin", role: "Strategist", isStrategist: true },
  { id: "m3", name: "Sarah Chen", role: "Primary designer" },
  { id: "m4", name: "Tom Park", role: "Secondary designer" },
  { id: "m5", name: "Ben Adams", role: "Primary dev" },
  { id: "m6", name: "Lily Rao", role: "Secondary dev" },
];

const CLIENT = {
  name: "Hydrant",
  retainer: "8k retainer",
  pod: "Pod 2",
};

const DELIVERABLES: MockDeliverable[] = [
  {
    id: "d1",
    title: "PDP test, whitening strips variant",
    type: "Test",
    target_ship: "Thu 30 May",
    slices: [
      {
        discipline: "strategy",
        status: "done",
        owner: "Maya Lin",
        note: "Hypothesis: lead with whitening results, not ingredients. 3 angles drafted, picked angle B.",
      },
      {
        discipline: "design",
        status: "in_progress",
        owner: "Sarah Chen",
        due: "Fri 24 May",
      },
      {
        discipline: "development",
        status: "queued",
        owner: "Ben Adams",
      },
    ],
  },
  {
    id: "d2",
    title: "Homepage Q3 refresh",
    type: "Page",
    target_ship: "Thu 13 Jun",
    slices: [
      {
        discipline: "strategy",
        status: "in_review",
        owner: "Maya Lin",
        note: "Strategy doc ready, pending Dan signoff on positioning shift.",
      },
      { discipline: "design", status: "not_started", owner: "Sarah Chen" },
      { discipline: "development", status: "not_started", owner: "Ben Adams" },
    ],
  },
  {
    id: "d3",
    title: "Welcome email sequence",
    type: "Sequence",
    target_ship: "Thu 6 Jun",
    slices: [
      {
        discipline: "strategy",
        status: "in_progress",
        owner: "Maya Lin",
        due: "Wed 22 May",
      },
      { discipline: "design", status: "not_started" },
      { discipline: "development", status: "not_started" },
    ],
  },
];

const DOCS: MockDoc[] = [
  {
    id: "doc1",
    title: "Hydrant, positioning brief Q2",
    type: "Positioning",
    visibility: "client_shared",
    uploaded_at: "12 May",
    uploaded_by: "Maya Lin",
    size: "2.4 MB",
  },
  {
    id: "doc2",
    title: "Conversion audit, May findings",
    type: "Audit",
    visibility: "client_shared",
    uploaded_at: "8 May",
    uploaded_by: "Maya Lin",
    size: "1.8 MB",
  },
  {
    id: "doc3",
    title: "Q3 strategic roadmap (internal working draft)",
    type: "Roadmap",
    visibility: "internal",
    uploaded_at: "5 May",
    uploaded_by: "Maya Lin",
    size: "0.9 MB",
  },
  {
    id: "doc4",
    title: "April monthly review",
    type: "Monthly review",
    visibility: "client_shared",
    uploaded_at: "30 Apr",
    uploaded_by: "Maya Lin",
    size: "3.1 MB",
  },
];

// ─── Visual helpers ──────────────────────────────────────────────────

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  strategy: "Strategy",
  design: "Design",
  development: "Dev",
};

const DISCIPLINE_ACCENT: Record<Discipline, string> = {
  strategy: "border-violet-200 bg-violet-50 text-violet-700",
  design: "border-blue-200 bg-blue-50 text-blue-700",
  development: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const STATUS_LABEL: Record<SliceStatus, string> = {
  not_started: "Not started",
  queued: "Queued",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

const STATUS_CLASS: Record<SliceStatus, string> = {
  not_started: "bg-surface-raised text-subtle border-border",
  queued: "bg-surface-raised text-subtle border-border",
  in_progress: "bg-info/10 text-info border-info/20",
  in_review: "bg-warning/10 text-warning border-warning/20",
  done: "bg-success/10 text-success border-success/20",
};

function initials(name: string) {
  const parts = name.split(" ");
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function MemberAvatar({ name, isStrategist }: { name: string; isStrategist?: boolean }) {
  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
        isStrategist
          ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300"
          : "bg-surface-raised text-muted"
      }`}
      title={name}
    >
      {initials(name).toUpperCase()}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function StrategistDeliverablesPreview() {
  const [docsView, setDocsView] = useState<"internal" | "client_shared">(
    "internal",
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-medium text-foreground">
          Strategist + deliverables preview
        </h1>
        <p className="mt-1 text-sm text-subtle">
          Three changes shown together: strategist as a pod member, deliverables
          grouping strategy/design/dev, and per-client strategic docs with a
          branded client share.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
          <SparklesIcon className="h-3.5 w-3.5" />
          Preview only, mock data, not wired to Supabase.
        </div>
      </div>

      {/* ─── Section A: Pod with strategist ─────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          eyebrow="01 Pod composition"
          title="Strategist as a pod member"
          sub="Pods get a strategist alongside existing roles. The strategist's work in flight surfaces on the pod so designers/devs see what's coming, not just what's open."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {/* Pod card */}
          <div className="md:col-span-2 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {POD.name}
                </h2>
                <p className="text-xs text-subtle">{POD.tagline}</p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                6 members
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {MEMBERS.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-2.5 rounded-lg border p-2 ${
                    m.isStrategist
                      ? "border-violet-200 bg-violet-50/40"
                      : "border-border bg-surface"
                  }`}
                >
                  <MemberAvatar name={m.name} isStrategist={m.isStrategist} />
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-sm font-medium text-foreground">
                      {m.name}
                    </div>
                    <div className="truncate text-[11px] text-subtle">
                      {m.role}
                      {m.isStrategist && (
                        <span className="ml-1 rounded border border-violet-200 bg-violet-100 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-violet-800">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategist work in flight */}
          <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-violet-700" />
              <h3 className="text-sm font-semibold text-violet-900">
                Strategist work in flight
              </h3>
            </div>
            <p className="mb-3 text-[11px] text-violet-900/70">
              What Maya is working on right now, across clients in this pod.
              Designers see this so they know what's about to land on them.
            </p>
            <ul className="space-y-2">
              <FlightItem
                client="Hydrant"
                title="Welcome email sequence, strategy"
                status="in_progress"
                due="Wed 22 May"
              />
              <FlightItem
                client="Hydrant"
                title="Homepage Q3 refresh, positioning shift"
                status="in_review"
                due="Awaiting Dan"
              />
              <FlightItem
                client="Loop Earplugs"
                title="Bundle PDP angles"
                status="queued"
                due="Starts Mon 27 May"
              />
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Section B: Deliverable view ────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          eyebrow="02 Deliverable view"
          title="One deliverable, three disciplines"
          sub="Today a single piece of work becomes three independent tasks. This groups them so the deliverable is the unit, and discipline progress is visible at a glance."
        />

        <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-baseline justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {CLIENT.name}
              </h2>
              <p className="text-[11px] text-subtle">
                {CLIENT.retainer} · {CLIENT.pod} · {DELIVERABLES.length} deliverables in flight
              </p>
            </div>
            <button className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted hover:border-muted">
              <PlusIcon className="h-3.5 w-3.5" />
              New deliverable
            </button>
          </div>

          <div className="space-y-3">
            {DELIVERABLES.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section C: Strategic docs ──────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          eyebrow="03 Strategic docs"
          title="Per-client docs with a branded client share"
          sub="Strategist uploads here. Internal docs stay internal. Client-shared docs render in a branded wrapper the client can open."
        />

        <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
          {/* Toggle */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4 text-subtle" />
              <span className="text-sm font-semibold text-foreground">
                {CLIENT.name} · Strategic docs
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-surface-raised p-0.5">
              <ToggleButton
                active={docsView === "internal"}
                onClick={() => setDocsView("internal")}
                icon={<LockClosedIcon className="h-3.5 w-3.5" />}
                label="Internal view"
              />
              <ToggleButton
                active={docsView === "client_shared"}
                onClick={() => setDocsView("client_shared")}
                icon={<EyeIcon className="h-3.5 w-3.5" />}
                label="Client share preview"
              />
            </div>
          </div>

          {docsView === "internal" ? (
            <InternalDocsView />
          ) : (
            <ClientShareView />
          )}
        </div>
      </section>

      {/* Footer note */}
      <div className="mt-10 rounded-lg border border-border bg-background p-4 text-xs text-subtle">
        <p className="font-semibold uppercase tracking-wider text-foreground">
          What this preview is not
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Not wired to real Supabase data. No reads/writes happen here.</li>
          <li>
            PodMemberRole hasn't been changed yet, strategist is shown via local
            mock type. Promoting to the real enum is a separate change.
          </li>
          <li>
            Deliverable here is a visual grouping, not a new DB entity. Real
            integration uses existing Project + Task.discipline.
          </li>
          <li>
            Branded share is a layout mock. Real version needs an upload
            pipeline and a public share route.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-subtle">{sub}</p>
    </div>
  );
}

function FlightItem({
  client,
  title,
  status,
  due,
}: {
  client: string;
  title: string;
  status: SliceStatus;
  due: string;
}) {
  return (
    <li className="rounded-lg border border-violet-200/60 bg-surface p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
          {client}
        </span>
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="mt-1 text-[12px] font-medium leading-snug text-foreground">
        {title}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-subtle">
        <ClockIcon className="h-3 w-3" />
        {due}
      </div>
    </li>
  );
}

function DeliverableCard({ deliverable }: { deliverable: MockDeliverable }) {
  const allDone = deliverable.slices.every((s) => s.status === "done");
  return (
    <div
      className={`rounded-lg border p-3 ${
        allDone ? "border-success/20 bg-success/10" : "border-border bg-surface"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {deliverable.type}
            </span>
            <h3 className="truncate text-sm font-semibold text-foreground">
              {deliverable.title}
            </h3>
          </div>
        </div>
        <div className="text-right text-[11px] text-subtle">
          <div className="font-medium text-foreground">
            Ships {deliverable.target_ship}
          </div>
        </div>
      </div>

      {/* Discipline row */}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        {deliverable.slices.map((slice) => (
          <SliceCell key={slice.discipline} slice={slice} />
        ))}
      </div>
    </div>
  );
}

function SliceCell({ slice }: { slice: DisciplineSlice }) {
  return (
    <div className="rounded-md border border-border bg-surface p-2.5">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${DISCIPLINE_ACCENT[slice.discipline]}`}
        >
          {DISCIPLINE_LABEL[slice.discipline]}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[slice.status]}`}
        >
          {slice.status === "done" && (
            <CheckCircleIcon className="h-3 w-3" />
          )}
          {STATUS_LABEL[slice.status]}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-muted">
        {slice.owner ? (
          <div className="flex items-center gap-1">
            <UserCircleIcon className="h-3.5 w-3.5 text-subtle" />
            <span>{slice.owner}</span>
            {slice.due && (
              <span className="ml-auto text-subtle">{slice.due}</span>
            )}
          </div>
        ) : (
          <span className="italic text-subtle">Unassigned</span>
        )}
      </div>
      {slice.note && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-subtle">
          {slice.note}
        </p>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "bg-surface text-foreground shadow-sm"
          : "text-subtle hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DocTypePill({ type }: { type: MockDoc["type"] }) {
  const colorMap: Record<MockDoc["type"], string> = {
    Positioning: "border-violet-200 bg-violet-50 text-violet-700",
    Audit: "border-blue-200 bg-blue-50 text-blue-700",
    Roadmap: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Monthly review": "border-amber-200 bg-amber-50 text-amber-800",
    Kickoff: "border-border bg-surface-raised text-muted",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorMap[type]}`}
    >
      {type}
    </span>
  );
}

function InternalDocsView() {
  return (
    <div className="p-4">
      {/* Upload affordance */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed border-muted bg-background px-3 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <DocumentArrowUpIcon className="h-4 w-4 text-subtle" />
          Drop a PDF, doc, or paste a Notion link
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background hover:opacity-90">
          <PlusIcon className="h-3.5 w-3.5" />
          Upload doc
        </button>
      </div>

      <div className="space-y-2">
        {DOCS.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <DocumentTextIcon className="h-5 w-5 shrink-0 text-subtle" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {doc.title}
                </span>
                <DocTypePill type={doc.type} />
                {doc.visibility === "internal" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-subtle">
                    <LockClosedIcon className="h-3 w-3" />
                    Internal
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-success/20 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                    <EyeIcon className="h-3 w-3" />
                    Client-shared
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-subtle">
                Uploaded {doc.uploaded_at} by {doc.uploaded_by} · {doc.size}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                title="Edit"
                className="rounded p-1.5 text-subtle hover:bg-surface-raised hover:text-foreground"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                title="Download"
                className="rounded p-1.5 text-subtle hover:bg-surface-raised hover:text-foreground"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientShareView() {
  const sharedDocs = DOCS.filter((d) => d.visibility === "client_shared");
  return (
    <div className="bg-background p-4">
      {/* Branded wrapper preview */}
      <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        {/* Branded header */}
        <div className="bg-gradient-to-br from-[#0F1115] to-[#1F2430] px-6 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Ecom Landers · Strategic deliverables
              </div>
              <div className="mt-1 text-2xl font-medium">{CLIENT.name}</div>
              <div className="mt-0.5 text-xs text-white/60">
                Strategist: Maya Lin
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-surface/10 text-sm font-semibold text-white">
              EL
            </div>
          </div>
        </div>

        {/* Doc list */}
        <div className="p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Shared with you
            </h3>
            <span className="text-[11px] text-subtle">
              {sharedDocs.length} documents
            </span>
          </div>

          <div className="space-y-2.5">
            {sharedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-muted"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-raised text-muted">
                  <DocumentTextIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {doc.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-subtle">
                    <DocTypePill type={doc.type} />
                    <span>{doc.size}</span>
                    <span>·</span>
                    <span>Shared {doc.uploaded_at}</span>
                  </div>
                </div>
                <button className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-muted">
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-[11px] text-subtle">
              <PaperAirplaneIcon className="h-3.5 w-3.5" />
              Questions? Reply to Maya at maya@ecomlanders.com
            </div>
          </div>
        </div>

        {/* Branded footer */}
        <div className="border-t border-border bg-background px-5 py-3 text-center text-[10px] uppercase tracking-[0.16em] text-subtle">
          Ecom Landers · Conversion Partnership
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-subtle">
        Preview of what the client sees. Internal-only docs are hidden.
      </p>
    </div>
  );
}
