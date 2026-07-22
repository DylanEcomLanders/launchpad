/* ── Pod Projects: template skeletons ──
 *
 * The two spines from the "Pod 1 Projects" Google Doc, rebuilt as a navigable
 * SECTION TREE — each entry is a tab the editor isolates. Reports fans out into
 * weekly child tabs; the one-time audit gets its own tab. Structure is carried
 * by the tree, so a section's body no longer needs its own top heading.
 *
 * Placeholder copy is wrapped in <em> so it reads as "fill me in" prompts.
 */

import type { DocType, DocSection, TestRow, TestStatus } from "./types";

/** Status vocabulary for the structured Test Results grid. */
export const TEST_STATUSES: { value: TestStatus; label: string; tone: string }[] = [
  { value: "backlog", label: "Backlog", tone: "text-subtle" },
  { value: "running", label: "Running", tone: "text-status-approaching" },
  { value: "won", label: "Won", tone: "text-status-ontrack" },
  { value: "lost", label: "Lost", tone: "text-status-late" },
  { value: "flat", label: "Flat", tone: "text-muted" },
];
export const statusLabel = (s: TestStatus) => TEST_STATUSES.find((x) => x.value === s)?.label ?? s;

/** HTML mirror of the results rows, so the Client PDF (which reads body HTML)
 *  renders the grid without knowing about the structured model. */
export function resultsRowsToHtml(rows: TestRow[]): string {
  const head = `<tr><th><p>Test</p></th><th><p>Hypothesis</p></th><th><p>Metric</p></th><th><p>Uplift</p></th><th><p>Status</p></th></tr>`;
  const body = rows
    .map(
      (r) =>
        `<tr><td><p>${r.test || ""}</p></td><td><p>${r.hypothesis || ""}</p></td><td><p>${r.metric || ""}</p></td><td><p>${r.uplift || ""}</p></td><td><p>${statusLabel(r.status)}</p></td></tr>`,
    )
    .join("");
  return `<table>${head}${body}</table>`;
}

function cell(text: string, header = false): string {
  const tag = header ? "th" : "td";
  return `<${tag}><p>${text}</p></${tag}>`;
}

/** A TipTap task list (interactive checkboxes). */
function checklist(items: Array<string | { label: string; checked: boolean }>): string {
  const li = items
    .map((it) => {
      const { label, checked } = typeof it === "string" ? { label: it, checked: false } : it;
      return `<li data-type="taskItem" data-checked="${checked}"><p>${label}</p></li>`;
    })
    .join("");
  return `<ul data-type="taskList">${li}</ul>`;
}

const ONBOARDING_ITEMS = [
  "Deposit invoice sent",
  "Onboarding call booked",
  "Brand assets received",
  "Store / platform access granted",
  "Analytics access (GA4)",
  "Kickoff scheduled",
];

const onboardingBody = `<p>Client setup — tick each off as it's done.</p>
${checklist(ONBOARDING_ITEMS)}`;

/** Header row + N empty body rows for a table, from a column list. */
function table(cols: string[], rows = 3): string {
  const head = `<tr>${cols.map((c) => cell(c, true)).join("")}</tr>`;
  const empty = `<tr>${cols.map(() => cell("<em>…</em>")).join("")}</tr>`;
  return `<table>${head}${empty.repeat(rows)}</table>`;
}

const MILESTONE_TABLE = table(["Milestone", "Owner", "Target", "Status"]);
const KPI_TABLE = table(["KPI", "Baseline", "Target", "Source"]);
const ICE_TABLE = table(["Test", "Owner", "Impact", "Confidence", "Ease", "Status"], 4);
// Weekly movement — the numbers that moved this week.
const MOVEMENT_TABLE = table(["Metric", "Prev", "Now", "Δ"], 3);

const overviewBody = (typeLabel: string) => `<table>
  <tr>${cell("Primary objective", true)}${cell("<em>What winning looks like…</em>")}</tr>
  <tr>${cell("Engagement", true)}${cell(`<em>${typeLabel}</em>`)}</tr>
  <tr>${cell("Onboarding form", true)}${cell("<em>Link…</em>")}</tr>
  <tr>${cell("Start date", true)}${cell("<em>…</em>")}</tr>
  <tr>${cell("Resources", true)}${cell("<em>Brand assets, drive, logins…</em>")}</tr>
</table>
<h3>Key deliverables</h3>
<ul><li><em>…</em></li></ul>`;

/* A single page-brief block — the Strategy Brief page holds one per client page
 * being briefed; the editor's "Add page brief" appends more. */
export const BRIEF_BLOCK = `<h3>Page: <em>e.g. Homepage</em></h3>
<p><strong>Objective:</strong> <em>The one outcome this page drives…</em></p>
<p><strong>Brief:</strong> <em>What we're doing and why…</em></p>
<p><strong>Deliverables:</strong></p>
<ul><li><em>…</em></li></ul>
<p><strong>Notes / links:</strong> <em>…</em></p>`;

const strategyBriefBody = `<p><em>One brief per client page you're working on — add as many as you need.</em></p>
${BRIEF_BLOCK}`;

const roadmapBody = `<p><strong>Kickoff:</strong> <em>Date</em> &nbsp;·&nbsp; <strong>Deadline:</strong> <em>Date</em></p>
${MILESTONE_TABLE}`;

const baselineBody = `<p><strong>Recorded:</strong> <em>Date</em> &nbsp;·&nbsp; <strong>Source(s):</strong> <em>GA4, Shopify…</em></p>
${KPI_TABLE}`;

const weekReportBody = `<p><strong>Focus:</strong> <em>What we prioritised this week…</em></p>
<p><strong>Shipped:</strong></p>
<ul><li><em>…</em></li></ul>
<p><strong>Movement:</strong></p>
${MOVEMENT_TABLE}
<p><strong>Next week:</strong> <em>…</em></p>
<p><strong>Report link:</strong> <em>…</em></p>`;

const monthRollupBody = `<p><strong>Executive summary:</strong> <em>…</em></p>
<p><strong>Metric highlights:</strong></p>
${MOVEMENT_TABLE}
<p><strong>What we accomplished:</strong> <em>…</em></p>
<p><strong>What we're doing next:</strong> <em>…</em></p>
<p><strong>Blockers / client needs:</strong> <em>…</em></p>`;

const auditBody = `<p><strong>Audit date:</strong> <em>…</em></p>
<p><strong>Identified revenue leaks:</strong></p>
<ul><li><em>…</em></li></ul>
<p><strong>Hypothesis / reasoning:</strong> <em>…</em></p>
<p><strong>Conversion quick wins:</strong></p>
<ul><li><em>…</em></li></ul>
<p><strong>Long-term growth recommendations:</strong></p>
<ul><li><em>…</em></li></ul>
<p><strong>Proposed next steps:</strong></p>
${table(["Next step", "Owner", "Due"])}`;

/** The measurement/testing group — baseline, results, ICE together. */
function performanceGroup(): DocSection {
  return {
    id: "performance",
    title: "Performance",
    body: "",
    children: [
      { id: "baseline-metrics", title: "Baseline Metrics", body: baselineBody },
      { id: "test-results", title: "Test Results", kind: "results", rows: [], body: "" },
      { id: "ice", title: "ICE Test Velocity", body: ICE_TABLE },
    ],
  };
}

function retainerSections(): DocSection[] {
  return [
    { id: "overview", title: "Overview", body: overviewBody("Core retainer") },
    { id: "notes", title: "Updates", kind: "journal", entries: [], body: "" },
    { id: "onboarding", title: "Must Haves", body: onboardingBody },
    {
      id: "first-week-wins",
      title: "First Week Wins",
      body: "",
      children: [
        { id: "first-week-wins/strategy-brief", title: "Strategy Brief", body: strategyBriefBody },
        { id: "first-week-wins/roadmap", title: "30-Day Roadmap", body: roadmapBody },
      ],
    },
    performanceGroup(),
    {
      id: "reports",
      title: "Reports",
      body: "",
      children: [
        { id: "reports/week-1", title: "Week 1", body: weekReportBody },
        { id: "reports/week-2", title: "Week 2", body: weekReportBody },
        { id: "reports/week-3", title: "Week 3", body: weekReportBody },
        { id: "reports/month-1", title: "Month 1 rollup", body: monthRollupBody },
      ],
    },
  ];
}

function projectSections(): DocSection[] {
  return [
    { id: "overview", title: "Overview", body: overviewBody("One-time project") },
    { id: "notes", title: "Updates", kind: "journal", entries: [], body: "" },
    { id: "onboarding", title: "Must Haves", body: onboardingBody },
    {
      id: "first-week-wins",
      title: "First Week Wins",
      body: "",
      children: [
        { id: "first-week-wins/strategy-brief", title: "Strategy Brief", body: strategyBriefBody },
        { id: "first-week-wins/audit", title: "Next-Step Audit", body: auditBody },
      ],
    },
    performanceGroup(),
    {
      id: "reports",
      title: "Reports",
      body: "",
      children: [
        { id: "reports/week-1", title: "Week 1", body: weekReportBody },
        { id: "reports/week-2", title: "Week 2", body: weekReportBody },
      ],
    },
  ];
}

/** Seed section tree for a fresh doc of the given type. */
export function templateSections(type: DocType): DocSection[] {
  return type === "retainer" ? retainerSections() : projectSections();
}

/** Flatten a section tree to a lookup list (depth-first). */
export function flattenSections(sections: DocSection[]): DocSection[] {
  const out: DocSection[] = [];
  for (const s of sections) {
    out.push(s);
    if (s.children) out.push(...flattenSections(s.children));
  }
  return out;
}

/** The first section that actually holds a body — the sensible landing tab. */
export function firstLeaf(sections: DocSection[]): DocSection | null {
  for (const s of flattenSections(sections)) {
    if (s.body !== "" || !s.children) return s;
  }
  return sections[0] ?? null;
}
