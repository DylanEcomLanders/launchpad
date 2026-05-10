/* ── Anthropic tool-use runner ──
 *
 * Reusable agent runtime: hands a system prompt + tool list to Claude,
 * runs the tool_use loop until end_turn, returns the final text output.
 *
 * Used by:
 *  - /api/agents/[agentId]/run (chat-tab Q&A)
 *  - /api/cron/felix-digest (the daily digest job)
 *
 * Designed to be agent-agnostic — Felix is the first user but the same
 * runner powers Echo, Wren, etc. when they get wired up. Tool definitions
 * live in src/lib/agents/tools/, and per-agent runners (src/lib/agents/runners/)
 * pick which subset to expose.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AgentTool, ToolContext } from "./tools/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

/** Map the human-friendly model alias stored on the Agent record to the
 * dated SDK model name. Unknown aliases fall through unchanged so a future
 * model can be set on the Agent without a code change. */
const MODEL_ALIASES: Record<string, string> = {
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
};
function resolveModel(alias: string): string {
  return MODEL_ALIASES[alias] ?? alias;
}

/* Cap per-tool-result size before stuffing into the messages array Claude
 * sees. A runaway tool returning 50KB+ of data would otherwise blow our
 * token budget and might confuse the model. The persisted summary in the
 * AgentTask record is capped separately (smaller) — this cap only governs
 * what the model sees during a single run. */
const TOOL_RESULT_MAX_BYTES = 24_000;

function capForModel(result: unknown): string {
  let json: string;
  try {
    json = JSON.stringify(result);
  } catch {
    return JSON.stringify({ error: "tool result not JSON-serialisable" });
  }
  if (json.length <= TOOL_RESULT_MAX_BYTES) return json;
  return JSON.stringify({
    __truncated: true,
    note: `Tool result was ${json.length} bytes; first ${TOOL_RESULT_MAX_BYTES} shown. Refine your input (e.g. lower limit, narrower query) for full data.`,
    preview: json.slice(0, TOOL_RESULT_MAX_BYTES),
  });
}

/* Anthropic rejects messages arrays with consecutive same-role turns. A
 * malformed history (corrupted localStorage, bad caller) could otherwise
 * 400 the entire run. Defensive collapse: merge consecutive same-role
 * text messages, dropping anything that doesn't fit. Tool-use turns are
 * always assistant + tool_result is always user, so they alternate
 * naturally — this only ever runs against the prefix history. */
function normaliseHistory(
  history: Array<{ role: "user" | "agent"; text: string }> | undefined
): Anthropic.MessageParam[] {
  if (!history || history.length === 0) return [];
  const out: Array<{ role: "user" | "assistant"; text: string }> = [];
  for (const turn of history) {
    if (!turn.text.trim()) continue;
    const role: "user" | "assistant" = turn.role === "agent" ? "assistant" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.text = `${last.text}\n\n${turn.text}`;
    } else {
      out.push({ role, text: turn.text });
    }
  }
  return out.map(({ role, text }) => ({ role, content: text }));
}

export interface RunAgentParams {
  systemPrompt: string;
  tools: AgentTool[];
  /** Model alias from the Agent record (e.g. "claude-sonnet-4-5"). */
  model: string;
  /** The user's latest message. Gets appended after `history`. */
  input: string;
  /** Prior turns of this conversation (oldest first). Stitched into the
   * Anthropic messages array before `input` so follow-ups have context.
   * Caller is responsible for capping the window — runner trusts whatever
   * is passed in. Pass undefined or [] for a fresh thread. */
  history?: Array<{ role: "user" | "agent"; text: string }>;
  context: ToolContext;
  /** Hard cap on tool-use round-trips. Felix typically settles in 2-4. */
  maxIterations?: number;
  /** Optional cap on output tokens per Claude call. */
  maxTokens?: number;
}

export interface RunAgentResult {
  /** The final assistant text — what gets shown to the user / posted to Slack. */
  output: string;
  /** Every tool call made during this run. Useful for the Tasks tab and
   * for post-mortem on weird answers. */
  toolCalls: Array<{ name: string; input: unknown; result: unknown }>;
  /** Number of model round-trips (1 = no tool use, ≥2 = at least one tool). */
  iterations: number;
  /** Final stop_reason from Claude. "end_turn" is the happy path. */
  stopReason: string | null;
  /** Set when the loop exited because it hit maxIterations rather than
   * end_turn. Indicates Claude was likely stuck in a tool-use loop. */
  hitMaxIterations?: boolean;
}

export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const {
    systemPrompt,
    tools,
    model,
    input,
    history,
    context,
    maxIterations = 8,
    maxTokens = 2048,
  } = params;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const toolsByName = new Map(tools.map((t) => [t.name, t]));
  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
  }));

  const messages: Anthropic.MessageParam[] = [
    ...normaliseHistory(history),
    { role: "user", content: input },
  ];

  const toolCalls: RunAgentResult["toolCalls"] = [];
  let stopReason: string | null = null;
  let finalText = "";
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const response = await anthropic.messages.create({
      model: resolveModel(model),
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      messages,
    });

    stopReason = response.stop_reason;

    const textBlocks = response.content.filter((b) => b.type === "text");
    if (textBlocks.length > 0) {
      finalText = textBlocks
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("\n")
        .trim();
    }

    if (stopReason !== "tool_use") break;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (toolUses.length === 0) break;

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (use) => {
        const tool = toolsByName.get(use.name);
        if (!tool) {
          const err = `Unknown tool: ${use.name}`;
          toolCalls.push({ name: use.name, input: use.input, result: { error: err } });
          return {
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify({ error: err }),
            is_error: true,
          };
        }
        try {
          // input_schema gates this at the API level; the cast is a known
          // type-safety hole that's hard to plug without losing tool generic
          // independence. Documented as audit issue #8.
          const result = await tool.execute(use.input as never, context);
          toolCalls.push({ name: use.name, input: use.input, result });
          return {
            type: "tool_result",
            tool_use_id: use.id,
            content: capForModel(result),
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toolCalls.push({ name: use.name, input: use.input, result: { error: msg } });
          return {
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify({ error: msg }),
            is_error: true,
          };
        }
      })
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  const hitMaxIterations = iteration >= maxIterations && stopReason === "tool_use";
  if (hitMaxIterations) {
    // Surface in server logs so we can spot agents stuck in tool loops.
    // The result object also carries this flag for downstream UI.
    console.warn(
      `[agent-runner] maxIterations (${maxIterations}) reached without end_turn. ` +
      `Last stop_reason: ${stopReason}. Tool calls: ${toolCalls.length}.`
    );
  }

  return { output: finalText, toolCalls, iterations: iteration, stopReason, hitMaxIterations };
}
