import type { ClickUpTask, OpsTask, OpsRadarData, OpsRadarSummary } from "./types";
import {
  WORKSPACE_ID,
  CLIENT_PROJECTS_FOLDER,
  CLICKUP_API_BASE,
  CACHE_TTL,
  FIELD_IDS,
  STAGE_ORDER,
  STAGE_LABELS,
  QA_GATE_MAP,
} from "./constants";

/* ── In-memory cache ── */
let cache: { data: OpsRadarData; ts: number } | null = null;

/* ── Public API ── */

/**
 * Returns processed OpsRadarData, using the in-memory cache if fresh.
 */
export async function getOpsRadarData(token: string): Promise<OpsRadarData> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const raw = await fetchAllTasks(token);
  const tasks = processTasks(raw);
  const summary = buildSummary(tasks);
  const result: OpsRadarData = {
    tasks,
    fetchedAt: new Date().toISOString(),
    summary,
  };

  cache = { data: result, ts: now };
  return result;
}

/* ── ClickUp REST fetching ── */

/**
 * Fetches all tasks from the Client Projects folder.
 * ClickUp paginates at 100 per page, so we loop.
 */
async function fetchAllTasks(token: string): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${CLICKUP_API_BASE}/team/${WORKSPACE_ID}/task`);
    url.searchParams.set("folder_ids[]", CLIENT_PROJECTS_FOLDER);
    url.searchParams.set("include_closed", "false");
    url.searchParams.set("subtasks", "true");
    url.searchParams.set("page", String(page));
    // Request custom fields and checklists
    url.searchParams.set("include_custom_fields", "true");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`ClickUp API error ${res.status}: ${errText}`);
    }

    const body = await res.json();
    const pageTasks: ClickUpTask[] = body.tasks ?? [];
    tasks.push(...pageTasks);

    // ClickUp returns fewer than 100 when there are no more pages
    hasMore = pageTasks.length >= 100;
    page++;
  }

  // Now fetch checklists for each task (ClickUp doesn't include them in bulk)
  await enrichWithChecklists(token, tasks);

  return tasks;
}

/**
 * Fetches checklists for each task individually.
 * ClickUp's task list endpoint doesn't return checklist items,
 * so we need to call the task endpoint for each.
 * We batch these to avoid rate limiting.
 */
async function enrichWithChecklists(
  token: string,
  tasks: ClickUpTask[]
): Promise<void> {
  const BATCH_SIZE = 10;

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (task) => {
        const url = `${CLICKUP_API_BASE}/task/${task.id}?include_subtasks=false&custom_task_ids=false`;
        const res = await fetch(url, {
          headers: { Authorization: token },
        });
        if (!res.ok) return;
        const detail = await res.json();
        task.checklists = detail.checklists ?? [];
      })
    );

    // Log any failures but don't crash
    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.warn(
          `[clickup] Failed to fetch checklists for task ${batch[idx].id}:`,
          r.reason
        );
      }
    });
  }
}

/* ── Data processing ── */

function getFieldValue(
  fields: ClickUpTask["custom_fields"],
  fieldId: string
): string | number | null {
  const field = fields.find((f) => f.id === fieldId);
  return field?.value ?? null;
}

function epochToISO(epoch: string | number | null): string | null {
  if (epoch === null || epoch === undefined) return null;
  const ms = typeof epoch === "string" ? parseInt(epoch, 10) : epoch;
  if (isNaN(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

function processTasks(raw: ClickUpTask[]): OpsTask[] {
  const now = new Date();

  return raw.map((t) => {
    const statusKey = t.status.status.toLowerCase();
    const stageIndex = STAGE_ORDER.findIndex((s) => s === statusKey);
    const stage = STAGE_LABELS[statusKey] ?? t.status.status;

    // Deadlines
    const designDeadlineRaw = getFieldValue(t.custom_fields, FIELD_IDS.designDeadline);
    const devDeadlineRaw = getFieldValue(t.custom_fields, FIELD_IDS.devDeadline);
    const designDeadline = epochToISO(designDeadlineRaw);
    const devDeadline = epochToISO(devDeadlineRaw);

    const designOverdue = designDeadline
      ? new Date(designDeadline) < now && stageIndex <= 1
      : false;
    const devOverdue = devDeadline
      ? new Date(devDeadline) < now && stageIndex <= 2
      : false;

    let daysOverdue = 0;
    if (designOverdue && designDeadline) {
      daysOverdue = Math.max(daysOverdue, daysBetween(new Date(designDeadline), now));
    }
    if (devOverdue && devDeadline) {
      daysOverdue = Math.max(daysOverdue, daysBetween(new Date(devDeadline), now));
    }

    // QA gate check
    const requiredGate = QA_GATE_MAP[statusKey];
    let qaViolation = false;
    let qaGateName: string | null = null;
    let blockerItems: string[] = [];

    if (requiredGate && t.checklists) {
      const gate = t.checklists.find((cl) =>
        cl.name.toLowerCase().includes(requiredGate.toLowerCase().replace(" exit criteria", "").trim())
          || cl.name.toLowerCase() === requiredGate.toLowerCase()
      );
      if (gate && gate.unresolved > 0) {
        qaViolation = true;
        qaGateName = requiredGate;
        blockerItems = gate.items
          .filter((item) => !item.resolved)
          .map((item) => item.name);
      }
    }

    // Overall QA score from all checklists
    let totalResolved = 0;
    let totalItems = 0;
    (t.checklists ?? []).forEach((cl) => {
      totalResolved += cl.resolved;
      totalItems += cl.resolved + cl.unresolved;
    });
    const qaScore = totalItems > 0 ? Math.round((totalResolved / totalItems) * 100) : 100;

    // Silent days
    const updatedAt = epochToISO(t.date_updated) ?? new Date().toISOString();
    const daysSilent = daysBetween(new Date(updatedAt), now);

    return {
      id: t.id,
      name: t.name,
      client: t.list?.name ?? "Unknown",
      stage,
      stageIndex: stageIndex >= 0 ? stageIndex : -1,
      assignees: t.assignees.map((a) => a.username),
      designDeadline,
      devDeadline,
      designOverdue,
      devOverdue,
      daysOverdue,
      qaScore,
      qaViolation,
      qaGateName,
      blockerItems,
      updatedAt,
      daysSilent,
      clickupUrl: t.url ?? `https://app.clickup.com/t/${t.id}`,
    };
  });
}

function buildSummary(tasks: OpsTask[]): OpsRadarSummary {
  const byStage: Record<string, number> = {};
  const byAssignee: Record<string, number> = {};
  let overdue = 0;
  let qaViolations = 0;
  let silentOver7Days = 0;

  for (const t of tasks) {
    // Stage counts
    byStage[t.stage] = (byStage[t.stage] ?? 0) + 1;

    // Assignee counts
    for (const a of t.assignees) {
      byAssignee[a] = (byAssignee[a] ?? 0) + 1;
    }
    if (t.assignees.length === 0) {
      byAssignee["Unassigned"] = (byAssignee["Unassigned"] ?? 0) + 1;
    }

    if (t.daysOverdue > 0) overdue++;
    if (t.qaViolation) qaViolations++;
    if (t.daysSilent > 7) silentOver7Days++;
  }

  return {
    total: tasks.length,
    overdue,
    qaViolations,
    silentOver7Days,
    byStage,
    byAssignee,
  };
}
