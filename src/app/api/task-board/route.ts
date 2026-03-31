import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const TABLE = "task_board";
const BOARD_ID = "main-board";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ tasks: [] });
  try {
    const { data } = await supabase.from(TABLE).select("data").eq("id", BOARD_ID).single();
    return NextResponse.json(data?.data || { designTasks: [], devTasks: [] });
  } catch {
    return NextResponse.json({ designTasks: [], devTasks: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Simple auth — check for admin password in header
  const auth = req.headers.get("x-admin-key");
  if (auth !== (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "ecomlanders2025")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) return NextResponse.json({ error: "No DB" }, { status: 500 });

  try {
    await supabase.from(TABLE).upsert({
      id: BOARD_ID,
      data: body,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
