import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { postSlackMessage, getOpsChannelId, getAppUrl } from "@/lib/slack-bot";
import { isNotificationEnabled } from "@/lib/notification-settings";

/**
 * GET /api/cron/monday-breakdown
 * Runs Monday 8:30am — posts a weekly breakdown to #ops with
 * upcoming deadlines, blockers, retainer status, and action items.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isNotificationEnabled("monday_breakdown"))) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const opsChannel = getOpsChannelId();
  if (!opsChannel) {
    return NextResponse.json({ ok: false, error: "No ops channel configured" });
  }

  const APP_URL = getAppUrl();
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 5); // Friday

  // Fetch all active portals
  const { data: portals, error } = await supabase
    .from("client_portals")
    .select("id, client_name, client_type, phases, projects, blocker, weekly_deliverables, deleted_at, team_member_ids")
    .is("deleted_at", null);

  if (error || !portals) {
    return NextResponse.json({ ok: false, error: error?.message });
  }

  // Load team for name lookups
  const { data: settingsRows } = await supabase
    .from("business_settings")
    .select("data")
    .eq("id", "business-settings-singleton")
    .limit(1);

  const team = settingsRows?.[0]?.data?.team || [];
  const getTeamName = (id: string) => team.find((m: any) => m.id === id)?.name || "Unassigned";

  // ── Collect data ──────────────────────────────────────────
  const deadlinesThisWeek: string[] = [];
  const overdue: string[] = [];
  const blockers: string[] = [];
  const retainers: string[] = [];
  let activeCount = 0;
  let retainerCount = 0;

  for (const portal of portals) {
    activeCount++;
    const isRetainer = portal.client_type === "retainer";
    if (isRetainer) retainerCount++;

    // Check blocker
    if (portal.blocker && !portal.blocker.resolved_at) {
      const since = portal.blocker.created_at
        ? new Date(portal.blocker.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "unknown";
      blockers.push(`• *${portal.client_name}* — ${portal.blocker.reason || "No reason given"} (since ${since})`);
    }

    // Check phases for deadlines — both top-level and within projects
    const allPhases: Array<{ name: string; endDate?: string; deadline?: string; status: string; projectName?: string }> = [];

    for (const phase of portal.phases || []) {
      allPhases.push(phase);
    }
    for (const project of portal.projects || []) {
      for (const phase of project.phases || []) {
        allPhases.push({ ...phase, projectName: project.name });
      }
    }

    for (const phase of allPhases) {
      if (phase.status === "complete") continue;
      const deadline = phase.endDate || phase.deadline;
      if (!deadline) continue;

      const deadlineDate = new Date(deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      const label = phase.projectName ? `${phase.name} (${phase.projectName})` : phase.name;
      const dateStr = deadlineDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

      if (deadlineDate < today) {
        overdue.push(`• *${portal.client_name}* — ${label} was due ${dateStr}`);
      } else if (deadlineDate <= endOfWeek) {
        deadlinesThisWeek.push(`• *${portal.client_name}* — ${label} due ${dateStr}`);
      }
    }

    // Track retainer mission statements
    if (isRetainer) {
      const weeklyDeliverables = portal.weekly_deliverables || [];
      // Check if current week has a mission statement
      const currentWeekStart = getMonday(today);
      const hasCurrentWeek = weeklyDeliverables.some(
        (w: any) => w.week_start === currentWeekStart && w.mission_statement
      );
      if (!hasCurrentWeek) {
        retainers.push(`• *${portal.client_name}* — needs mission statement`);
      }
    }
  }

  // ── Build message ─────────────────────────────────────────
  const dateStr = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const sections: string[] = [];

  if (deadlinesThisWeek.length > 0) {
    sections.push(`*📅 This week's deadlines:*\n${deadlinesThisWeek.join("\n")}`);
  } else {
    sections.push("*📅 No deadlines this week.*");
  }

  if (overdue.length > 0) {
    sections.push(`*🚨 Overdue (${overdue.length}):*\n${overdue.join("\n")}`);
  }

  if (blockers.length > 0) {
    sections.push(`*🛑 Active blockers (${blockers.length}):*\n${blockers.join("\n")}`);
  }

  if (retainers.length > 0) {
    sections.push(`*📝 Retainers needing mission statements:*\n${retainers.join("\n")}`);
  }

  sections.push(`*📊 Active:* ${activeCount} projects · ${retainerCount} retainers`);

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `📋 Monday Breakdown — ${dateStr}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: sections.join("\n\n") },
    },
  ];

  await postSlackMessage(opsChannel, `📋 Monday Breakdown — ${dateStr}`, blocks);

  return NextResponse.json({ ok: true, deadlines: deadlinesThisWeek.length, overdue: overdue.length, blockers: blockers.length });
}

/** Get Monday of the current week as YYYY-MM-DD */
function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split("T")[0];
}
