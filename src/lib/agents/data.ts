/* ── Agent Mission Control data layer ──
 * Supabase-first with localStorage fallback (matches the rest of Launchpad).
 * Tables: `agents` and `agent_tasks`, both using the {id, data, created_at} JSONB pattern.
 */

import { createStore } from "@/lib/supabase-store";
import type { Agent, AgentTask, AgentStatus, TaskStatus } from "./types";
import { NAMED_AGENTS } from "./types";

const agentsStore = createStore<Agent>({ table: "agents",      lsKey: "launchpad-agents" });
const tasksStore  = createStore<AgentTask>({ table: "agent_tasks", lsKey: "launchpad-agent-tasks" });

// ── Agents ──

/* Single-flight promise lock so concurrent callers (e.g. StrictMode's
 * double-mount, or the index + detail page racing on first load) all
 * await the same seed operation instead of each kicking off their own
 * batch of inserts. */
let seedPromise: Promise<void> | null = null;

/** Fields that are sourced from NAMED_AGENTS in code (the agent's "definition")
 * vs fields that are owned by the runtime (status, timestamps, future
 * user-edited values). When the seed in code drifts from the stored record
 * we sync the definition fields and leave the runtime fields alone.
 *
 * NOTE: systemPrompt is included in the definition for v0.5 because users
 * haven't started editing prompts via the Config tab yet. Once that
 * becomes a real workflow, gate the systemPrompt sync behind a
 * definitionVersion bump so user edits don't get clobbered. */
type DefinitionField =
  | "name"
  | "role"
  | "description"
  | "avatarUrl"
  | "workingAvatarUrl"
  | "systemPrompt"
  | "tools";

const DEFINITION_FIELDS: DefinitionField[] = [
  "name",
  "role",
  "description",
  "avatarUrl",
  "workingAvatarUrl",
  "systemPrompt",
  "tools",
];

function definitionDrifted(stored: Agent, seed: Omit<Agent, "createdAt" | "updatedAt">): boolean {
  for (const key of DEFINITION_FIELDS) {
    if (JSON.stringify(stored[key]) !== JSON.stringify(seed[key])) return true;
  }
  return false;
}

/** Ensure the 8 named agents exist, prune anything stale, and sync any
 * agent whose stored definition has drifted from the seed in code.
 *
 * Three responsibilities:
 *   1. Prune — remove records whose id is no longer in NAMED_AGENTS
 *      (handles renames like sam→felix, archie-assistant→reuben).
 *   2. Insert — create missing agents from seed.
 *   3. Sync — update agents whose definition fields drift from seed
 *      (handles "I edited Felix's system prompt in code, need it live").
 */
export function seedAgentsIfEmpty(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const existing = await agentsStore.getAll();
    const existingById = new Map(existing.map((a) => [a.id, a]));
    const validIds = new Set(NAMED_AGENTS.map((a) => a.id));

    for (const agent of existing) {
      if (!validIds.has(agent.id)) await agentsStore.remove(agent.id);
    }

    const now = new Date().toISOString();
    for (const seed of NAMED_AGENTS) {
      const stored = existingById.get(seed.id);
      if (!stored) {
        await agentsStore.create({ ...seed, createdAt: now, updatedAt: now });
      } else if (definitionDrifted(stored, seed)) {
        const updates: Partial<Agent> = { updatedAt: now };
        for (const key of DEFINITION_FIELDS) {
          // Both Agent and the seed share these field names, so the index
          // is safe — TS just can't follow the runtime narrowing.
          (updates as Record<string, unknown>)[key] = (seed as Record<string, unknown>)[key];
        }
        await agentsStore.update(seed.id, updates);
      }
    }
  })();
  return seedPromise;
}

/** Defence-in-depth: if localStorage ever ends up with a duplicate (e.g. a
 * historical race before the lock landed), still render a clean grid. */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Reap agents stuck in WORKING — the run route flips status to WORKING
 * and back, but if the function dies between (process killed, deploy
 * mid-flight, network drop), the agent stays WORKING forever and shows
 * the wrong sprite. We mark agents stale after this many minutes and
 * reset to IDLE on next read. */
const WORKING_STALE_AFTER_MS = 5 * 60_000;

async function reapStuckWorking(agents: Agent[]): Promise<Agent[]> {
  const now = Date.now();
  const reset: Agent[] = [];
  const out = agents.map((a) => {
    if (a.status !== "WORKING") return a;
    const since = a.workingSince ? Date.parse(a.workingSince) : NaN;
    const stale = !Number.isFinite(since) || now - since > WORKING_STALE_AFTER_MS;
    if (!stale) return a;
    const next: Agent = { ...a, status: "IDLE", workingSince: null, updatedAt: new Date().toISOString() };
    reset.push(next);
    return next;
  });
  // Persist the reset asynchronously — don't block the read on it.
  for (const a of reset) {
    void agentsStore.update(a.id, { status: "IDLE", workingSince: null, updatedAt: a.updatedAt });
  }
  return out;
}

export async function getAgents(): Promise<Agent[]> {
  await seedAgentsIfEmpty();
  const all = await agentsStore.getAll();
  const reaped = await reapStuckWorking(dedupeById(all));
  return reaped.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAgent(id: string): Promise<Agent | null> {
  await seedAgentsIfEmpty();
  const stored = await agentsStore.getById(id);
  if (!stored) return null;
  const [reaped] = await reapStuckWorking([stored]);
  return reaped;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
  return agentsStore.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

// ── Tasks ──

export async function getTasksForAgent(agentId: string): Promise<AgentTask[]> {
  const all = await tasksStore.getAll();
  return all
    .filter((t) => t.agentId === agentId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getRecentTasks(limit = 10): Promise<AgentTask[]> {
  const all = await tasksStore.getAll();
  return all
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}

// (createTask + updateTask were removed — the run route persists tasks
// directly via Supabase server-side. Re-add here only if a client-side
// caller appears.)

// ── Stats helpers ──

export async function getMissionStats(): Promise<{
  online: number;
  total: number;
  running: number;
  completedToday: number;
}> {
  const [agents, tasks] = await Promise.all([getAgents(), tasksStore.getAll()]);
  const todayKey = new Date().toISOString().slice(0, 10);
  return {
    online: agents.filter((a) => a.status !== "OFFLINE").length,
    total: agents.length,
    running: tasks.filter((t) => t.status === "RUNNING").length,
    completedToday: tasks.filter(
      (t) => t.status === "COMPLETE" && (t.completedAt ?? "").slice(0, 10) === todayKey
    ).length,
  };
}

// Re-export so consumers don't need to import from two files.
export type { Agent, AgentTask, AgentStatus, TaskStatus };
