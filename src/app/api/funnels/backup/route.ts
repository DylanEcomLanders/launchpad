import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { FunnelData } from "@/lib/funnel-builder/types";

/**
 * POST /api/funnels/backup
 * Accepts an array of funnels from localStorage and upserts them into Supabase.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const funnels: FunnelData[] = await req.json();

  if (!Array.isArray(funnels) || funnels.length === 0) {
    return NextResponse.json(
      { error: "Expected a non-empty array of funnels" },
      { status: 400 }
    );
  }

  const rows = funnels.map((f) => ({
    id: f.id,
    name: f.name,
    client_id: f.clientId || null,
    client_name: f.clientName,
    mode: f.mode,
    nodes: f.nodes,
    edges: f.edges,
    created_at: f.created_at,
    updated_at: f.updated_at,
  }));

  const { data, error } = await supabase
    .from("funnels")
    .upsert(rows, { onConflict: "id" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ backed_up: data?.length ?? 0 });
}
