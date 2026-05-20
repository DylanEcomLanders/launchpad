/* ── Email an invoice PDF to the client ──
 *
 * Browser generates the PDF (via @react-pdf/renderer) and posts it as
 * base64. We send it through Resend as an attachment.
 *
 * Keeps the PDF generation client-side so this route doesn't need a
 * react-pdf install on the server, and lets the user preview before
 * sending. The trade-off is bandwidth (the PDF travels twice), but
 * invoices are small.
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";
import type { InvoiceIssued, CompanyProfile } from "@/lib/finance/types";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.FINANCE_INVOICE_FROM || "Ecomlanders <noreply@ecomlanders.com>";

export async function POST(req: NextRequest) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;

  if (!resend) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.invoice_id !== "string" ||
    typeof body.pdf_base64 !== "string" ||
    typeof body.filename !== "string"
  ) {
    return NextResponse.json(
      { error: "Body must include invoice_id, pdf_base64, filename" },
      { status: 400 },
    );
  }

  let sb;
  try {
    sb = financeServerClient();
  } catch (err) {
    if (err instanceof FinanceConfigError) {
      return NextResponse.json(
        { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    throw err;
  }
  const { data: invRow, error: invErr } = await sb
    .from("finance_invoices_issued")
    .select("data")
    .eq("id", body.invoice_id)
    .maybeSingle();
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
  if (!invRow) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const invoice = (invRow as { data: InvoiceIssued }).data;

  if (!invoice.client_email) {
    return NextResponse.json(
      { error: "Invoice has no client email" },
      { status: 400 },
    );
  }

  const { data: profRow } = await sb
    .from("finance_company_profile")
    .select("data")
    .eq("id", "default")
    .maybeSingle();
  const profile = profRow ? (profRow as { data: CompanyProfile }).data : null;

  const senderName = profile?.legal_name || "Ecomlanders";
  const subject = `Invoice ${invoice.invoice_number} from ${senderName}`;
  const greeting = invoice.contact_name ? `Hi ${invoice.contact_name.split(/\s+/)[0]},` : "Hi,";
  const text = [
    greeting,
    "",
    `Please find attached invoice ${invoice.invoice_number} for ${invoice.client_name}.`,
    "",
    `Amount due: see attached PDF.`,
    invoice.due_date ? `Due date: ${invoice.due_date}.` : "",
    invoice.payment_term ? `Payment terms: ${invoice.payment_term}.` : "",
    "",
    `Thanks,`,
    senderName,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const send = await resend.emails.send({
      from: FROM,
      to: invoice.client_email,
      subject,
      text,
      attachments: [
        {
          filename: body.filename,
          content: body.pdf_base64,
        },
      ],
    });
    if (send.error) {
      return NextResponse.json({ error: send.error.message }, { status: 500 });
    }
    // Stamp sent_date if not set
    if (!invoice.sent_date) {
      const next = {
        ...invoice,
        sent_date: new Date().toISOString(),
        status: invoice.status === "draft" ? "sent" : invoice.status,
        updated_at: new Date().toISOString(),
      };
      await sb
        .from("finance_invoices_issued")
        .update({ data: next })
        .eq("id", body.invoice_id);
    }
    return NextResponse.json({ ok: true, message_id: send.data?.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 },
    );
  }
}
