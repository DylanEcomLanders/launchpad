/* ── Funnel Event Tracking API ──
 * Public endpoint for tracking page views and form submissions.
 * No auth required — used by public landing pages.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { funnel, event_type, source, referrer } = body;

    if (!funnel || !event_type) {
      return NextResponse.json(
        { error: "funnel and event_type are required" },
        { status: 400 }
      );
    }

    if (!["view", "submission"].includes(event_type)) {
      return NextResponse.json(
        { error: "event_type must be 'view' or 'submission'" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const event = {
      id: crypto.randomUUID(),
      funnel,
      event_type,
      source: source || "direct",
      referrer: referrer || "",
      created_at: now,
    };

    // Save to Supabase
    if (isSupabaseConfigured()) {
      const { id, ...rest } = event;
      const { error } = await supabase.from("funnel_events").insert({
        id,
        data: rest,
        created_at: now,
      });
      if (error) {
        console.error("Supabase funnel event insert error:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Funnel event tracking error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
