import { NextRequest, NextResponse } from "next/server";
import { postSlackMessage, getAppUrl } from "@/lib/slack-bot";

/**
 * POST /api/pods/blocker-notify
 *
 * Fires when a pod blocker is raised in the client. Posts a brief
 * Slack message to the pod's configured channel so the team sees it
 * without opening Launchpad. Best-effort — caller (`addBlocker`) does
 * not await the result; failures are silent.
 *
 * Body shape: { channel_id, pod_name, title, description?, owner_name?, raised_by? }
 */
export async function POST(req: NextRequest) {
  let body: {
    channel_id?: string;
    pod_name?: string;
    title?: string;
    description?: string;
    owner_name?: string;
    raised_by?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { channel_id, pod_name, title, description, owner_name, raised_by } = body;
  if (!channel_id || !title || !pod_name) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const lines = [
    `:rotating_light: *Blocker raised on ${pod_name}* — ${title}`,
  ];
  if (description) lines.push(`> ${description}`);
  const meta: string[] = [];
  if (owner_name) meta.push(`Owner: *${owner_name}*`);
  if (raised_by) meta.push(`Raised by: ${raised_by}`);
  meta.push(`<${getAppUrl()}/pods-v2|Open pod board>`);
  lines.push(meta.join(" · "));

  const result = await postSlackMessage(channel_id, lines.join("\n"));
  return NextResponse.json({ ok: true, slack: result });
}
