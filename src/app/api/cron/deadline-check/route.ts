import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { postSlackMessage, getAppUrl } from "@/lib/slack-bot";
import { isNotificationEnabled } from "@/lib/notification-settings";

/**
 * GET /api/cron/deadline-check
 * Runs daily — checks all active portals for phase deadlines
 * that are due in 2 days or overdue. Posts to internal Slack channel.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isNotificationEnabled("deadline_warnings"))) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const APP_URL = getAppUrl();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all active portals (not soft-deleted)
  const { data: portals, error } = await supabase
    .from("client_portals")
    .select("id, client_name, phases, slack_internal_channel_id, team_member_ids, projects, deleted_at")
    .is("deleted_at", null);

  if (error || !portals) {
    console.error("[deadline-check] Failed to fetch portals:", error);
    return NextResponse.json({ ok: false, error: error?.message });
  }

  // Load team members for name lookups
  const { data: settingsRows } = await supabase
    .from("business_settings")
    .select("data")
    .eq("id", "business-settings-singleton")
    .limit(1);

  const team = settingsRows?.[0]?.data?.team || [];

  let notificationsSent = 0;

  for (const portal of portals) {
    const channelId = portal.slack_internal_channel_id;
    if (!channelId) continue;

    // Check phases on the portal itself
    const phases = portal.phases || [];
    for (const phase of phases) {
      if (phase.status === "complete") continue;
      const deadline = phase.endDate || phase.deadline;
      if (!deadline) continue;

      const deadlineDate = new Date(deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const portalUrl = `${APP_URL}/tools/client-portal/${portal.id}`;

      if (daysUntil === 2) {
        // 2 days warning
        const dateStr = deadlineDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
        await postSlackMessage(channelId, `⏰ ${phase.name} for ${portal.client_name} is due in 2 days`, [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `⏰ *Heads up* — *${phase.name}* for *${portal.client_name}* is due in 2 days (${dateStr})`,
            },
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: `<${portalUrl}|View in Portal →>` }],
          },
        ]);
        notificationsSent++;
      } else if (daysUntil < 0) {
        // Overdue
        const daysOverdue = Math.abs(daysUntil);
        const dateStr = deadlineDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
        await postSlackMessage(channelId, `🚨 ${phase.name} for ${portal.client_name} is overdue`, [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🚨 *Overdue* — *${phase.name}* for *${portal.client_name}* was due ${dateStr} (${daysOverdue} day${daysOverdue > 1 ? "s" : ""} ago)`,
            },
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: `<${portalUrl}|View in Portal →>` }],
          },
        ]);
        notificationsSent++;
      }
    }

    // Also check phases within projects
    const projects = portal.projects || [];
    for (const project of projects) {
      const projectPhases = project.phases || [];
      for (const phase of projectPhases) {
        if (phase.status === "complete") continue;
        const deadline = phase.endDate || phase.deadline;
        if (!deadline) continue;

        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const portalUrl = `${APP_URL}/tools/client-portal/${portal.id}`;
        const label = project.name ? `${phase.name} (${project.name})` : phase.name;

        if (daysUntil === 2) {
          const dateStr = deadlineDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
          await postSlackMessage(channelId, `⏰ ${label} for ${portal.client_name} is due in 2 days`, [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `⏰ *Heads up* — *${label}* for *${portal.client_name}* is due in 2 days (${dateStr})`,
              },
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `<${portalUrl}|View in Portal →>` }],
            },
          ]);
          notificationsSent++;
        } else if (daysUntil < 0) {
          const daysOverdue = Math.abs(daysUntil);
          const dateStr = deadlineDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
          await postSlackMessage(channelId, `🚨 ${label} for ${portal.client_name} is overdue`, [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `🚨 *Overdue* — *${label}* for *${portal.client_name}* was due ${dateStr} (${daysOverdue} day${daysOverdue > 1 ? "s" : ""} ago)`,
              },
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `<${portalUrl}|View in Portal →>` }],
            },
          ]);
          notificationsSent++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, notificationsSent });
}
