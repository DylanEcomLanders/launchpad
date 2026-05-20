#!/usr/bin/env node
/* One-off: patch 4 historical GBP invoices where gross_amount + net_amount
 * + items[0].unitPrice all hold an inflated number that doesn't match
 * gbp_equivalent. Likely an import quirk where a Stripe customer LTV got
 * jammed into gross_amount instead of the single-transaction value.
 *
 * Strategy: trust gbp_equivalent (matches user's source-of-truth £676k
 * total) and overwrite the other three to match it. vat_amount stays 0
 * since these are all pre_vat_registration historical rows. */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TARGETS = [
  "EL-2024-002",
  "EL-2024-006",
  "EL-2024-009",
  "EL-2024-013",
];

const { data: rows, error } = await sb.from("finance_invoices_issued").select("id, data");
if (error) { console.error(error); process.exit(1); }

const fmt = (n) => `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const matches = rows.filter((r) => TARGETS.includes(r.data?.invoice_number));
if (matches.length !== TARGETS.length) {
  console.error(`Expected ${TARGETS.length} matches, got ${matches.length}. Aborting.`);
  process.exit(1);
}

console.log(`Patching ${matches.length} invoices...\n`);
let totalDelta = 0;

for (const row of matches) {
  const d = row.data;
  const truth = Number(d.gbp_equivalent || 0);
  const oldGross = Number(d.gross_amount || 0);
  const delta = oldGross - truth;
  totalDelta += delta;

  const patched = {
    ...d,
    gross_amount: truth,
    net_amount: truth,
    vat_amount: 0,
    items: (d.items || []).map((it, idx) => idx === 0 ? { ...it, unitPrice: truth, quantity: 1 } : it),
    updated_at: new Date().toISOString(),
    notes: ((d.notes || "") + (d.notes ? "\n" : "") + `[2026-05-20 patch] Reset gross/net from ${fmt(oldGross)} to gbp_equivalent (${fmt(truth)}). Original gross_amount looked like a Stripe customer LTV rather than a single-transaction value.`).trim(),
  };

  const { error: updErr } = await sb
    .from("finance_invoices_issued")
    .update({ data: patched })
    .eq("id", row.id);

  if (updErr) {
    console.error(`Failed to patch ${d.invoice_number}: ${updErr.message}`);
    continue;
  }
  console.log(`✓ ${d.invoice_number}  ${d.client_name?.padEnd(35)}  ${fmt(oldGross).padStart(13)} → ${fmt(truth).padStart(13)}  (-${fmt(delta)})`);
}

console.log(`\nTotal revenue removed from rollups: ${fmt(totalDelta)}`);
console.log(`New all-time revenue should now equal: £676,130.94`);
