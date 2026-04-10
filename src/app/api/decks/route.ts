import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  const deck = { ...body, id, created_at: now, updated_at: now };

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from("decks").insert({
      id,
      data: deck,
      created_at: now,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id, url: `/deck/${id}` });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from("decks").select("*").eq("id", id).single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deck: { ...data.data, id: data.id } });
  }

  return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
}
