/* GET /api/agents — list all agents.
 * Server-side reads from Supabase only (no localStorage on the server).
 * Falls back to the seed list if Supabase is unconfigured so the UI still
 * has something to render in dev.
 */

import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { NAMED_AGENTS } from "@/lib/agents/types";
import type { Agent } from "@/lib/agents/types";

export async function GET() {
  try {
    const fallback = (): Agent[] => {
      const now = new Date().toISOString();
      return NAMED_AGENTS.map((a) => ({ ...a, createdAt: now, updatedAt: now }));
    };

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ agents: fallback() });
    }

    // If the migration hasn't been applied yet (or the table query errors for
    // any other reason), fall back to the seed list so the UI doesn't 500.
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ agents: fallback() });
    }

    const rows: Agent[] = (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row.data as object),
      id: row.id as string,
    })) as Agent[];

    return NextResponse.json({ agents: rows.length > 0 ? rows : fallback() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
