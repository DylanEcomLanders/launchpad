import { NextResponse } from "next/server";
import { getOpsRadarData } from "@/lib/clickup/client";

export const maxDuration = 30;

export async function GET() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "CLICKUP_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const data = await getOpsRadarData(token);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[clickup/tasks] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
