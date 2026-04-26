import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fromRow, type QuizSubmissionRow } from "@/lib/quiz/types";

// PATCH: mark contacted / un-contacted from the admin row.
// Accepts { contacted: boolean, contactedBy?: string }. Sets contactedAt to
// now() when contacted=true, clears both fields when false.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  let body: { contacted?: boolean; contactedBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.contacted === "boolean") {
    if (body.contacted) {
      updates.contacted_at = new Date().toISOString();
      updates.contacted_by = body.contactedBy || "team";
    } else {
      updates.contacted_at = null;
      updates.contacted_by = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("quiz_submissions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(fromRow(data as QuizSubmissionRow));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
