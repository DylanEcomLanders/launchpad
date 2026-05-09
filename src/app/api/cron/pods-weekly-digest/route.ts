import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { postSlackMessage, getOpsChannelId, getAppUrl } from "@/lib/slack-bot";

/**
 * GET /api/cron/pods-weekly-digest
 *
 * Friday 4pm UK. Reads the week's activity across every pod, asks
 * Claude to narrate an agency-wide summary (what shipped, what's
 * stale, what's at risk for next week, where capacity is), and posts
 * to the ops channel. Distinct from the legacy /friday-digest cron
 * which operates on client_portals — this one is the pods-v2 view.
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

interface PodRow { id: string; data: { name: string; tagline: string; members: Array<{ id: string; name: string; role: string; ooo_start?: string; ooo_end?: string; is_placeholder?: boolean }>; capacity_points_per_month: number; blockers?: Array<{ id: string; title: string; raised_at: string; resolved_at?: string }> } }
interface ProjectRow { id: string; data: { name: string; client_id: string; pod_id: string; status: string; delivery_date: string; slip_reason?: string } }
interface ClientRow { id: string; data: { name: string; cvr_baseline?: number; cvr_current?: number; aov_baseline?: number; aov_current?: number } }
interface TaskRow { id: string; data: { project_id: string; title: string; status: string; assigned_to: string; due_date: string; created_at: string; type: string; discipline: string; cycle?: { month: number; week: number }; test_result?: { status: string; lift_pct?: number; significance_pct?: number; notes?: string } } }

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: "no_api_key" });
  }

  const opsChannel = getOpsChannelId();
  if (!opsChannel) {
    return NextResponse.json({ ok: false, error: "no_ops_channel" });
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
  const weekAgoYMD = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const weekAgoMs = today.getTime() - 7 * 24 * 60 * 60 * 1000;
  const fourWeeksOutMs = today.getTime() + 28 * 24 * 60 * 60 * 1000;

  const clientById = new Map((clients || []).map((c) => [c.id, c.data] as const));
  const allTasks = tasks || [];
  const allProjects = projects || [];

  const podSummaries = pods.map((podRow) => {
    const pod = podRow.data;
    const podId = podRow.id;
    const podProjects = allProjects.filter((p) => p.data.pod_id === podId);
    const podProjectIds = new Set(podProjects.map((p) => p.id));
    const podTasks = allTasks.filter((t) => podProjectIds.has(t.data.project_id));

    const shippedThisWeek = podProjects.filter(
      (p) => p.data.status === "shipped" &&
        p.data.delivery_date >= weekAgoYMD && p.data.delivery_date <= todayYMD,
    );
    const slipped = podProjects.filter((p) => p.data.status === "slipped");
    const winningTests = podTasks.filter(
      (t) => t.data.test_result?.status === "winner",
    );
    const losingTests = podTasks.filter(
      (t) => t.data.test_result?.status === "loser",
    );
    const blockersThisWeek = (pod.blockers || []).filter(
      (b) => new Date(b.raised_at).getTime() >= weekAgoMs,
    );
    const stillStuck = (pod.blockers || []).filter((b) => !b.resolved_at);
    const upcomingShips = podProjects.filter(
      (p) => p.data.status !== "shipped" && p.data.status !== "slipped" &&
        p.data.delivery_date >= todayYMD &&
        new Date(p.data.delivery_date + "T12:00:00").getTime() <= fourWeeksOutMs,
    );

    return {
      pod: pod.name,
      tagline: pod.tagline,
      shipped_this_week: shippedThisWeek.map((p) => ({
        name: p.data.name,
        client: clientById.get(p.data.client_id)?.name || "—",
      })),
      slipped: slipped.map((p) => ({
        name: p.data.name,
        client: clientById.get(p.data.client_id)?.name || "—",
        was_due: p.data.delivery_date,
        reason: p.data.slip_reason,
      })),
      winning_tests: winningTests.map((t) => ({
        title: t.data.title,
        lift_pct: t.data.test_result?.lift_pct,
        significance_pct: t.data.test_result?.significance_pct,
        notes: t.data.test_result?.notes,
      })),
      losing_tests: losingTests.map((t) => ({
        title: t.data.title,
        lift_pct: t.data.test_result?.lift_pct,
      })),
      blockers_raised_this_week: blockersThisWeek.length,
      blockers_still_open: stillStuck.length,
      upcoming_ships_next_4wks: upcomingShips.length,
    };
  });

  // Agency-wide CVR/AOV deltas — pulled from the client roster.
  const cvrDeltas = (clients || [])
    .filter((c) => c.data.cvr_baseline != null && c.data.cvr_current != null)
    .map((c) => ({
      client: c.data.name,
      cvr_lift_pct: ((c.data.cvr_current! - c.data.cvr_baseline!) / c.data.cvr_baseline!) * 100,
      cvr_baseline: c.data.cvr_baseline,
      cvr_current: c.data.cvr_current,
    }));

  const snapshot = {
    week_of: weekAgoYMD,
    today: todayYMD,
    pods: podSummaries,
    client_cvr_deltas: cvrDeltas,
  };

  let narrative = "";
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: WEEKLY_DIGEST_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${todayYMD}. Here's the week's snapshot across every pod:\n\n${JSON.stringify(snapshot, null, 2)}\n\nWrite the weekly digest.`,
        },
      ],
    });
    const block = msg.content.find((b) => b.type === "text");
    narrative = block && block.type === "text" ? block.text.trim() : "";
  } catch (err) {
    return NextResponse.json({ ok: false, error: `claude_error: ${(err as Error).message}` });
  }

  if (!narrative) {
    return NextResponse.json({ ok: false, error: "empty_narrative" });
  }

  const slackText = `:calendar_spiral: *Pods weekly digest — week of ${weekAgoYMD}*\n${narrative}\n\n_<${getAppUrl()}/pods-v2|Open pod overview>_`;
  const result = await postSlackMessage(opsChannel, slackText);
  return NextResponse.json({ ok: true, slack: result });
}

const WEEKLY_DIGEST_SYSTEM_PROMPT = `You are the operating brain for Ecomlanders, a Shopify CRO + funnel design agency that runs three pods. Each Friday afternoon you write the pods weekly digest — the one Slack message that captures what happened across the agency this week, what's at risk, and what to focus on next week.

Your audience: the founder + ops lead. They don't need to be told what they already know. They need signal — what mattered, what's drifting, what they should care about Monday morning.

STRUCTURE
- Open with one or two sentences setting the week's overall posture (strong / mixed / under pressure / etc.). Be honest, not cheerleady.
- A short paragraph or bullet list per pod summarising what shipped, what slipped, anything blocked, anything tested.
- Specifically flag winning conversion tests with lift % — these are the renewal-justifying wins. Losing tests get one line ("X tested flat, moving on").
- A line on agency-wide CVR/AOV movement if the data shows any clients moving meaningfully.
- Close with a "Watch next week:" section — the 1-3 specific things that need eyes Monday.

RULES
- Direct, plain English, no corporate fluff.
- Use *bold* sparingly for client + pod names + the lift numbers that matter.
- Numbers when they punch. Skip empty categories silently.
- Slack-friendly markdown only (no headings, hyphens for lists).
- Never invent data not in the snapshot.
- Stay under ~250 words total. This should fit one Slack screen.

Output ONLY the digest message text. No preamble, no sign-off, no JSON.`;
