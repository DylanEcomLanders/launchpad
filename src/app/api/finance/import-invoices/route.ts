/* ── Bulk import invoices from a CSV ──
 *
 * Accepts: multipart/form-data with `file` (the CSV) plus optional
 *           `dry_run` form field. JSON body is also supported:
 *           { csv: string, dry_run?: boolean }.
 *
 * Behaviour:
 *  - Parses the CSV.
 *  - Fills in blank invoice_numbers using tax-year-aware sequential
 *    numbering (EL-YYYY-NNN, counter resets at each UK tax year).
 *  - Upserts clients by name (case-insensitive); creates new ones when
 *    no match. Snapshots client fields onto each invoice.
 *  - Idempotent: skips invoice rows whose invoice_number already exists
 *    in the DB.
 *  - dry_run=true: parses + numbers + matches clients, returns what
 *    WOULD be written along with a `preview` array of the first 10
 *    rows for inspection. No DB writes happen.
 *
 * Returns: { imported, skipped, clientsCreated, errors[], preview? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";
import {
  parseInvoiceCsv,
  assignTaxYearInvoiceNumbers,
  findClient,
} from "@/lib/finance/csv-import";
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
  let dryRun = false;
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      csvText = String(body?.csv || "");
      dryRun = Boolean(body?.dry_run);
    } else {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
      csvText = await file.text();
      dryRun = String(form.get("dry_run") || "") === "true";
    }
  } catch {
    return NextResponse.json({ error: "Could not read CSV" }, { status: 400 });
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
  }

  const parsed = parseInvoiceCsv(csvText);

  // Fill in any blank invoice_numbers using UK-tax-year-aware sequencing.
  assignTaxYearInvoiceNumbers(parsed.rows, "EL");

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
      (e) => `Row ${e.row}${e.field ? ` (${e.field})` : ""}: ${e.message}`,
    ),
  ];

  // Build a preview of what the import would do (first 10 rows worth).
  const preview: Array<{
    row: number;
    invoice_number: string;
    invoice_date: string;
    client_name: string;
    currency: string;
    gross_amount: number;
    gbp_equivalent: number;
    source_system?: string;
    bank_account_received_into?: string;
    vat_treatment: string;
    status: string;
    will_create_client: boolean;
    will_skip: boolean;
  }> = [];

  for (const row of parsed.rows) {
    const willSkip = existingInvoiceNumbers.has(row.invoice.invoice_number);
    const matchedClient =
      clientsByLowerName.get(row.clientName.trim().toLowerCase()) ||
      findClient({ name: row.clientName, email: row.clientEmail }, existingClients) ||
      null;

    if (preview.length < 10) {
      preview.push({
        row: row.row,
        invoice_number: row.invoice.invoice_number,
        invoice_date: row.invoice.invoice_date,
        client_name: row.clientName,
        currency: row.invoice.currency,
        gross_amount: row.invoice.gross_amount,
        gbp_equivalent: row.invoice.gbp_equivalent,
        source_system: row.invoice.source_system,
        bank_account_received_into: row.invoice.bank_account_received_into,
        vat_treatment: row.invoice.vat_treatment,
        status: row.invoice.status,
        will_create_client: !matchedClient,
        will_skip: willSkip,
      });
    }

    if (dryRun) continue;
    if (willSkip) {
      skipped++;
      continue;
    }

    // Upsert client by name.
    let client: Client | undefined = matchedClient ?? undefined;
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

  // Dry-run summary: how many would create clients vs use existing, by tax year.
  if (dryRun) {
    const wouldCreateClients = new Set<string>();
    const taxYearTallies: Record<string, { count: number; gross: number }> = {};
    for (const row of parsed.rows) {
      const matched =
        clientsByLowerName.get(row.clientName.trim().toLowerCase()) ||
        findClient({ name: row.clientName, email: row.clientEmail }, existingClients);
      if (!matched) wouldCreateClients.add(row.clientName.trim().toLowerCase());
      const num = row.invoice.invoice_number;
      const prefix = num.split("-").slice(0, 2).join("-"); // "EL-2024"
      taxYearTallies[prefix] = taxYearTallies[prefix] ?? { count: 0, gross: 0 };
      taxYearTallies[prefix].count++;
      taxYearTallies[prefix].gross += row.invoice.gbp_equivalent || 0;
    }
    return NextResponse.json({
      dry_run: true,
      total_rows: parsed.rows.length,
      parse_errors: errors.length,
      would_create_clients: wouldCreateClients.size,
      would_skip_existing: parsed.rows.filter((r) =>
        existingInvoiceNumbers.has(r.invoice.invoice_number),
      ).length,
      tax_year_tallies: Object.fromEntries(
        Object.entries(taxYearTallies).map(([k, v]) => [
          k,
          { count: v.count, gross_gbp: Math.round(v.gross * 100) / 100 },
        ]),
      ),
      preview,
      errors,
    });
  }

  return NextResponse.json({
    imported,
    skipped,
    clientsCreated,
    errors,
    preview,
  });
}
