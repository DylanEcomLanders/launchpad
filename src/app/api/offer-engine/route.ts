import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { OfferProposal, ProposalContent } from "@/lib/offer-engine/types";

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ proposals: [] });
  }
  const { data, error } = await supabase
    .from("offer_proposals")
    .select("id, slug, brand_name, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json() as {
    slug?: string;
    brand_name: string;
    content: ProposalContent;
  };

  if (!body.brand_name || !body.content) {
    return NextResponse.json({ error: "brand_name and content required" }, { status: 400 });
  }

  const slug = slugify(body.slug || body.brand_name);
  if (!slug) {
    return NextResponse.json({ error: "Could not derive slug" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const payload = {
    slug,
    brand_name: body.brand_name,
    content: body.content,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("offer_proposals")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data as OfferProposal });
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const { error } = await supabase.from("offer_proposals").delete().eq("slug", slug);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
