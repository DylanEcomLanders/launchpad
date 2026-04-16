/* ── Onboarding Form Submission API ──
 * Saves to Supabase, pings Slack ops channel
 */

import { NextRequest, NextResponse } from "next/server";
import { onboardingStore, type OnboardingSubmission } from "@/lib/onboarding";
import { postSlackMessage, getOpsChannelId, getAppUrl } from "@/lib/slack-bot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const submission: OnboardingSubmission = {
      id: crypto.randomUUID(),
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
      pm_checklist: {
        shopify_access_requested: false,
        shopify_access_confirmed: false,
        info_verified: false,
        brand_assets_received: false,
        slack_channel_created: false,
      },
    };

    await onboardingStore.create(submission);

    // Ping Slack ops channel
    const opsChannel = getOpsChannelId();
    if (opsChannel) {
      const appUrl = getAppUrl();
      await postSlackMessage(opsChannel, `New onboarding submission: ${submission.company_name}`, [
        {
          type: "header",
          text: { type: "plain_text", text: `🚀 New Onboarding: ${submission.company_name}` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Website:*\n<${submission.website_url}|${submission.website_url}>` },
            { type: "mrkdwn", text: `*Store:*\n${submission.myshopify_url}` },
            { type: "mrkdwn", text: `*Contact:*\n${submission.primary_contact}` },
            { type: "mrkdwn", text: `*Goal:*\n${submission.primary_goal}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Brief:*\n${submission.brief_description.slice(0, 200)}${submission.brief_description.length > 200 ? "..." : ""}` },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "View in Launchpad" },
              url: `${appUrl}/tools/onboarding-inbox`,
              style: "primary",
            },
          ],
        },
      ]);
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (err) {
    console.error("Onboarding submit error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
