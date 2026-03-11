import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * POST /api/portal/notify
 * Send an email notification to the client about their portal.
 *
 * Body: { clientEmail, clientName, portalToken, type, title? }
 * type: "update" | "approval_request" | "welcome"
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { clientEmail, clientName, portalToken, type, title } = body;

  if (!clientEmail || !portalToken) {
    return NextResponse.json(
      { error: "clientEmail and portalToken are required" },
      { status: 400 }
    );
  }

  if (!resend) {
    console.warn("[portal/notify] RESEND_API_KEY not configured — skipping email");
    return NextResponse.json({ sent: false, reason: "No API key configured" });
  }

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://launchpad.ecomlanders.com"}/portal/${portalToken}`;

  const subjects: Record<string, string> = {
    update: `New update on your project — ${clientName || "Your Portal"}`,
    approval_request: `Action needed: Approve deliverables — ${clientName || "Your Portal"}`,
    welcome: `Your project portal is ready — ${clientName || "Welcome"}`,
  };

  const bodies: Record<string, string> = {
    update: [
      `Hi ${clientName || "there"},`,
      "",
      `We've posted a new update${title ? `: "${title}"` : ""} to your project portal.`,
      "",
      `View it here: ${portalUrl}`,
      "",
      "— The Ecomlanders Team",
    ].join("\n"),
    approval_request: [
      `Hi ${clientName || "there"},`,
      "",
      "There are deliverables ready for your review and approval.",
      "",
      `Head to your portal to review: ${portalUrl}`,
      "",
      "— The Ecomlanders Team",
    ].join("\n"),
    welcome: [
      `Hi ${clientName || "there"},`,
      "",
      "Your project portal is now live! You can track progress, view updates, and approve deliverables all in one place.",
      "",
      `Access your portal: ${portalUrl}`,
      "",
      "— The Ecomlanders Team",
    ].join("\n"),
  };

  try {
    const { error } = await resend.emails.send({
      from: "Ecomlanders <noreply@ecomlanders.com>",
      to: clientEmail,
      subject: subjects[type] || subjects.update,
      text: bodies[type] || bodies.update,
    });

    if (error) {
      console.error("[portal/notify] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[portal/notify] Failed to send:", err);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
