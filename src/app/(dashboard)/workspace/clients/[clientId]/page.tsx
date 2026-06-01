"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import { useCurrentUser } from "@/components/auth-gate";
import {
  buildAllClientVMs,
  LANE_LABEL,
  formatDue,
  type ClientVM,
  type DeliverableVM,
  type Lane,
} from "@/lib/workspace/derive";
import { callTest } from "@/lib/pods-v2/calc";
import {
  addStrategyDeliverable,
  setDeliverableBriefDecision,
  approveDesign,
  unapproveDesign,
  updateTaskStatus,
  updateClientLifecycle,
  updateClientBrief,
  createTest,
  updateTest,
  deleteTest,
  assignParkedClientToPod,
  recomputeProjectBucket,
} from "@/lib/pods-v2/data";
import type { EngagementKind } from "@/lib/pods-v2/types";
import {
  PAGE_LABEL,
  PAGE_DEFAULT_WEIGHT,
  type ClientBrief,
  type PageType,
  type PageWeight,
  type Pod,
  type PodTest,
  type TestStatus,
  type Project,
  type TaskDiscipline,
} from "@/lib/pods-v2/types";
import {
  listResourcesForClient,
  createResource,
  removeResource,
} from "@/lib/strategy/data";
import type { StrategyResource } from "@/lib/strategy/types";
import {
  Card,
  Pill,
  HealthDot,
  OwnerChip,
  DeadlinePill,
  SectionTitle,
  EmptyState,
  ProgressBar,
  LaneTag,
  Checkbox,
  InlineAdd,
  type Tone,
} from "@/lib/workspace/ui";

const DELIVERY_LANES: Lane[] = ["design", "development"];

// Selectable page types for the strategy deliverable adder, grouped loosely.
const PAGE_OPTIONS: PageType[] = [
  "pdp",
  "homepage",
  "quiz",
  "advertorial",
  "listicle",
  "collection",
  "cart",
  "about",
  "faq",
  "policies",
  "navigation",
  "account",
  "contact",
];

export default function WorkspaceClientDetail() {
  const params = useParams();
  const clientId = String(params.clientId);
  const data = useWorkspaceData();
  const me = useCurrentUser();
  const today = todayYMD();

  const vm = useMemo(() => {
    const all = buildAllClientVMs({
      clients: data.clients,
      projects: data.projects,
      tasks: data.tasks,
      tests: data.tests,
      pods: data.pods,
      todayYMD: today,
    });
    return all.find((c) => c.client.id === clientId) ?? null;
  }, [data, today, clientId]);

  const pod = useMemo(
    () => data.pods.find((p) => p.id === vm?.podId) ?? null,
    [data.pods, vm?.podId],
  );
  // Every test for this client (not just live) for the tracker.
  const clientTests = useMemo(
    () => data.tests.filter((t) => t.client_id === clientId),
    [data.tests, clientId],
  );
  const clientProjects = useMemo(
    () => data.projects.filter((p) => p.client_id === clientId),
    [data.projects, clientId],
  );

  if (data.loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }
  if (!vm) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState>Client not found.</EmptyState>
      </div>
    );
  }

  const c = vm.client;
  // Parked = no pod assigned, or assigned but no project yet. Either way the
  // strategy/delivery surfaces have nothing to write to.
  const isParked = !c.pod_id || clientProjects.length === 0;

  return (
    <div className="space-y-8">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <HealthDot band={vm.band} />
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
              {c.name}
            </h1>
            {c.brand_warm && <Pill tone="amber">Brand-warm</Pill>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link
              href={`/workspace/pods/${vm.podId}`}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              {vm.podName}
            </Link>
            <span>·</span>
            <Pill tone={vm.kind === "retainer" ? "blue" : "neutral"}>
              {vm.kind === "retainer" ? "Retainer" : "Sprint"}
            </Pill>
            {vm.windowLabel && (
              <>
                <span>·</span>
                <span>{vm.windowLabel}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          {vm.day != null && (
            <div className="font-heading text-lg font-semibold text-slate-900">
              Day {vm.day}
              <span className="text-sm font-normal text-slate-400">/90</span>
            </div>
          )}
          {vm.nextDeadline && (
            <div className="mt-1 text-xs text-slate-500">
              Next:{" "}
              <span className="font-medium text-slate-700">
                {formatDue(vm.nextDeadline.dueDate)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Objective — front and centre, editable */}
      <ObjectiveCard
        clientId={clientId}
        value={c.strategy_thesis ?? ""}
        onSaved={data.reload}
      />

      {/* Client brief — the 14-field intake, collapsible + editable */}
      <BriefPanel clientId={clientId} brief={c.brief ?? {}} onSaved={data.reload} />

      {isParked ? (
        /* Parked client (from onboarding, no pod yet): the one action that
         * unblocks everything else. Until assigned, the strategy/delivery
         * surfaces have no project to write to, so we show this instead. */
        <AssignPodPanel
          clientId={clientId}
          clientName={c.name}
          pods={data.pods}
          defaultKind={vm.kind}
          onAssigned={data.reload}
        />
      ) : (
        <>
          {/* Accountability summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="At risk" value={vm.atRiskCount} tone={vm.atRiskCount ? "red" : "green"} />
            <MiniStat label="Open" value={vm.openCount} tone="neutral" />
            <MiniStat
              label="Awaiting client"
              value={vm.awaitingClient}
              tone={vm.awaitingClient ? "amber" : "green"}
            />
            <MiniStat
              label="Live tests"
              value={vm.liveTests.length}
              tone={vm.liveTests.length ? "violet" : "neutral"}
            />
          </div>

          {/* Strategy: the place deliverables are ADDED, plus docs + tests */}
          <StrategySection
            clientId={clientId}
            vm={vm}
            pod={pod}
            projects={clientProjects}
            tests={clientTests}
            addedBy={me?.name ?? "Strategist"}
            onChanged={data.reload}
          />

          {/* Delivery kanban: design + dev (editable, approval-gated) */}
          <section>
            <SectionTitle>Delivery</SectionTitle>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {DELIVERY_LANES.map((lane) => (
                <LaneColumn key={lane} lane={lane} vm={vm} onChanged={data.reload} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Notes */}
      <section>
        <SectionTitle>Recent notes</SectionTitle>
        <Card className="divide-y divide-slate-100">
          {(c.notes ?? []).length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">No notes yet.</div>
          ) : (
            (c.notes ?? []).slice(0, 6).map((n) => (
              <div key={n.id} className="px-5 py-3">
                <p className="text-sm text-slate-700">{n.content}</p>
                <div className="mt-1 text-xs text-slate-400">
                  {n.author ? `${n.author} · ` : ""}
                  {new Date(n.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

// ─── Objective ──────────────────────────────────────────────────────

function ObjectiveCard({
  clientId,
  value,
  onSaved,
}: {
  clientId: string;
  value: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(value), [value]);

  async function save() {
    setBusy(true);
    try {
      updateClientLifecycle(clientId, { strategy_thesis: draft.trim() });
      await new Promise((r) => setTimeout(r, 50));
      onSaved();
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Objective
        </span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Edit
          </button>
        )}
      </div>
      <div className="p-5">
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="The core bet for this brand — what we believe will move conversion, and why."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-slate-400"
            />
            <div className="flex items-center gap-2">
              <button
                disabled={busy}
                onClick={save}
                className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save objective"}
              </button>
              <button
                onClick={() => {
                  setDraft(value);
                  setEditing(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : value ? (
          <p className="text-base leading-relaxed text-slate-800">{value}</p>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm italic text-slate-400 hover:text-slate-600"
          >
            No objective set yet. Click to define the engagement&apos;s core bet.
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Client brief (14-field intake) ─────────────────────────────────

const BRIEF_FIELDS: { key: keyof ClientBrief; label: string; long?: boolean }[] = [
  { key: "websiteUrl", label: "Website" },
  { key: "shopifyUrl", label: "Shopify URL" },
  { key: "primaryContact", label: "Primary contact" },
  { key: "timezone", label: "Timezone" },
  { key: "primaryGoal", label: "Primary goal", long: true },
  { key: "successMetric", label: "Success metric" },
  { key: "timelineExpectation", label: "Timeline expectation" },
  { key: "toneOfVoice", label: "Tone of voice" },
  { key: "wordsToAvoid", label: "Words to avoid" },
  { key: "usps", label: "USPs", long: true },
  { key: "valueProps", label: "Value props", long: true },
  { key: "targetCustomer", label: "Target customer", long: true },
  { key: "competitors", label: "Competitors", long: true },
  { key: "challenges", label: "Challenges", long: true },
  { key: "notes", label: "Notes", long: true },
];

function BriefPanel({
  clientId,
  brief,
  onSaved,
}: {
  clientId: string;
  brief: ClientBrief;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClientBrief>(brief);
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(brief), [brief]);

  const filledCount = BRIEF_FIELDS.filter((f) => (brief[f.key] ?? "").toString().trim()).length;

  async function save() {
    setBusy(true);
    try {
      updateClientBrief(clientId, draft);
      await new Promise((r) => setTimeout(r, 50));
      onSaved();
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Client brief
          </span>
          <span className="text-xs text-slate-400">
            {filledCount}/{BRIEF_FIELDS.length} filled
          </span>
        </div>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5">
          {!editing && (
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Edit brief
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
            {BRIEF_FIELDS.map((f) => {
              const val = (draft[f.key] ?? "").toString();
              return (
                <div key={f.key} className={f.long ? "md:col-span-2" : ""}>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {f.label}
                  </div>
                  {editing ? (
                    f.long ? (
                      <textarea
                        value={val}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400"
                      />
                    ) : (
                      <input
                        value={val}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400"
                      />
                    )
                  ) : val ? (
                    <p className="text-sm leading-relaxed text-slate-700">{val}</p>
                  ) : (
                    <p className="text-sm italic text-slate-300">Not set</p>
                  )}
                </div>
              );
            })}
          </div>
          {editing && (
            <div className="mt-4 flex items-center gap-2">
              <button
                disabled={busy}
                onClick={save}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save brief"}
              </button>
              <button
                onClick={() => {
                  setDraft(brief);
                  setEditing(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Assign to pod (parked client) ──────────────────────────────────

function AssignPodPanel({
  clientId,
  clientName,
  pods,
  defaultKind,
  onAssigned,
}: {
  clientId: string;
  clientName: string;
  pods: Pod[];
  defaultKind: EngagementKind;
  onAssigned: () => void;
}) {
  const [podId, setPodId] = useState(pods[0]?.id ?? "");
  const [kind, setKind] = useState<EngagementKind>(defaultKind);
  const [busy, setBusy] = useState(false);

  async function assign() {
    if (!podId) return;
    setBusy(true);
    try {
      assignParkedClientToPod({ clientId, podId, engagementKind: kind });
      await new Promise((r) => setTimeout(r, 60));
      onAssigned();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-amber-50/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <h2 className="font-heading text-sm font-semibold text-slate-900">
            Not assigned yet
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {clientName} came in from onboarding. Assign a pod to start delivery —
          this creates the engagement so you can add deliverables in Strategy.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Pod
          </span>
          <select
            value={podId}
            onChange={(e) => setPodId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.tagline ? ` · ${p.tagline}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Engagement type
          </span>
          <div className="flex gap-2">
            {(["retainer", "sprint"] as EngagementKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                  kind === k
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={busy || !podId}
          onClick={assign}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Assigning…" : "Assign to pod"}
        </button>
      </div>
    </Card>
  );
}

// ─── Strategy section (deliverable adder + docs + tests) ────────────

function pickAssignee(pod: Pod | null, discipline: TaskDiscipline): string {
  if (!pod) return "";
  const roles: Record<TaskDiscipline, string[]> = {
    design: ["primary_designer", "secondary_designer"],
    development: ["primary_dev", "secondary_dev"],
    strategy: ["cro_lead"],
  };
  for (const role of roles[discipline]) {
    const m = pod.members.find((mm) => mm.role === role && !mm.is_placeholder);
    if (m) return m.id;
  }
  return pod.members[0]?.id ?? "";
}

function StrategySection({
  clientId,
  vm,
  pod,
  projects,
  tests,
  addedBy,
  onChanged,
}: {
  clientId: string;
  vm: ClientVM;
  pod: Pod | null;
  projects: Project[];
  tests: PodTest[];
  addedBy: string;
  onChanged: () => void;
}) {
  const [resources, setResources] = useState<StrategyResource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [testModal, setTestModal] = useState<PodTest | "new" | null>(null);

  // Deliverable adder form (Alister: just page + weight, then save).
  const [adding, setAdding] = useState(false);
  const [pageType, setPageType] = useState<PageType>("pdp");
  const [weight, setWeight] = useState<PageWeight>(PAGE_DEFAULT_WEIGHT.pdp);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const r = await listResourcesForClient(clientId);
    setResources(r);
    setLoaded(true);
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const docs = resources.filter((r) => r.category !== "brief");

  // Existing design deliverables, so we can show the brief state per page.
  const designDeliverables = vm.deliverables.filter((d) => d.lane === "design");

  // Alister: enter a deliverable; it saves with brief decision PENDING.
  async function addDeliverable() {
    const project = projects[0];
    if (!project) return;
    setBusy(true);
    try {
      addStrategyDeliverable({
        project_id: project.id,
        deliverable_type: pageType,
        weight,
        designer_id: pickAssignee(pod, "design"),
        dev_id: pickAssignee(pod, "development"),
        // needs_brief omitted = pending; Aanchal rules afterwards.
      });
      // Keep the project bucket (and dev turnaround) in step with its scope.
      recomputeProjectBucket(project.id);
      await new Promise((r) => setTimeout(r, 60));
      setAdding(false);
      setPageType("pdp");
      setWeight(PAGE_DEFAULT_WEIGHT.pdp);
      refresh();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  // Aanchal: rule on the brief for a saved deliverable.
  async function ruleBrief(designId: string, needsBrief: boolean, page: string, url?: string) {
    setDeliverableBriefDecision(designId, needsBrief);
    if (needsBrief && url && url.trim()) {
      await createResource({
        client_id: clientId,
        title: `${page} brief`,
        kind: "link",
        url: url.trim(),
        category: "brief",
        page_label: page,
        added_by: addedBy,
      });
    }
    await new Promise((r) => setTimeout(r, 60));
    refresh();
    onChanged();
  }

  async function addDoc(title: string, url?: string) {
    await createResource({
      client_id: clientId,
      title,
      kind: "link",
      url,
      category: "doc",
      added_by: addedBy,
    });
    refresh();
  }
  async function remove(id: string) {
    await removeResource(id);
    refresh();
  }

  const briefsByPage = new Map(
    resources.filter((r) => r.category === "brief").map((b) => [b.page_label ?? b.title, b]),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-violet-50/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
          <h2 className="font-heading text-sm font-semibold text-slate-900">Strategy</h2>
          <span className="text-xs text-slate-400">where deliverables start</span>
        </div>
        <span className="text-xs text-slate-500">
          {designDeliverables.length} deliverable{designDeliverables.length === 1 ? "" : "s"} ·{" "}
          {docs.length} doc{docs.length === 1 ? "" : "s"} · {tests.length} test
          {tests.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-5">
        {/* Deliverable adder */}
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Deliverables
        </div>

        {projects.length === 0 ? (
          <EmptyState>No project yet — create one to add deliverables.</EmptyState>
        ) : (
          <>
            <div className="space-y-2">
              {designDeliverables.length === 0 ? (
                <EmptyState>No deliverables yet. Add the first below.</EmptyState>
              ) : (
                designDeliverables.map((d) => {
                  const page = d.title.replace(/^Design - /, "");
                  const brief = briefsByPage.get(page);
                  return (
                    <DeliverableBriefRow
                      key={d.id}
                      d={d}
                      page={page}
                      brief={brief}
                      onRule={(needsBrief, url) => ruleBrief(d.id, needsBrief, page, url)}
                    />
                  );
                })
              )}
            </div>

            {adding ? (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Page
                    </span>
                    <select
                      value={pageType}
                      onChange={(e) => {
                        const pt = e.target.value as PageType;
                        setPageType(pt);
                        setWeight(PAGE_DEFAULT_WEIGHT[pt]);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      {PAGE_OPTIONS.map((pt) => (
                        <option key={pt} value={pt}>
                          {PAGE_LABEL[pt]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Weight
                    </span>
                    <select
                      value={weight}
                      onChange={(e) => setWeight(e.target.value as PageWeight)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="heavy">Heavy</option>
                      <option value="medium">Medium</option>
                      <option value="light">Light</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={busy}
                    onClick={addDeliverable}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {busy ? "Adding..." : "Add deliverable"}
                  </button>
                  <button
                    onClick={() => setAdding(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                  <span className="ml-auto text-[11px] text-slate-400">
                    Strategist sets the brief after
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="mt-3 w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
              >
                + Add deliverable
              </button>
            )}
          </>
        )}

        {/* Strategist docs */}
        <div className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-slate-400">
          Strategist docs
        </div>
        <div className="space-y-2">
          {!loaded ? (
            <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          ) : docs.length === 0 ? (
            <EmptyState>No docs uploaded yet.</EmptyState>
          ) : (
            docs.map((d) => <ResourceRow key={d.id} r={d} onRemove={() => remove(d.id)} />)
          )}
          <InlineAdd
            placeholder="Doc title (e.g. CRO audit, Loom walkthrough)"
            secondaryPlaceholder="Link (Google Doc, Loom, Figma...)"
            ctaLabel="+ Add strategist doc"
            addLabel="Add doc"
            onAdd={addDoc}
          />
        </div>
      </div>

      {/* Tests tracker */}
      <div className="border-t border-slate-100 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Tests
          </span>
          <button
            onClick={() => setTestModal("new")}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            + Add test
          </button>
        </div>
        {tests.length === 0 ? (
          <EmptyState>No tests tracked yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {tests.map((t) => (
              <TestRow key={t.id} test={t} onClick={() => setTestModal(t)} />
            ))}
          </div>
        )}
      </div>

      {testModal && (
        <TestModal
          clientId={clientId}
          podId={vm.podId}
          existing={testModal === "new" ? null : testModal}
          onClose={() => setTestModal(null)}
          onSaved={() => {
            setTestModal(null);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}

// A saved deliverable row in the strategy area. Alister created it; this is
// where Aanchal rules on the brief. Three states:
//   pending (needsBrief === undefined): show "Attach brief" / "No brief needed"
//   needs brief, no link: amber "Needs brief" + an Attach action
//   brief attached / no brief: settled label
function DeliverableBriefRow({
  d,
  page,
  brief,
  onRule,
}: {
  d: DeliverableVM;
  page: string;
  brief?: StrategyResource;
  onRule: (needsBrief: boolean, url?: string) => void;
}) {
  const [attaching, setAttaching] = useState(false);
  const [url, setUrl] = useState("");
  const pending = d.needsBrief === undefined;

  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-800">{page}</div>
          <div className="mt-0.5 text-xs">
            {pending ? (
              <span className="text-slate-400">Awaiting brief decision</span>
            ) : d.needsBrief === false ? (
              <span className="text-slate-400">No brief needed</span>
            ) : brief ? (
              brief.url ? (
                <a
                  href={brief.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:underline"
                >
                  Brief attached
                </a>
              ) : (
                <span className="text-emerald-600">Brief attached</span>
              )
            ) : (
              <span className="font-medium text-amber-600">Needs brief</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Aanchal's two buttons while the decision is pending */}
          {pending && !attaching && (
            <>
              <button
                onClick={() => setAttaching(true)}
                className="rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-700"
              >
                Attach brief
              </button>
              <button
                onClick={() => onRule(false)}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300"
              >
                No brief needed
              </button>
            </>
          )}
          {/* If brief is needed but not yet linked, allow attaching a link */}
          {!pending && d.needsBrief === true && !brief && !attaching && (
            <button
              onClick={() => setAttaching(true)}
              className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
            >
              Attach link
            </button>
          )}
          <DeadlinePill state={d.state} daysToDue={d.daysToDue} />
        </div>
      </div>

      {/* Inline link entry when attaching a brief */}
      {attaching && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRule(true, url);
                setAttaching(false);
              }
              if (e.key === "Escape") setAttaching(false);
            }}
            placeholder="Brief link (Google Doc, Figma...) — optional"
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
          />
          <button
            onClick={() => {
              onRule(true, url);
              setAttaching(false);
            }}
            className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-700"
          >
            Save
          </button>
          <button
            onClick={() => setAttaching(false)}
            className="text-[11px] text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ResourceRow({ r, onRemove }: { r: StrategyResource; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-800">{r.title}</div>
        {r.url && (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-600 hover:underline"
          >
            Open
          </a>
        )}
      </div>
      <button onClick={onRemove} className="shrink-0 text-xs text-slate-300 hover:text-rose-500">
        Remove
      </button>
    </div>
  );
}

// Simplified status surface for the lightweight tracker.
const TEST_STATUS_META: Record<TestStatus, { label: string; tone: Tone }> = {
  setup: { label: "Scheduled", tone: "neutral" },
  live: { label: "Live", tone: "violet" },
  analysing: { label: "Analysing", tone: "amber" },
  won: { label: "Winner", tone: "green" },
  lost: { label: "Loser", tone: "red" },
  inconclusive: { label: "Inconclusive", tone: "amber" },
  archived: { label: "Archived", tone: "neutral" },
};

function TestRow({ test, onClick }: { test: PodTest; onClick: () => void }) {
  const meta = TEST_STATUS_META[test.status];
  // Only show the recommended call for in-flight tests.
  const showCall = test.status === "live" || test.status === "analysing";
  const call = showCall ? callTest(test) : null;
  return (
    <div className="rounded-xl border border-slate-100 transition-colors hover:border-slate-300">
      <button
        onClick={onClick}
        className="w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-slate-800">{test.name}</span>
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {test.primary_metric && <span>{test.primary_metric}</span>}
          {test.confidence != null && <span className="tabular-nums">{test.confidence}% conf</span>}
          {test.lift_pct != null && (
            <span
              className={`tabular-nums font-medium ${
                test.lift_pct >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {test.lift_pct >= 0 ? "+" : ""}
              {test.lift_pct}%
            </span>
          )}
          {call && <span className="font-medium text-slate-600">· {call.action}</span>}
        </div>
      </button>
      {test.link && (
        <div className="border-t border-slate-50 px-3 py-1.5">
          <a
            href={test.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-sky-600 hover:underline"
          >
            Open test ↗
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Test modal (create / edit a lightweight test) ──────────────────

// The lightweight form maps onto the richer PodTest model. "Complete" splits
// into won/lost/inconclusive based on the chosen result.
type SimpleStatus = "scheduled" | "live" | "complete";

function podStatusToSimple(s: TestStatus): { status: SimpleStatus; result: "won" | "lost" | "inconclusive" | "" } {
  if (s === "setup") return { status: "scheduled", result: "" };
  if (s === "live" || s === "analysing") return { status: "live", result: "" };
  if (s === "won") return { status: "complete", result: "won" };
  if (s === "lost") return { status: "complete", result: "lost" };
  return { status: "complete", result: "inconclusive" };
}

function TestModal({
  clientId,
  podId,
  existing,
  onClose,
  onSaved,
}: {
  clientId: string;
  podId: string;
  existing: PodTest | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = existing ? podStatusToSimple(existing.status) : { status: "scheduled" as SimpleStatus, result: "" as const };
  const [name, setName] = useState(existing?.name ?? "");
  const [metric, setMetric] = useState(existing?.primary_metric ?? "");
  const [status, setStatus] = useState<SimpleStatus>(seed.status);
  const [result, setResult] = useState<"won" | "lost" | "inconclusive" | "">(seed.result);
  const [lift, setLift] = useState(existing?.lift_pct != null ? String(existing.lift_pct) : "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [notes, setNotes] = useState(existing?.hypothesis ?? "");
  const [busy, setBusy] = useState(false);

  function resolveStatus(): TestStatus {
    if (status === "scheduled") return "setup";
    if (status === "live") return "live";
    return result === "won" ? "won" : result === "lost" ? "lost" : "inconclusive";
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const liftNum = lift.trim() === "" ? undefined : Number(lift);
      const podStatus = resolveStatus();
      if (existing) {
        updateTest(existing.id, {
          name: name.trim(),
          primary_metric: metric.trim(),
          status: podStatus,
          lift_pct: liftNum,
          link: link.trim() || undefined,
          hypothesis: notes.trim(),
        });
      } else {
        createTest({
          name: name.trim(),
          client_id: clientId,
          pod_id: podId,
          hypothesis: notes.trim(),
          link: link.trim() || undefined,
          status: podStatus,
          confidence: null,
          days_running: 0,
          min_runtime_days: 14,
          primary_metric: metric.trim(),
          guardrails: [],
          variant: "A/B",
          traffic: "50/50",
          tool: "Intelligems",
          sample_target_pct: 0,
          lift_pct: liftNum,
        });
      }
      await new Promise((r) => setTimeout(r, 60));
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!existing) return;
    setBusy(true);
    try {
      deleteTest(existing.id);
      await new Promise((r) => setTimeout(r, 60));
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-base font-semibold text-slate-900">
            {existing ? "Edit test" : "New test"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <ModalField label="Test name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PDP scarcity badge"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </ModalField>

          <ModalField label="Primary metric">
            <input
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="e.g. Add-to-cart rate"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </ModalField>

          <ModalField label="Status">
            <div className="flex gap-2">
              {(["scheduled", "live", "complete"] as SimpleStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                    status === s
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </ModalField>

          {status === "complete" && (
            <ModalField label="Result">
              <div className="flex gap-2">
                {(["won", "lost", "inconclusive"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResult(r)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      result === r
                        ? r === "won"
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : r === "lost"
                            ? "border-rose-500 bg-rose-500 text-white"
                            : "border-amber-500 bg-amber-500 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {r === "won" ? "Winner" : r === "lost" ? "Loser" : "Inconclusive"}
                  </button>
                ))}
              </div>
            </ModalField>
          )}

          {(status === "live" || status === "complete") && (
            <ModalField label="Lift % (optional)">
              <input
                value={lift}
                onChange={(e) => setLift(e.target.value)}
                placeholder="e.g. 11.4 or -3"
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </ModalField>
          )}

          <ModalField label="Test link (optional)">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Intelligems / Visually / results doc URL"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </ModalField>

          <ModalField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="What we're testing and why"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </ModalField>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            disabled={busy || !name.trim()}
            onClick={save}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : existing ? "Save changes" : "Add test"}
          </button>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
            Cancel
          </button>
          {existing && (
            <button
              onClick={del}
              disabled={busy}
              className="ml-auto text-xs text-slate-300 hover:text-rose-500"
            >
              Delete test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── Delivery lane (design / dev) ───────────────────────────────────

function LaneColumn({
  lane,
  vm,
  onChanged,
}: {
  lane: Lane;
  vm: ClientVM;
  onChanged: () => void;
}) {
  const summary = vm.lanes[lane];
  const items = vm.deliverables
    .filter((d) => d.lane === lane)
    .sort((a, b) => {
      if ((a.status === "done") !== (b.status === "done")) {
        return a.status === "done" ? 1 : -1;
      }
      return a.dueDate.localeCompare(b.dueDate);
    });

  async function toggle(d: DeliverableVM) {
    updateTaskStatus(d.id, d.status === "done" ? "todo" : "done");
    await new Promise((r) => setTimeout(r, 50));
    onChanged();
  }

  async function approve(d: DeliverableVM) {
    approveDesign(d.id);
    await new Promise((r) => setTimeout(r, 50));
    onChanged();
  }
  async function unapprove(d: DeliverableVM) {
    unapproveDesign(d.id);
    await new Promise((r) => setTimeout(r, 50));
    onChanged();
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <LaneTag lane={lane} label={LANE_LABEL[lane]} />
        <span className="text-xs text-slate-400">
          {summary.done}/{summary.total}
        </span>
      </div>
      <div className="px-4 pt-3">
        <ProgressBar
          value={summary.done}
          max={summary.total || 1}
          tone={summary.atRisk > 0 ? "amber" : "green"}
        />
      </div>
      <div className="flex-1 divide-y divide-slate-50 px-1 py-2">
        {items.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-300">
            Added from Strategy above.
          </div>
        ) : (
          items.map((d) => (
            <DeliverableRow
              key={d.id}
              d={d}
              lane={lane}
              onToggle={() => toggle(d)}
              onApprove={() => approve(d)}
              onUnapprove={() => unapprove(d)}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function DeliverableRow({
  d,
  lane,
  onToggle,
  onApprove,
  onUnapprove,
}: {
  d: DeliverableVM;
  lane: Lane;
  onToggle: () => void;
  onApprove: () => void;
  onUnapprove: () => void;
}) {
  const done = d.status === "done";
  const isDesign = lane === "design";
  const isDev = lane === "development";

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 ${done ? "opacity-60" : ""}`}>
      <div className="pt-0.5">
        <Checkbox checked={done} onChange={onToggle} title="Toggle done" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-sm ${
              done ? "text-slate-500 line-through" : "font-medium text-slate-800"
            }`}
          >
            {d.title}
          </span>
          {!done && <DeadlinePill state={d.state} daysToDue={d.daysToDue} />}
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <OwnerChip name={d.ownerName} avatarUrl={d.ownerAvatar} size="xs" />
          <span className="text-[11px] text-slate-400">
            {d.state === "awaiting_approval"
              ? "dev starts on approval"
              : d.waitingOn
                ? `waiting · ${d.waitingOn}`
                : formatDue(d.dueDate)}
          </span>
        </div>

        {/* Brief flag on design tasks that still need one */}
        {isDesign && !done && d.needsBrief && (
          <div className="mt-1 text-[11px] font-medium text-amber-600">Needs brief</div>
        )}

        {/* Client-approval control on design tasks */}
        {isDesign && (
          <div className="mt-2">
            {d.designApprovedAt ? (
              <div className="flex items-center gap-2 text-[11px] text-emerald-600">
                <span>✓ Client approved {formatDue(d.designApprovedAt)}</span>
                <button
                  onClick={onUnapprove}
                  className="text-slate-300 hover:text-slate-500"
                >
                  undo
                </button>
              </div>
            ) : (
              <button
                onClick={onApprove}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Mark client approved → start dev clock
              </button>
            )}
          </div>
        )}

        {/* Dev task awaiting-approval hint */}
        {isDev && d.state === "awaiting_approval" && (
          <div className="mt-1 text-[11px] text-sky-600">
            Clock starts when the paired design is approved
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Tone;
}) {
  const dot =
    tone === "red"
      ? "bg-rose-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "violet"
          ? "bg-violet-500"
          : tone === "green"
            ? "bg-emerald-500"
            : "bg-slate-300";
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-1 font-heading text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </Card>
  );
}

function BackLink() {
  return (
    <Link
      href="/workspace/clients"
      className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
    >
      ← All clients
    </Link>
  );
}
