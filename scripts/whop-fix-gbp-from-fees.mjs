/* ── Fix the 7 non-GBP-native Whop rows from this batch to use dashboard GBP ──
 * Uses Payment processing percentage fee (in £) / 0.027 to derive the
 * original GBP merchant amount.
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

// Derived from Payment processing percentage fee / 0.027, rounded to nearest £
const FIXES = {
  "pay_I3CRpOkQEGqRS4": { gbp: 3800,  fee: 0,  note: "Clayton (Kevin Clacny)" },
  "pay_vkmEoMmAySZ3mw": { gbp: 2049,  fee: 0,  note: "Origin Drops (Bashir Ali)" },
  "pay_cvPxwEzVhm5VFk": { gbp: 2500,  fee: 0,  note: "Kuba (Jakub Sano)" },
  "pay_cHsqshoJoYPIOY": { gbp: 100,   fee: 0,  note: "Uvora (Nickolas Breazy)" },
  "pay_gBewHIOGX79oKe": { gbp: 100,   fee: 0,  note: "Brock EUR" },
  "pay_jNdWoplIo6irAw": { gbp: 250,   fee: 0,  note: "Brock CHF" },
  "pay_FQDaZl80fB4KAa": { gbp: 2999,  fee: 0,  note: "Iron Paws (Jahan Khubani)" },
};

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  const r = await fetch(`${SB_URL}/rest/v1/finance_invoices_issued?select=id,data`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const all = await r.json();
  const targets = all.filter((row) => FIXES[row.data?.source_transaction_id]);
  console.log(`Found ${targets.length} target rows`);

  let fixed = 0, failed = 0;
  for (const row of targets) {
    const d = row.data;
    const fix = FIXES[d.source_transaction_id];
    const oldGross = d.gross_amount;
    const newGross = fix.gbp;
    const newItems = (d.items || []).map((it) => ({ ...it, unitPrice: newGross }));
    const cleanedNotes = (d.notes || "")
      .replace(/Originally [^.]+converted to GBP [\d.]+ at import-time rate\./, "")
      .trim();
    const newNotes = `${cleanedNotes} GBP merchant amount derived from Whop fee breakdown.`.trim();
    const newData = {
      ...d,
      currency: "GBP",
      gross_amount: newGross,
      net_amount: newGross,
      items: newItems,
      notes: newNotes,
    };
    console.log(`  ${APPLY ? "→" : "?"}  ${d.invoice_number}  ${fix.note.padEnd(28)} £${oldGross} → £${newGross}`);
    if (!APPLY) { fixed++; continue; }
    try {
      const res = await fetch(`${SB_URL}/rest/v1/finance_invoices_issued?id=eq.${row.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      fixed++;
    } catch (e) {
      failed++;
      console.log(`     FAILED: ${e.message}`);
    }
  }
  console.log("");
  console.log(`Summary: ${APPLY ? "Fixed" : "Would fix"}: ${fixed}, Failed: ${failed}`);
  if (!APPLY) console.log("Add --apply to update.");
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
