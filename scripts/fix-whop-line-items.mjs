/* ── Fix Whop invoice line items ──
 * The original import used wrong field names (unit_price, description)
 * causing the UI to show NaN. This rewrites items[] with the correct
 * camelCase fields and type.
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

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  const r = await fetch(`${SB_URL}/rest/v1/finance_invoices_issued?select=id,data`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const all = await r.json();
  const targets = all.filter((row) => row.data?.source_system === "whop");
  console.log(`Found ${targets.length} Whop rows`);

  let fixed = 0, skipped = 0, failed = 0;
  for (const row of targets) {
    const d = row.data;
    const items = d.items || [];
    const first = items[0] || {};
    // Already correct?
    if (typeof first.unitPrice === "number" && first.name && first.type) {
      skipped++; continue;
    }
    const newItems = items.map((it) => ({
      id: it.id,
      type: "custom",
      name: it.name || it.description || `Payment from ${d.contact_name || d.client_name}`,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice ?? it.unit_price ?? d.gross_amount) || 0,
    }));
    const newData = { ...d, items: newItems };
    console.log(`  ${APPLY ? "→" : "?"}  ${d.invoice_number}  ${d.client_name.padEnd(22)} unitPrice=${newItems[0].unitPrice} qty=${newItems[0].quantity}`);
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
  console.log(`Summary: ${APPLY ? "Fixed" : "Would fix"}: ${fixed}, Already OK: ${skipped}, Failed: ${failed}`);
  if (!APPLY) console.log("Add --apply to update.");
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
