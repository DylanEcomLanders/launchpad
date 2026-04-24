import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fromRow, type SwipeRow } from "@/lib/swipe-file";

const TABLE = "swipe_file";
const BUCKET = "swipe-file";

// PATCH: update title / tags / notes for a single entry
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") updates.title = body.title;
  if (Array.isArray(body.tags)) updates.tags = body.tags.filter(Boolean).map(String);
  if (typeof body.notes === "string") updates.notes = body.notes;

  try {
    const { data, error } = await supabase.from(TABLE).update(updates).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json(fromRow(data as SwipeRow));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// DELETE: remove the row and its cached screenshots from storage
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    // Best-effort storage cleanup; don't block delete if it fails (e.g. files
    // already gone, perms tightened later).
    await supabase.storage.from(BUCKET).remove([`${id}/desktop.png`, `${id}/mobile.png`]);
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
