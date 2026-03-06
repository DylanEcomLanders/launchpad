import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// NOTE: Run this SQL in Supabase Dashboard → SQL Editor if not yet done:
// ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tier INTEGER NOT NULL DEFAULT 1;
// ALTER TABLE proposals ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ DEFAULT NULL;

export async function POST(request: Request) {
  const body = await request.json();
  const { clientName, expiryDays = 30, tier = 1 } = body;

  if (!clientName?.trim()) {
    return NextResponse.json(
      { error: "Client name is required" },
      { status: 400 }
    );
  }

  // Validate tier
  const validTier = tier === 2 ? 2 : 1;

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Number(expiryDays));

  // Try inserting with tier first, fall back without if column doesn't exist yet
  let result = await supabase
    .from("proposals")
    .insert({
      token,
      client_name: clientName.trim(),
      tier: validTier,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  // If the tier column doesn't exist yet, retry without it
  if (result.error?.code === "42703") {
    console.warn(
      "[proposals/create] 'tier' column missing — inserting without it. " +
        "Run: ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tier INTEGER NOT NULL DEFAULT 1;"
    );
    result = await supabase
      .from("proposals")
      .insert({
        token,
        client_name: clientName.trim(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Ensure tier is present in the response (default for legacy rows)
  const data = { ...result.data, tier: result.data.tier ?? validTier };

  return NextResponse.json(data);
}
