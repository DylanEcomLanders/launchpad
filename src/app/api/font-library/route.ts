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

// ── GET: list all font entries ──────────────────────────────────────────────
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json([]);
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return NextResponse.json((data || []).map((r: FontRow) => fromRow(r)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST: create a new font entry (no files yet — files are uploaded separately) ──
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    family?: string;
    category?: string;
    usage?: string[];
    niches?: string[];
    notes?: string;
    googleFontsUrl?: string;
  } | null;

  if (!body || !body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const name = body.name.trim();
  const family = (body.family || name).trim();
  const category: FontCategory = (FONT_CATEGORIES as readonly string[]).includes(body.category || "")
    ? (body.category as FontCategory)
    : "sans";
  const usage: FontUsage[] = Array.isArray(body.usage)
    ? body.usage.filter((u): u is FontUsage =>
        (FONT_USAGE_OPTIONS as readonly string[]).includes(u),
      )
    : [];
  const niches = Array.isArray(body.niches)
    ? body.niches.map((n) => String(n).trim().toLowerCase()).filter(Boolean)
    : [];

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        name,
        family,
        category,
        usage,
        niches,
        notes: (body.notes || "").toString(),
        google_fonts_url: (body.googleFontsUrl || "").toString(),
        files: [],
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(fromRow(data as FontRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
