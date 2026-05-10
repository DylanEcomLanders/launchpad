/* POST /api/agents/[agentId]/run
 *
 * Per-agent dispatch:
 *   - agents with runner: "real" → run their tool-use loop
 *   - any other → fall back to the v0.5 mock response
 *
 * Auth: requires a `launchpad-role` cookie (admin or cro). The cookie is
 * set by AuthGate when the user authenticates. team-role users and
 * unauthenticated callers are rejected with 401.
 *
 * Persists an AgentTask record around the run for the Tasks tab + Recent
 * Activity feed. Status flips (IDLE → WORKING → previous) drive the
 * sprite swap and the "Working" indicator.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { NAMED_AGENTS } from "@/lib/agents/types";
import type { Agent, AgentStatus, AgentTask } from "@/lib/agents/types";
import { runFelix } from "@/lib/agents/runners/felix";

export const maxDuration = 60;

const STUB_DELAY_MS = 1500;

function seedAgent(id: string): Agent | null {
  const seed = NAMED_AGENTS.find((a) => a.id === id);
  if (!seed) return null;
  const now = new Date().toISOString();
  return { ...seed, createdAt: now, updatedAt: now };
}

async function loadAgent(id: string): Promise<Agent | null> {
  if (!isSupabaseConfigured()) return seedAgent(id);
  const { data, error } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();
  if (error || !data) return seedAgent(id);
  return { ...(data.data as object), id: data.id as string } as Agent;
}

async function persistTask(task: AgentTask) {
  if (!isSupabaseConfigured()) return;
  const { id, ...rest } = task;
  try {
    await supabase.from("agent_tasks").upsert({
      id,
      data: rest,
      created_at: task.startedAt,
    });
  } catch {
    /* table missing — task lives only in the response payload for now */
  }
}

/** Flip status with a workingSince timestamp so the reaper can detect
 * stuck WORKING records (process killed mid-run). When restoring, we
 * pass back the previous status — usually IDLE but could be BLOCKED. */
async function flipAgentStatus(
  agent: Agent,
  status: AgentStatus,
  opts: { workingSince?: string | null } = {}
) {
  if (!isSupabaseConfigured()) return;
  try {
    const next: Agent = {
      ...agent,
      status,
      workingSince: opts.workingSince ?? null,
      updatedAt: new Date().toISOString(),
    };
    const { id, ...rest } = next;
    await supabase.from("agents").upsert({
      id,
      data: rest,
      created_at: agent.createdAt,
    });
  } catch {
    /* swallowed — visual nice-to-have, not load-bearing */
  }
}

/** Server-side auth check. Reads the launchpad-role cookie set by
 * AuthGate. Anyone without the cookie (or with role=team) is rejected
 * — internal-only, but stops accidental URL-sharing fires that could
 * rack up Anthropic charges. */
function authedRole(req: NextRequest): "admin" | "cro" | null {
  const role = req.cookies.get("launchpad-role")?.value;
  if (role === "admin" || role === "cro") return role;
  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ agentId: string }> }) {
  try {
    const role = authedRole(req);
    if (!role) {
      return NextResponse.json(
        { error: "Unauthorized — admin or cro role required" },
        { status: 401 }
      );
    }

    const { agentId } = await ctx.params;
    const body = await req.json();
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    const triggeredBy = typeof body?.triggeredBy === "string" ? body.triggeredBy : `role:${role}`;

    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const history: Array<{ role: "user" | "agent"; text: string }> = rawHistory
      .filter((t: unknown): t is { role: string; text: string } =>
        typeof t === "object" && t !== null
        && typeof (t as Record<string, unknown>).role === "string"
        && typeof (t as Record<string, unknown>).text === "string"
      )
      .map((t: { role: string; text: string }) => ({
        role: t.role === "agent" ? "agent" : "user",
        text: t.text,
      }));

    if (!input) {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }

    const agent = await loadAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const taskId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const running: AgentTask = {
      id: taskId,
      agentId,
      input,
      output: "",
      status: "RUNNING",
      startedAt,
      completedAt: null,
      triggeredBy,
    };
    await persistTask(running);

    /* Capture the previous status so we can restore it on completion
     * rather than hardcoding IDLE — fixes the audit bug where a BLOCKED
     * agent would reset to IDLE after a chat run. */
    const previousStatus: AgentStatus = agent.status;
    const shouldFlip = previousStatus !== "OFFLINE";
    if (shouldFlip) {
      await flipAgentStatus(agent, "WORKING", { workingSince: startedAt });
    }

    let output: string;
    let toolCalls: AgentTask["toolCalls"] = [];
    let failed = false;
    let errorMsg: string | undefined;

    try {
      if (agent.runner === "real" && agentId === "felix") {
        const result = await runFelix({ agent, input, history, triggeredBy, source: "chat" });
        output = result.output || "(Felix returned no text — check the tool calls in the task record.)";
        toolCalls = result.toolCalls.map((c) => ({
          name: c.name,
          input: c.input,
          result: truncatedResult(c.result),
        }));
      } else {
        await new Promise((r) => setTimeout(r, STUB_DELAY_MS));
        output = mockResponse(agent, input);
      }
    } catch (err) {
      failed = true;
      errorMsg = err instanceof Error ? err.message : String(err);
      output = `Felix hit an error: ${errorMsg}. Check ANTHROPIC_API_KEY, SLACK_TOKEN/SLACK_BOT_TOKEN, and the Supabase tables.`;
    }

    const completed: AgentTask = {
      ...running,
      output,
      status: failed ? "FAILED" : "COMPLETE",
      completedAt: new Date().toISOString(),
      toolCalls,
    };
    await persistTask(completed);

    // Restore the captured pre-run status, NOT a hardcoded IDLE. Clears
    // workingSince so the reaper doesn't flag this as stuck.
    if (shouldFlip) {
      await flipAgentStatus(agent, previousStatus, { workingSince: null });
    }

    return NextResponse.json({
      task: completed,
      output,
      toolCallCount: toolCalls?.length ?? 0,
      toolCalls,
      previousStatus,
      error: errorMsg,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function mockResponse(agent: Agent, input: string): string {
  return `Mock response from ${agent.name}: I would handle "${input}" by drawing on my role as ${agent.role.toLowerCase()} and the tools I have access to (${agent.tools.join(", ") || "none yet"}). Wire me to the Anthropic API like Felix and you'll get the real answer.`;
}

/** Cap a tool result's serialised size so AgentTask rows stay sane and
 * the chat UI doesn't choke rendering a 50KB JSON dump. The runtime +
 * server logs still have the full payload — this is purely for the
 * persisted summary that ships back to the UI. */
function truncatedResult(result: unknown): unknown {
  const MAX_BYTES = 6_000;
  try {
    const json = JSON.stringify(result);
    if (json.length <= MAX_BYTES) return result;
    return {
      __truncated: true,
      preview: json.slice(0, MAX_BYTES),
      original_size_bytes: json.length,
    };
  } catch {
    return { __truncated: true, error: "result not JSON-serialisable" };
  }
}
