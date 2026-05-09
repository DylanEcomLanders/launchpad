import { NextRequest, NextResponse } from "next/server";
import { postSlackMessage, getAppUrl } from "@/lib/slack-bot";

/**
 * POST /api/pods/slip-notify
 *
 * Fires when a project's status flips to "slipped". Posts to the pod's
 * Slack channel so admins/owners see the slip without watching the
 * dashboard. Best-effort, silent on failure.
 *
 * Body: { channel_id, pod_name, project_name, client_name?, delivery_date?, slip_reason? }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, string | undefined> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { channel_id, pod_name, project_name, client_name, delivery_date, slip_reason } = body;
  if (!channel_id || !pod_name || !project_name) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const lines: string[] = [
    `:warning: *Project slipped — ${pod_name}* — ${project_name}`,
  ];
  const meta: string[] = [];
  if (client_name) meta.push(`Client: *${client_name}*`);
  if (delivery_date) meta.push(`Was due: ${delivery_date}`);
  if (slip_reason) meta.push(`Reason: ${slip_reason}`);
  meta.push(`<${getAppUrl()}/pods-v2|Open pod board>`);
  lines.push(meta.join(" · "));

  const result = await postSlackMessage(channel_id, lines.join("\n"));
  return NextResponse.json({ ok: true, slack: result });
}
