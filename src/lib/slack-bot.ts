/**
 * Server-side Slack bot helper — posts messages using SLACK_BOT_TOKEN.
 * Used by cron routes and API endpoints.
 */

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";

export async function postSlackMessage(channel: string, text: string, blocks?: any[]) {
  if (!BOT_TOKEN || !channel) return { ok: false, error: "missing_config" };

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
    body: JSON.stringify({ channel, text, ...(blocks ? { blocks } : {}) }),
  });

  return res.json();
}

export function getOpsChannelId(): string {
  return process.env.SLACK_OPS_CHANNEL_ID || "";
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://ecomlanders.app";
}
