import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { postSlackMessage, getAppUrl } from "@/lib/slack-bot";

/**
 * GET /api/cron/pods-standup
 *
 * Daily 9am UK Mon-Fri. For each pod with a configured Slack channel,
 * compiles a snapshot of the last 24 hours + today's priorities and
 * gets Claude to narrate it as a punchy 5-7 sentence standup. Posts
 * the narrative to the pod's Slack channel.
 *
 * Why server-side cron now (vs the old client-side scan): pods data
 * lives in Supabase as of pods_v2_* tables, so the cron can read live
 * state without an admin browser being open.
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

interface PodRow { id: string; data: { name: string; tagline: string; members: Array<{ id: string; name: string; role: string; ooo_start?: string; ooo_end?: string; is_placeholder?: boolean }>; capacity_points_per_month: number; slack_channel_id?: string; blockers?: Array<{ id: string; title: string; raised_at: string; resolved_at?: string }> } }
interface ProjectRow { id: string; data: { name: string; client_id: string; pod_id: string; status: string; delivery_date: string; is_rush?: boolean; slip_reason?: string } }
interface ClientRow { id: string; data: { name: string } }
interface TaskRow { id: string; data: { project_id: string; title: string; status: string; assigned_to: string; due_date: string; created_at: string; type: string; cycle?: { month: number; week: number } } }

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: "no_api_key" });
  }

  const [{ data: pods }, { data: projects }, { data: clients }, { data: tasks }] = await Promise.all([
    supabase.from("pods_v2_pods").select("id, data") as unknown as Promise<{ data: PodRow[] | null }>,
    supabase.from("pods_v2_projects").select("id, data") as unknown as Promise<{ data: ProjectRow[] | null }>,
    supabase.from("pods_v2_clients").select("id, data") as unknown as Promise<{ data: ClientRow[] | null }>,
    supabase.from("pods_v2_tasks").select("id, data") as unknown as Promise<{ data: TaskRow[] | null }>,
  ]);

  if (!pods || pods.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no_pods" });
  }

  const today = new Date();
  const todayYMD = today.toISOString().slice(0, 10);
  const dayAgoMs = today.getTime() - 24 * 60 * 60 * 1000;
  const clientById = new Map((clients || []).map((c) => [c.id, c.data.name] as const));
  const allTasks = tasks || [];
  const allProjects = projects || [];

  const results: Array<{ pod: string; status: string }> = [];

  for (const podRow of pods) {
    const pod = podRow.data;
    const podId = podRow.id;
    if (!pod.slack_channel_id) {
      results.push({ pod: pod.name, status: "skipped_no_channel" });
      continue;
    }

    const podProjects = allProjects.filter((p) => p.data.pod_id === podId);
    const podProjectIds = new Set(podProjects.map((p) => p.id));
    const podTasks = allTasks.filter((t) => podProjectIds.has(t.data.project_id));
    const memberById = new Map(pod.members.map((m) => [m.id, m.name] as const));

    const completed24h = podTasks
      .filter((t) => t.data.status === "done" && new Date(t.data.created_at).getTime() >= dayAgoMs);
    const created24h = podTasks
      .filter((t) => new Date(t.data.created_at).getTime() >= dayAgoMs);
    const dueToday = podTasks
      .filter((t) => t.data.status !== "done" && t.data.due_date === todayYMD);
    const overdue = podTasks
      .filter((t) => t.data.status !== "done" && t.data.due_date && t.data.due_date < todayYMD);
    const inProgress = podTasks.filter((t) => t.data.status === "in_progress");
    const activeBlockers = (pod.blockers || []).filter((b) => !b.resolved_at);
    const blockersRaised24h = (pod.blockers || []).filter(
      (b) => new Date(b.raised_at).getTime() >= dayAgoMs,
    );
    const slipped = podProjects.filter((p) => p.data.status === "slipped");
    const shippingThisWeek = podProjects.filter(
      (p) => p.data.status !== "shipped" && p.data.status !== "slipped" &&
        p.data.delivery_date >= todayYMD &&
        new Date(p.data.delivery_date).getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000,
    );
    const oooMembers = pod.members.filter(
      (m) =>
        !m.is_placeholder &&
        m.ooo_start && todayYMD >= m.ooo_start && (!m.ooo_end || todayYMD <= m.ooo_end),
    );

    /* Build a compact, structured snapshot for Claude. The model gets
     * just enough context to narrate without flooding tokens —
     * deliverable list, owner, status, due date. Skipping rich nesting
     * so the model doesn't get distracted by structure noise. */
    const snapshot = {
      pod: pod.name,
      tagline: pod.tagline,
      ooo_today: oooMembers.map((m) => m.name),
      completed_last_24h: completed24h.map((t) => ({
        title: t.data.title,
        owner: memberById.get(t.data.assigned_to) || "—",
      })),
      created_last_24h: created24h.map((t) => ({
        title: t.data.title,
        owner: memberById.get(t.data.assigned_to) || "—",
      })),
      due_today: dueToday.map((t) => ({
        title: t.data.title,
        owner: memberById.get(t.data.assigned_to) || "—",
        client: clientById.get(podProjects.find((p) => p.id === t.data.project_id)?.data.client_id || "") || "—",
      })),
      overdue: overdue.map((t) => ({
        title: t.data.title,
        owner: memberById.get(t.data.assigned_to) || "—",
        days_late: Math.floor((today.getTime() - new Date(t.data.due_date + "T12:00:00").getTime()) / (24 * 60 * 60 * 1000)),
      })),
      in_progress_count: inProgress.length,
      active_blockers: activeBlockers.map((b) => b.title),
      blockers_raised_last_24h: blockersRaised24h.map((b) => b.title),
      slipped_projects: slipped.map((p) => ({
        name: p.data.name,
        client: clientById.get(p.data.client_id) || "—",
        was_due: p.data.delivery_date,
      })),
      shipping_this_week: shippingThisWeek.map((p) => ({
        name: p.data.name,
        client: clientById.get(p.data.client_id) || "—",
        due: p.data.delivery_date,
      })),
    };

    let narrative = "";
    try {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: STANDUP_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${todayYMD}. Here's the snapshot for ${pod.name} (${pod.tagline}):\n\n${JSON.stringify(snapshot, null, 2)}\n\nWrite the standup.`,
          },
        ],
      });
      const block = msg.content.find((b) => b.type === "text");
      narrative = block && block.type === "text" ? block.text.trim() : "";
    } catch (err) {
      results.push({ pod: pod.name, status: `claude_error: ${(err as Error).message}` });
      continue;
    }

    if (!narrative) {
      results.push({ pod: pod.name, status: "empty_narrative" });
      continue;
    }

    const slackText = `:sun_with_face: *${pod.name} standup — ${todayYMD}*\n${narrative}\n\n_<${getAppUrl()}/pods-v2|Open pod board> · <${getAppUrl()}/pods-v2/standup|Full standup view>_`;
    const result = await postSlackMessage(pod.slack_channel_id, slackText);
    results.push({ pod: pod.name, status: result?.ok ? "posted" : `slack_error: ${result?.error || "unknown"}` });
  }

  return NextResponse.json({ ok: true, results });
}

const STANDUP_SYSTEM_PROMPT = `You are the operating brain for a Shopify CRO agency called Ecomlanders. Each morning you write a brief, punchy daily standup for one pod (a 4-person design+dev team).

Your job: synthesise the pod's last 24 hours and today's priorities into a 5-7 sentence Slack message. Direct, no fluff, no filler. Match the tone of someone who actually runs the agency — not a corporate Monday-update voice.

RULES
- Lead with whichever signal matters most: a slip / overdue task / new blocker if there is one; otherwise momentum (what shipped or moved).
- Mention people by name when it's useful (owners, blockers).
- Numbers when they punch ("3 PDPs in flight", "2 overdue") — not when they're noise ("0 slipped projects today" — drop it).
- Acknowledge OOO members so the pod knows coverage matters.
- Always end with a single line starting "Top focus today: …" naming the one or two specific things that need to land.
- Skip empty categories silently. If the pod had a quiet day, say so honestly in one sentence.
- Use Slack-friendly formatting: *bold* sparingly for key names/numbers, hyphens for lists if you must, no markdown headings.
- Never invent data not in the snapshot.
- Never say "as an AI" or apologise for being a bot.

Output ONLY the standup message text. No preamble, no sign-off, no JSON.`;
