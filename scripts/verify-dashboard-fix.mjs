#!/usr/bin/env node
/* Verify the new invoiceTotalsGbp logic produces the right rollup.
 * Replicates the updated calc.ts ratio approach in pure JS. */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: rows } = await sb.from("finance_invoices_issued").select("data");

const round2 = (n) => Math.round(n * 100) / 100;

let sumGrossGbp = 0;
let sumNetGbp = 0;
let sumVatGbp = 0;
for (const r of rows) {
  const inv = r.data;
  if (inv.status === "draft" || inv.status === "disputed") continue;
  if (typeof inv.gbp_equivalent === "number" && typeof inv.gross_amount === "number" && inv.gross_amount > 0) {
    const ratio = inv.gbp_equivalent / inv.gross_amount;
    sumNetGbp += round2((inv.net_amount || 0) * ratio);
    sumVatGbp += round2((inv.vat_amount || 0) * ratio);
    sumGrossGbp += inv.gbp_equivalent;
  }
}

const fmt = (n) => `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
console.log("══════ Post-fix dashboard rollup (simulating new invoiceTotalsGbp) ══════");
console.log(`sum(grossGbp) — what the dashboard's 'Revenue (gross)' card will show:  ${fmt(sumGrossGbp)}`);
console.log(`sum(netGbp)   — what 'Revenue (net of VAT)' will show:                   ${fmt(sumNetGbp)}`);
console.log(`sum(vatGbp)   — what 'VAT collected' will show:                          ${fmt(sumVatGbp)}`);
console.log(`net + vat (sanity check, should = gross):                                ${fmt(sumNetGbp + sumVatGbp)}`);
console.log(`\nExpected: £676,130.94 across the board (vat is 0 on all historical rows)`);
