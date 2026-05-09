import { NextRequest, NextResponse } from "next/server";
import { postSlackMessage, getAppUrl } from "@/lib/slack-bot";
import { authedRole } from "@/lib/auth/role";

/**
 * POST /api/pods/stale-notify
 *
 * Fires when a ticket has been sitting open for >48 effective hours
 * (paused windows excluded). Posts to the pod's Slack channel,
 * pinging the owner if known. Caller (`scanAndNotifyStaleTickets`)
 * marks the task `stale_pinged_at` so the same ticket only pings once.
 *
 * Auth: requires launchpad-role cookie (admin / cro / team).
 *
 * Body: { channel_id, pod_name, task_title, owner_name?, age_hours }
 */
export async function POST(req: NextRequest) {
  if (!authedRole(req, ["admin", "cro", "team"])) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: { channel_id?: string; pod_name?: string; task_title?: string; owner_name?: string; age_hours?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { channel_id, pod_name, task_title, owner_name, age_hours } = body;
  if (!channel_id || !pod_name || !task_title) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const ageLabel = typeof age_hours === "number"
    ? `${age_hours >= 48 ? Math.floor(age_hours / 24) + "d " : ""}${age_hours % 24}h`
    : "stale";

  const lines: string[] = [
    `:hourglass_flowing_sand: *Ticket sat ${ageLabel} on ${pod_name}* — ${task_title}`,
  ];
  const meta: string[] = [];
  if (owner_name) meta.push(`Owner: *${owner_name}*`);
  meta.push(`<${getAppUrl()}/pods-v2|Open pod board>`);
  lines.push(meta.join(" · "));

  const result = await postSlackMessage(channel_id, lines.join("\n"));
  return NextResponse.json({ ok: true, slack: result });
}
