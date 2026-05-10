/* ── Felix runner ──
 *
 * Felix's specific run logic: composes his system prompt from the stored
 * agent record (so Config-tab edits actually take effect), attaches the
 * memory file + live context, resolves his tool list, and delegates to
 * the shared Anthropic runner.
 *
 * Powers two surfaces:
 *  - Chat-tab Q&A via /api/agents/[agentId]/run (source: "chat")
 *  - Daily digest via /api/cron/felix-digest      (source: "cron")
 */

import { runAgent, type RunAgentResult } from "../anthropic-runner";
import { resolveTools } from "../tools";
import { NAMED_AGENTS, type Agent } from "../types";
import { FELIX_MEMORY } from "../memory/felix";

export interface ConversationTurn {
  role: "user" | "agent";
  text: string;
}

export interface RunFelixParams {
  /** The stored agent record (from Supabase / fallback to seed). Used
   * for systemPrompt, model, and tool list — so Config-tab edits propagate
   * to execution rather than only updating the display. If omitted, we
   * fall back to the in-code seed (NAMED_AGENTS), useful for cron paths
   * that don't want to round-trip the DB. */
  agent?: Agent;
  input: string;
  triggeredBy: string;
  source: "chat" | "cron" | "test";
  history?: ConversationTurn[];
  /** Override the model from the agent record. Falls back to the agent's
   * stored model, then to the seed default. */
  model?: string;
}

const FELIX_SEED = NAMED_AGENTS.find((a) => a.id === "felix")!;

/** Returns the static parts of Felix's system prompt — the seed prompt
 * shipped in code. Exported so the Config-tab "Reset to default" button
 * can repopulate the field with the canonical text. */
export function felixSeedSystemPrompt(): string {
  return FELIX_SEED.systemPrompt;
}

export async function runFelix(params: RunFelixParams): Promise<RunAgentResult> {
  const { agent, input, triggeredBy, source, history, model } = params;

  // Use the stored agent record if provided so user prompt edits in the
  // Config tab actually affect Felix's behaviour. Fall back to seed.
  const definition = agent ?? FELIX_SEED;

  // Empty / too-short prompts almost certainly mean an accidental save in
  // the Config tab. Fall back to the seed rather than blowing up the run.
  const promptCore =
    definition.systemPrompt && definition.systemPrompt.trim().length > 50
      ? definition.systemPrompt
      : FELIX_SEED.systemPrompt;

  const now = new Date();
  const ukTime = now.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "full",
    timeStyle: "short",
  });

  /* System prompt is built in three sections so each can evolve independently:
   *   1. Persona + rules (from the stored record, fall through to seed)
   *   2. Memory (src/lib/agents/memory/felix.ts — Dylan-curated facts)
   *   3. Live context (time, who triggered, source) */
  const systemPrompt = [
    promptCore,
    `# Memory`,
    FELIX_MEMORY,
    `# Current context`,
    `- Time (UK): ${ukTime}`,
    `- Triggered by: ${triggeredBy}`,
    `- Source: ${source}`,
  ].join("\n\n");

  const tools = resolveTools(definition.tools);

  return runAgent({
    systemPrompt,
    tools,
    model: model ?? definition.model ?? FELIX_SEED.model,
    input,
    history,
    context: { triggeredBy, source, now },
    maxIterations: 8,
    maxTokens: 2048,
  });
}
