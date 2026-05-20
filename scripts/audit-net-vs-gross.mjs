#!/usr/bin/env node
/* Audit: where does the dashboard's revenue calc diverge from gbp_equivalent?
 *
 * Dashboard formula: revenueGross = sum(net_amount) + sum(vat_amount)
 * Source of truth:   sum(gbp_equivalent)
 *
 * If the two ever diverge per-row, the dashboard will over/under-report. */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: rows } = await sb.from("finance_invoices_issued").select("id, data");
const invoices = rows.map((r) => ({ id: r.id, ...r.data }));
const fmt = (n) => `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let sumGbpEq = 0;
let sumNetPlusVat = 0;
let sumGrossNative = 0;
let sumNet = 0;
let sumVat = 0;
for (const i of invoices) {
  sumGbpEq += Number(i.gbp_equivalent || 0);
  sumNetPlusVat += Number(i.net_amount || 0) + Number(i.vat_amount || 0);
  sumGrossNative += Number(i.gross_amount || 0);
  sumNet += Number(i.net_amount || 0);
  sumVat += Number(i.vat_amount || 0);
}

console.log("══════ Sum comparison (all 221 invoices, all-time) ══════");
console.log(`sum(gbp_equivalent):       ${fmt(sumGbpEq)}   ← source of truth`);
console.log(`sum(net_amount)+sum(vat):  ${fmt(sumNetPlusVat)}   ← what the dashboard computes`);
console.log(`sum(gross_amount native):  ${fmt(sumGrossNative)}   ← native currency total, ignored if mixed`);
console.log(`  sum(net_amount): ${fmt(sumNet)}`);
console.log(`  sum(vat_amount): ${fmt(sumVat)}`);
console.log(`\ndelta dashboard - truth:    ${fmt(sumNetPlusVat - sumGbpEq)}`);

// ───── Per-row divergences ─────
console.log("\n══════ Invoices where net+vat ≠ gbp_equivalent ══════");
const divergent = invoices
  .map((i) => {
    const computed = Number(i.net_amount || 0) + Number(i.vat_amount || 0);
    const truth = Number(i.gbp_equivalent || 0);
    return { i, computed, truth, delta: computed - truth };
  })
  .filter((x) => Math.abs(x.delta) > 0.01)
  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

console.log(`${divergent.length} of 221 rows diverge (>1p)`);
console.log(`total over/under-statement: ${fmt(divergent.reduce((s, x) => s + x.delta, 0))}`);
if (divergent.length > 0) {
  console.log(`\nTop 20 by absolute delta:`);
  console.log("inv#                date        client                          currency  gross_native  gbp_equiv     net           vat           delta");
  for (const x of divergent.slice(0, 20)) {
    const { i, delta } = x;
    console.log(
      `${(i.invoice_number || "").padEnd(18)}  ${(i.invoice_date || "").padEnd(10)}  ${(i.client_name || "").slice(0, 30).padEnd(30)}  ${(i.currency || "").padEnd(8)}  ${fmt(i.gross_amount || 0).padStart(12)}  ${fmt(i.gbp_equivalent || 0).padStart(12)}  ${fmt(i.net_amount || 0).padStart(12)}  ${fmt(i.vat_amount || 0).padStart(12)}  ${(delta >= 0 ? "+" : "") + fmt(delta).padStart(11)}`,
    );
  }
}

// ───── Currency breakdown ─────
console.log("\n══════ Per-currency breakdown ══════");
const byCcy = {};
for (const i of invoices) {
  const c = i.currency || "(none)";
  byCcy[c] = byCcy[c] || { count: 0, gbpEq: 0, native: 0, netPlusVat: 0 };
  byCcy[c].count++;
  byCcy[c].gbpEq += Number(i.gbp_equivalent || 0);
  byCcy[c].native += Number(i.gross_amount || 0);
  byCcy[c].netPlusVat += Number(i.net_amount || 0) + Number(i.vat_amount || 0);
}
console.log("currency  count  gbp_equiv         net+vat (dashboard)   native total       delta");
for (const [c, v] of Object.entries(byCcy).sort((a, b) => b[1].gbpEq - a[1].gbpEq)) {
  console.log(`${c.padEnd(8)}  ${String(v.count).padStart(5)}  ${fmt(v.gbpEq).padStart(15)}  ${fmt(v.netPlusVat).padStart(20)}  ${fmt(v.native).padStart(15)}  ${fmt(v.netPlusVat - v.gbpEq).padStart(11)}`);
}

// ───── Status breakdown ─────
console.log("\n══════ Per-status breakdown ══════");
const byStatus = {};
for (const i of invoices) {
  const s = i.status || "(none)";
  byStatus[s] = byStatus[s] || { count: 0, gbpEq: 0, netPlusVat: 0 };
  byStatus[s].count++;
  byStatus[s].gbpEq += Number(i.gbp_equivalent || 0);
  byStatus[s].netPlusVat += Number(i.net_amount || 0) + Number(i.vat_amount || 0);
}
console.log("status    count  gbp_equiv         net+vat (dashboard)");
for (const [s, v] of Object.entries(byStatus).sort((a, b) => b[1].gbpEq - a[1].gbpEq)) {
  console.log(`${s.padEnd(10)}  ${String(v.count).padStart(3)}  ${fmt(v.gbpEq).padStart(15)}  ${fmt(v.netPlusVat).padStart(20)}`);
}
