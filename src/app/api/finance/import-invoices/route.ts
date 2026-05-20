/* ── Bulk import invoices from a CSV ──
 *
 * Accepts: multipart/form-data with `file` (the CSV)
 *           OR application/json with { csv: string }
 *
 * Behaviour: parses, upserts clients by name, creates invoices with
 * snapshotted client fields. Idempotent on invoice_number — if a row
 * with the same number exists, it's skipped (not overwritten) and
 * reported in the `skipped` count.
 *
 * Returns: { imported, skipped, clientsCreated, errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";
import { parseInvoiceCsv, findClient } from "@/lib/finance/csv-import";
import type { Client, InvoiceIssued } from "@/lib/finance/types";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowISO(): string {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;

  let csvText = "";
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      csvText = String(body?.csv || "");
    } else {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
      csvText = await file.text();
    }
  } catch {
    return NextResponse.json({ error: "Could not read CSV" }, { status: 400 });
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
  }

  const parsed = parseInvoiceCsv(csvText);

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

  // Load existing clients + invoice numbers up front so we can match
  // and dedupe in memory rather than round-tripping per row.
  const { data: clientRows, error: clientsErr } = await sb
    .from("finance_clients")
    .select("id, data");
  if (clientsErr) {
    return NextResponse.json({ error: clientsErr.message }, { status: 500 });
  }
  const existingClients: Client[] = (clientRows || []).map(
    (r: Record<string, unknown>) => ({
      ...(r.data as object),
      id: r.id as string,
    }) as Client,
  );
  const clientsByLowerName = new Map(
    existingClients.map((c) => [c.name.trim().toLowerCase(), c]),
  );

  const { data: invoiceRows, error: invoicesErr } = await sb
    .from("finance_invoices_issued")
    .select("data");
  if (invoicesErr) {
    return NextResponse.json({ error: invoicesErr.message }, { status: 500 });
  }
  const existingInvoiceNumbers = new Set(
    (invoiceRows || [])
      .map((r: Record<string, unknown>) => {
        const d = r.data as Record<string, unknown>;
        return (d?.invoice_number as string) || null;
      })
      .filter(Boolean),
  );

  let imported = 0;
  let skipped = 0;
  let clientsCreated = 0;
  const errors: string[] = [
    ...parsed.errors.map(
      (e) =>
        `Row ${e.row}${e.field ? ` (${e.field})` : ""}: ${e.message}`,
    ),
  ];

  for (const row of parsed.rows) {
    if (existingInvoiceNumbers.has(row.invoice.invoice_number)) {
      skipped++;
      continue;
    }

    // Upsert client by name.
    let client = clientsByLowerName.get(row.clientName.trim().toLowerCase());
    if (!client) {
      client = findClient(
        { name: row.clientName, email: row.clientEmail },
        existingClients,
      ) || undefined;
    }
    if (!client) {
      const now = nowISO();
      const newClient: Client = {
        id: uid(),
        name: row.clientName.trim(),
        contact_name: row.clientContactName,
        email: row.clientEmail,
        address: row.clientAddress,
        country: row.clientCountry,
        created_at: now,
        updated_at: now,
      };
      const { id, ...rest } = newClient;
      const { error: insertClientErr } = await sb
        .from("finance_clients")
        .insert({ id, data: rest, created_at: now });
      if (insertClientErr) {
        errors.push(
          `Row ${row.row}: failed to create client "${row.clientName}": ${insertClientErr.message}`,
        );
        continue;
      }
      client = newClient;
      existingClients.push(newClient);
      clientsByLowerName.set(newClient.name.trim().toLowerCase(), newClient);
      clientsCreated++;
    }

    const now = nowISO();
    const invoice: InvoiceIssued = {
      ...row.invoice,
      id: uid(),
      client_id: client.id,
      created_at: now,
      updated_at: now,
    };
    const { id, ...rest } = invoice;
    const { error: insertInvErr } = await sb
      .from("finance_invoices_issued")
      .insert({ id, data: rest, created_at: now });
    if (insertInvErr) {
      errors.push(
        `Row ${row.row}: failed to insert invoice ${invoice.invoice_number}: ${insertInvErr.message}`,
      );
      continue;
    }
    existingInvoiceNumbers.add(invoice.invoice_number);
    imported++;
  }

  return NextResponse.json({
    imported,
    skipped,
    clientsCreated,
    errors,
  });
}
