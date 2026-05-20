#!/usr/bin/env node
/* Audit invoice revenue against the source-of-truth expected numbers.
 * Runs 5 jsonb-aware queries equivalent to the founder's flat-schema SQL. */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}
const sb = createClient(url, key);

const { data: rows, error } = await sb
  .from("finance_invoices_issued")
  .select("id, data");
if (error) {
  console.error("Read error:", error);
  process.exit(1);
}

const invoices = rows.map((r) => ({ id: r.id, ...r.data }));
const fmt = (n) => `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ───── Q1: total count + revenue ─────
console.log("\n══════ Q1: Total invoice count and revenue ══════");
const total = invoices.reduce((s, i) => s + Number(i.gbp_equivalent || 0), 0);
console.log(`total_invoices: ${invoices.length}`);
console.log(`total_revenue:  ${fmt(total)}`);
console.log(`expected:       221 invoices, ~£676,131`);
console.log(`delta:          ${fmt(total - 676131)} (${invoices.length - 221} more invoices than expected)`);

// ───── Q2: breakdown by source ─────
console.log("\n══════ Q2: Breakdown by source_system ══════");
const bySource = {};
for (const i of invoices) {
  const s = i.source_system || "(none)";
  bySource[s] = bySource[s] || { count: 0, total: 0 };
  bySource[s].count++;
  bySource[s].total += Number(i.gbp_equivalent || 0);
}
const sorted = Object.entries(bySource).sort((a, b) => b[1].total - a[1].total);
console.log("source           count   total");
console.log("-------          -----   --------");
for (const [s, v] of sorted) {
  console.log(`${s.padEnd(16)} ${String(v.count).padStart(5)}   ${fmt(v.total)}`);
}
console.log("\nexpected:");
console.log("stripe          96    ~£287,787");
console.log("whop            51    ~£172,377");
console.log("wise            49    ~£130,296");
console.log("tide_direct     21    ~£61,673");
console.log("shopify          4    ~£23,998");

// ───── Q3: duplicates (same client_id + issue_date + amount) ─────
console.log("\n══════ Q3: Duplicates (same client_id + invoice_date + gbp_equivalent) ══════");
const dupMap = new Map();
for (const i of invoices) {
  const key = `${i.client_id || "(none)"}|${i.invoice_date}|${Number(i.gbp_equivalent || 0).toFixed(2)}`;
  if (!dupMap.has(key)) dupMap.set(key, []);
  dupMap.get(key).push(i);
}
const dups = [...dupMap.entries()].filter(([, v]) => v.length > 1);
if (dups.length === 0) {
  console.log("0 duplicate groups found ✓");
} else {
  console.log(`${dups.length} duplicate group(s) found:`);
  for (const [k, group] of dups.sort((a, b) => b[1].length - a[1].length)) {
    const [cid, date, amount] = k.split("|");
    console.log(`\n  client_id=${cid} date=${date} amount=£${amount}  (${group.length} rows)`);
    for (const g of group) {
      console.log(`    - ${g.invoice_number}  ${g.client_name}  source=${g.source_system}  id=${g.id}`);
    }
  }
}

// ───── Q4: pre-incorporation invoices ─────
console.log("\n══════ Q4: Pre-incorporation invoices (issue_date < 2025-03-11) ══════");
const preIncorp = invoices.filter((i) => i.invoice_date && i.invoice_date < "2025-03-11");
const preTotal = preIncorp.reduce((s, i) => s + Number(i.gbp_equivalent || 0), 0);
console.log(`pre_incorp_count: ${preIncorp.length}`);
console.log(`pre_incorp_total: ${fmt(preTotal)}`);
if (preIncorp.length > 0) {
  console.log("rows:");
  for (const i of preIncorp.sort((a, b) => a.invoice_date.localeCompare(b.invoice_date))) {
    console.log(`  ${i.invoice_number}  ${i.invoice_date}  ${i.client_name}  ${fmt(i.gbp_equivalent || 0)}  source=${i.source_system}`);
  }
}

// ───── Q5: non-revenue items ─────
console.log("\n══════ Q5: Non-revenue items (Landing Pages / Ajay / Dylan / Sophie / Shirt in a Box / Revolut) ══════");
const patterns = [/landing pages/i, /ajay jani/i, /dylan evans/i, /sophie campbell/i, /shirt in a box/i, /revolut/i];
const nonRev = invoices.filter((i) => {
  const name = (i.client_name || "").trim();
  return patterns.some((p) => p.test(name));
});
if (nonRev.length === 0) {
  console.log("0 rows ✓");
} else {
  console.log(`${nonRev.length} row(s) found:`);
  const nonRevTotal = nonRev.reduce((s, i) => s + Number(i.gbp_equivalent || 0), 0);
  for (const i of nonRev.sort((a, b) => a.invoice_date.localeCompare(b.invoice_date))) {
    console.log(`  ${i.invoice_number}  ${i.invoice_date}  ${i.client_name.padEnd(30)}  ${fmt(i.gbp_equivalent || 0).padStart(12)}  source=${i.source_system}`);
  }
  console.log(`  total: ${fmt(nonRevTotal)}`);
}

console.log("\n══════ End of audit ══════\n");
