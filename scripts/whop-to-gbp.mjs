/* ── Convert non-GBP Whop invoices to GBP ──
 * For each non-GBP row from this batch's import, set currency=GBP and
 * use gbp_equivalent as gross/net + line item unitPrice.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
try {
  const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");
const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// Whop payment IDs from the May/Jun 2026 CSV import
const TX_IDS = new Set([
  "pay_lp7CSp8K3lF97q", "pay_I3CRpOkQEGqRS4", "pay_vkmEoMmAySZ3mw",
  "pay_KnkwJ1FTzBaIhz", "pay_sGopiEyRRETUau", "pay_cvPxwEzVhm5VFk",
  "pay_U2IqyDhpjtr8CT", "pay_cHsqshoJoYPIOY", "pay_gBewHIOGX79oKe",
  "pay_qhPKbeCDLfUqcq", "pay_yJEhd97zc0OXTm", "pay_jNdWoplIo6irAw",
  "pay_FQDaZl80fB4KAa",
]);

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  const r = await fetch(`${SB_URL}/rest/v1/finance_invoices_issued?select=id,data`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const all = await r.json();
  const targets = all.filter((row) => TX_IDS.has(row.data?.source_transaction_id));
  console.log(`Found ${targets.length} target Whop rows from this batch`);

  let converted = 0, skipped = 0, failed = 0;
  for (const row of targets) {
    const d = row.data;
    const cur = (d.currency || "").toUpperCase();
    if (cur === "GBP") { skipped++; continue; }
    const newGross = Number(d.gbp_equivalent || 0);
    if (!newGross) { skipped++; continue; }
    const newItems = (d.items || []).map((it) => ({
      ...it,
      unitPrice: newGross,
    }));
    const oldNote = d.notes || "";
    const fxNote = `Originally ${cur} ${d.gross_amount}; converted to GBP ${newGross.toFixed(2)} at import-time rate.`;
    const newData = {
      ...d,
      currency: "GBP",
      gross_amount: newGross,
      net_amount: newGross,
      items: newItems,
      notes: oldNote.includes("converted to GBP") ? oldNote : `${oldNote} ${fxNote}`.trim(),
    };
    console.log(`  ${APPLY ? "→" : "?"}  ${d.invoice_number}  ${d.client_name.padEnd(22)} ${cur} ${d.gross_amount} → GBP ${newGross.toFixed(2)}`);
    if (!APPLY) { converted++; continue; }
    try {
      const res = await fetch(`${SB_URL}/rest/v1/finance_invoices_issued?id=eq.${row.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      converted++;
    } catch (e) {
      failed++;
      console.log(`     FAILED: ${e.message}`);
    }
  }
  console.log("");
  console.log(`Summary: ${APPLY ? "Converted" : "Would convert"}: ${converted}, Already GBP: ${skipped}, Failed: ${failed}`);
  if (!APPLY) console.log("Add --apply to update.");
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
