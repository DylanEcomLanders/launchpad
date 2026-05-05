/* ── Tickets API ──
 * Single-document store at id=main-tickets in the `tickets` Supabase table
 * (jsonb data column). Mirrors the task_board pattern exactly so the
 * infrastructure stays simple — one row, one blob, full read/write.
 *
 * If the `tickets` table doesn't exist yet, GET returns an empty list and
 * POST will fail with a Supabase error — create the table with:
 *   create table tickets (id text primary key, data jsonb, created_at timestamptz default now());
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const TABLE = "tickets";
const DOC_ID = "main-tickets";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ tickets: [] });
  try {
    const { data } = await supabase
      .from(TABLE)
      .select("data")
      .eq("id", DOC_ID)
      .single();
    return NextResponse.json(data?.data || { tickets: [] });
  } catch {
    return NextResponse.json({ tickets: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = req.headers.get("x-admin-key");
  if (
    auth !==
    (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "ecomlanders2025")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "No DB" }, { status: 500 });
  }

  try {
    await supabase.from(TABLE).upsert({
      id: DOC_ID,
      data: body,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
