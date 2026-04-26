import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fromRow, type QuizSubmissionRow } from "@/lib/quiz/types";

// Admin list endpoint — newest first.
// (Auth lives at the layout level for the /sales-engine/* admin area.)
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json([]);
  try {
    const { data } = await supabase
      .from("quiz_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json((data || []).map((r) => fromRow(r as QuizSubmissionRow)));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
