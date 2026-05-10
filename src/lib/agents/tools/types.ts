/* ── Agent tool types ──
 * Shared interfaces for tools that agents can call via the Anthropic
 * tool-use loop. Each tool exports an AgentTool object with a JSON-schema
 * input shape and an execute() function.
 */

export interface ToolContext {
  /** Identifier of the human (or cron) that triggered the run. Useful for
   * audit logs; tools shouldn't gate on this for v0.5. */
  triggeredBy: string;
  /** Resolved current time in the agent's frame. UK time for Felix.
   * Tools that filter on "last 24h" should use this rather than Date.now()
   * so we get deterministic behaviour in tests + cron. */
  now: Date;
  /** Surface-level reason this run was triggered. Lets tools tweak their
   * behaviour for cron vs ad-hoc Q&A (e.g. cron may want broader windows). */
  source: "chat" | "cron" | "test";
}

export interface AgentTool<TInput = Record<string, unknown>, TOutput = unknown> {
  /** Tool name as exposed to Claude. Matches the strings in
   * NAMED_AGENTS[...].tools. Anthropic restricts tool names to
   * `^[a-zA-Z0-9_-]{1,128}$`, so use underscores not dots for namespacing
   * (e.g. "launchpad_blocked_tasks", "slack_search_messages"). */
  name: string;
  /** What this tool does, when to call it, what it returns. Claude reads
   * this — keep it specific and concrete. */
  description: string;
  /** JSON Schema for the tool's input arguments. */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Run the tool. Anything thrown is caught by the runner and reported
   * back to Claude as a tool_result with is_error. */
  execute: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}
