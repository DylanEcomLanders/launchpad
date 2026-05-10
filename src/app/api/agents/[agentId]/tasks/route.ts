/* GET /api/agents/[agentId]/tasks — task history for one agent. */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AgentTask } from "@/lib/agents/types";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await ctx.params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ tasks: [] });
    }

    const { data, error } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("data->>agentId", agentId)
      .order("created_at", { ascending: false });

    // Table missing or query failed — return empty rather than 500. Once the
    // migration runs and tasks land, this just starts returning rows.
    if (error) {
      return NextResponse.json({ tasks: [] });
    }

    const tasks: AgentTask[] = (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row.data as object),
      id: row.id as string,
    })) as AgentTask[];

    return NextResponse.json({ tasks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
