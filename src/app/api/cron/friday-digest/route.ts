import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { postSlackMessage, getOpsChannelId } from "@/lib/slack-bot";
import { isNotificationEnabled } from "@/lib/notification-settings";

/**
 * GET /api/cron/friday-digest
 * Runs Friday 4:30pm — posts a weekly digest to #ops summarising
 * what was completed, what moved forward, blockers, and overdue items.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isNotificationEnabled("friday_digest"))) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const opsChannel = getOpsChannelId();
  if (!opsChannel) {
    return NextResponse.json({ ok: false, error: "No ops channel configured" });
  }

  const today = new Date();
  const mondayStart = getMonday(today);
  const monday = new Date(mondayStart + "T00:00:00");

  // Fetch all active portals
  const { data: portals, error } = await supabase
    .from("client_portals")
    .select("id, client_name, client_type, phases, projects, blocker, weekly_deliverables, deleted_at")
    .is("deleted_at", null);

  if (error || !portals) {
    return NextResponse.json({ ok: false, error: error?.message });
  }

  // ── Collect digest data ───────────────────────────────────
  const completed: string[] = [];
  const movedForward: string[] = [];
  const blocked: string[] = [];
  const overdue: string[] = [];
  let retainerReportsUploaded = 0;
  let retainerTotal = 0;

  for (const portal of portals) {
    const isRetainer = portal.client_type === "retainer";
    if (isRetainer) retainerTotal++;

    // Check blocker
    if (portal.blocker && !portal.blocker.resolved_at) {
      const reason = portal.blocker.reason || "No reason";
      const since = portal.blocker.created_at
        ? new Date(portal.blocker.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "unknown";
      const daysBlocked = portal.blocker.created_at
        ? Math.round((today.getTime() - new Date(portal.blocker.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      blocked.push(`• *${portal.client_name}* — ${reason} (${daysBlocked} days)`);
    }

    // Check all phases (top-level + projects)
    const allPhases: Array<{ name: string; endDate?: string; deadline?: string; status: string; completedDate?: string; projectName?: string }> = [];

    for (const phase of portal.phases || []) {
      allPhases.push(phase);
    }
    for (const project of portal.projects || []) {
      for (const phase of project.phases || []) {
        allPhases.push({ ...phase, projectName: project.name });
      }
    }

    for (const phase of allPhases) {
      const label = phase.projectName ? `${phase.name} (${phase.projectName})` : phase.name;

      // Completed this week
      if (phase.status === "complete" && phase.completedDate) {
        const completedAt = new Date(phase.completedDate);
        if (completedAt >= monday) {
          completed.push(`• *${portal.client_name}* — ${label} completed`);
        }
      }

      // In-progress (moved forward)
      if (phase.status === "in-progress") {
        movedForward.push(`• *${portal.client_name}* — ${label}`);
      }

      // Overdue
      if (phase.status !== "complete") {
        const deadline = phase.endDate || phase.deadline;
        if (deadline) {
          const deadlineDate = new Date(deadline);
          if (deadlineDate < today) {
            const daysOver = Math.round((today.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
            overdue.push(`• *${portal.client_name}* — ${label} (${daysOver} day${daysOver > 1 ? "s" : ""} overdue)`);
          }
        }
      }
    }

    // Retainer report check
    if (isRetainer) {
      const weeklyDeliverables = portal.weekly_deliverables || [];
      const hasReport = weeklyDeliverables.some(
        (w: any) => w.week_start === mondayStart && w.report_url
      );
      if (hasReport) retainerReportsUploaded++;
    }
  }

  // ── Build message ─────────────────────────────────────────
  const weekLabel = monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const sections: string[] = [];

  if (completed.length > 0) {
    sections.push(`*✅ Completed this week:*\n${completed.join("\n")}`);
  } else {
    sections.push("*✅ No phases completed this week.*");
  }

  if (movedForward.length > 0) {
    sections.push(`*🔄 In progress:*\n${movedForward.join("\n")}`);
  }

  if (blocked.length > 0) {
    sections.push(`*🛑 Still blocked (${blocked.length}):*\n${blocked.join("\n")}`);
  }

  if (overdue.length > 0) {
    sections.push(`*🚨 Overdue (${overdue.length}):*\n${overdue.join("\n")}`);
  }

  if (retainerTotal > 0) {
    sections.push(`*📊 Retainer reports uploaded:* ${retainerReportsUploaded}/${retainerTotal}`);
  }

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 Weekly Digest — w/c ${weekLabel}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: sections.join("\n\n") },
    },
  ];

  await postSlackMessage(opsChannel, `📊 Weekly Digest — w/c ${weekLabel}`, blocks);

  return NextResponse.json({ ok: true, completed: completed.length, overdue: overdue.length, blocked: blocked.length });
}

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split("T")[0];
}
