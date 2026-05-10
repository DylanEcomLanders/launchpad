/* GET    /api/agents/[agentId] — fetch a single agent
 * PATCH  /api/agents/[agentId] — update systemPrompt, model, status
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { NAMED_AGENTS } from "@/lib/agents/types";
import type { Agent } from "@/lib/agents/types";

const ALLOWED_PATCH_KEYS = new Set(["systemPrompt", "model", "status"] as const);

function seedAgent(id: string): Agent | null {
  const seed = NAMED_AGENTS.find((a) => a.id === id);
  if (!seed) return null;
  const now = new Date().toISOString();
  return { ...seed, createdAt: now, updatedAt: now };
}

async function loadAgent(id: string): Promise<Agent | null> {
  if (!isSupabaseConfigured()) return seedAgent(id);
  const { data, error } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();
  // Fall back to the seed list if the table is missing or the row hasn't
  // been written yet — the UI shouldn't 404 just because the migration
  // hasn't run on this environment.
  if (error || !data) return seedAgent(id);
  return { ...(data.data as object), id: data.id as string } as Agent;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await ctx.params;
  const agent = await loadAgent(agentId);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json({ agent });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await ctx.params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_PATCH_KEYS.has(key as never)) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const existing = await loadAgent(agentId);
    if (!existing) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const next: Agent = { ...existing, ...updates, updatedAt: new Date().toISOString() } as Agent;
    const { id, ...rest } = next;
    const { error } = await supabase.from("agents").upsert({
      id,
      data: rest,
      created_at: existing.createdAt,
    });
    if (error) throw error;

    return NextResponse.json({ agent: next });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
