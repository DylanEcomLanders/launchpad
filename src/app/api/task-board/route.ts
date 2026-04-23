import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { appendPhaseTransition, type PhaseEntry } from "@/lib/task-board/phases";

const TABLE = "task_board";
const BOARD_ID = "main-board";

interface TaskShape {
  id: string;
  phase?: string;
  phaseHistory?: PhaseEntry[];
  [key: string]: unknown;
}
interface BoardShape {
  designTasks: TaskShape[];
  devTasks: TaskShape[];
}

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

// Team-facing single-task phase update. Reads current board, mutates one task,
// writes back — narrows the race window vs. clients stomping the full blob.
export async function PATCH(req: NextRequest) {
  const { taskId, phase } = await req.json();
  if (!taskId || typeof phase !== "string") {
    return NextResponse.json({ error: "taskId and phase required" }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "No DB" }, { status: 500 });

  try {
    const { data: row } = await supabase.from(TABLE).select("data").eq("id", BOARD_ID).single();
    const board: BoardShape = row?.data || { designTasks: [], devTasks: [] };

    let found = false;
    const patch = (list: TaskShape[]) =>
      list.map((t) => {
        if (t.id !== taskId) return t;
        found = true;
        return appendPhaseTransition(t, phase);
      });

    const next: BoardShape = {
      designTasks: patch(board.designTasks || []),
      devTasks: patch(board.devTasks || []),
    };

    if (!found) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await supabase.from(TABLE).upsert({
      id: BOARD_ID,
      data: next,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
