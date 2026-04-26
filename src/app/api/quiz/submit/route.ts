import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { validateSubmission } from "@/lib/quiz/validation";
import { computeLeadTier } from "@/lib/quiz/tier";
import { fromRow, type QuizSubmissionRow } from "@/lib/quiz/types";
import {
  CRO_LABELS,
  PAIN_LABELS,
  REVENUE_LABELS,
  TRAFFIC_LABELS,
  VERTICAL_LABELS,
} from "@/lib/quiz/questions";
import { postSlackMessage, getOpsChannelId, getAppUrl } from "@/lib/slack-bot";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validation handles email typo correction + store URL normalisation
  const result = validateSubmission(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, field: result.field }, { status: 400 });
  }
  const data = result.value;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const tier = computeLeadTier(data.revenue, data.croHistory);

  // Insert. Supabase generates id + result_page_id (both UUID defaults).
  const insertPayload = {
    vertical: data.vertical,
    revenue: data.revenue,
    traffic_source: data.trafficSource,
    pain_point: data.painPoint,
    cro_history: data.croHistory,
    first_name: data.firstName,
    email: data.email,
    store_url: data.storeUrl,
    whatsapp: data.whatsapp || null,
    lead_tier: tier,
    source: data.source,
    referrer: data.referrer,
  };

  let row: QuizSubmissionRow;
  try {
    const { data: inserted, error } = await supabase
      .from("quiz_submissions")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    row = inserted as QuizSubmissionRow;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Save failed" }, { status: 500 });
  }

  const submission = fromRow(row);
  const resultUrl = `/quiz/results/${submission.resultPageId}`;

  // Fire-and-forget side effects — return the result URL immediately so the
  // user isn't waiting on Slack/email. Failures are logged but don't block.
  void notifySlackAndMark(submission);
  void postEmailNurtureAndMark(submission);

  return NextResponse.json({
    ok: true,
    id: submission.id,
    leadTier: submission.leadTier,
    resultUrl,
  });
}

// Slack notification — formatted to match the spec exactly.
async function notifySlackAndMark(submission: ReturnType<typeof fromRow>) {
  try {
    const channel = getOpsChannelId();
    if (!channel) return;

    const dashboardUrl = `${getAppUrl()}/sales-engine/quiz-leads`;
    const text = [
      `🎯 New quiz lead — Tier ${submission.leadTier}`,
      "",
      `${submission.firstName} — ${submission.storeUrl}`,
      `${VERTICAL_LABELS[submission.vertical]} • ${REVENUE_LABELS[submission.revenue]} • ${TRAFFIC_LABELS[submission.trafficSource]}`,
      "",
      `Pain point: ${PAIN_LABELS[submission.painPoint]}`,
      `CRO history: ${CRO_LABELS[submission.croHistory]}`,
      "",
      `Email: ${submission.email}`,
      `WhatsApp: ${submission.whatsapp || "not provided"}`,
      "",
      `→ Dashboard: ${dashboardUrl}`,
    ].join("\n");

    const res = await postSlackMessage(channel, text);
    if (res?.ok) {
      await supabase.from("quiz_submissions").update({ slack_sent: true }).eq("id", submission.id);
    }
  } catch (err) {
    console.error("[quiz/submit] Slack notification failed:", err);
  }
}

// POST to the local email nurture webhook stub. Same fire-and-forget pattern.
async function postEmailNurtureAndMark(submission: ReturnType<typeof fromRow>) {
  try {
    const url = `${getAppUrl()}/api/webhooks/email-nurture`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: submission.id,
        leadTier: submission.leadTier,
        firstName: submission.firstName,
        email: submission.email,
        storeUrl: submission.storeUrl,
        vertical: submission.vertical,
        revenue: submission.revenue,
        trafficSource: submission.trafficSource,
        painPoint: submission.painPoint,
        croHistory: submission.croHistory,
      }),
    });
    if (res.ok) {
      await supabase.from("quiz_submissions").update({ email_sent: true }).eq("id", submission.id);
    }
  } catch (err) {
    console.error("[quiz/submit] Email nurture webhook failed:", err);
  }
}
