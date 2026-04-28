import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  FONT_CATEGORIES,
  FONT_USAGE_OPTIONS,
  fromRow,
  type FontCategory,
  type FontUsage,
  type FontRow,
} from "@/lib/font-library";

const TABLE = "font_library";
const BUCKET = "font-library";

// ── GET single ──────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });
  return NextResponse.json(fromRow(data as FontRow));
}

// ── PATCH metadata ──────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Partial<{
    name: string;
    family: string;
    category: string;
    usage: string[];
    niches: string[];
    notes: string;
    googleFontsUrl: string;
  }> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.family === "string") patch.family = body.family.trim();
  if (typeof body.category === "string" && (FONT_CATEGORIES as readonly string[]).includes(body.category)) {
    patch.category = body.category as FontCategory;
  }
  if (Array.isArray(body.usage)) {
    patch.usage = body.usage.filter((u): u is FontUsage =>
      (FONT_USAGE_OPTIONS as readonly string[]).includes(u),
    );
  }
  if (Array.isArray(body.niches)) {
    patch.niches = body.niches.map((n) => String(n).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (typeof body.googleFontsUrl === "string") patch.google_fonts_url = body.googleFontsUrl;

  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(fromRow(data as FontRow));
}

// ── DELETE family + all attached files ──────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  // Fetch the row first so we know which storage paths to clean up
  const { data: existing } = await supabase.from(TABLE).select("files").eq("id", id).single();
  const paths = (existing?.files as { storagePath?: string }[] | null)
    ?.map((f) => f?.storagePath)
    .filter((p): p is string => typeof p === "string" && p.length > 0) || [];

  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
