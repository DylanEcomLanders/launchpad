/* ── Lead Capture API ──
 * Public endpoint for lead magnet landing pages.
 * Creates a new pipeline entry with source/funnel attribution.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, store_url, name, funnel, source } = body;

    if (!email || !store_url) {
      return NextResponse.json(
        { error: "Email and store URL are required" },
        { status: 400 }
      );
    }

    // Extract brand name from URL
    let brandName = "";
    try {
      const url = new URL(store_url.startsWith("http") ? store_url : `https://${store_url}`);
      brandName = url.hostname.replace("www.", "").split(".")[0];
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    } catch {
      brandName = store_url;
    }

    const now = new Date().toISOString();
    const lead = {
      id: crypto.randomUUID(),
      brand_name: brandName,
      contact_name: name || "",
      contact_email: email,
      status: "new",
      source: source || "direct",
      funnel: funnel || "audit",
      notes: `Submitted via ${funnel || "audit"} landing page`,
      store_url: store_url.startsWith("http") ? store_url : `https://${store_url}`,
      created_at: now,
      updated_at: now,
    };

    // Save to Supabase
    if (isSupabaseConfigured()) {
      const { id, ...rest } = lead;
      const { error } = await supabase.from("deals").insert({
        id,
        data: rest,
        created_at: now,
      });
      if (error) {
        console.error("Supabase lead insert error:", error);
      }
    }

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Lead capture error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
