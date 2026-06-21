/* ── Align ClickUp disputed rows to status='disputed' ──
 *
 * The ClickUp import flagged disputed invoices with "[DISPUTED in ClickUp]"
 * in the description but left them at status='due'. This updates the status
 * to 'disputed' for those rows so they show correctly in launchpad.
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

async function listAll() {
  const r = await fetch(`${SB_URL}/rest/v1/finance_expenses?select=id,data`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
async function updateRow(rowId, newData) {
  const url = `${SB_URL}/rest/v1/finance_expenses?id=eq.${rowId}`;
  const r = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ data: newData }) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  const all = await listAll();
  const candidates = all.filter((r) => {
    const d = r.data || {};
    return d.legacy_source === "clickup_ap"
      && (d.description || "").includes("[DISPUTED in ClickUp]");
  });
  console.log(`Found ${candidates.length} clickup_ap rows flagged as disputed`);
  console.log("");

  let updated = 0, skipped = 0, failed = 0;
  for (const row of candidates) {
    const d = row.data;
    if (d.status === "disputed") { skipped++; continue; }
    console.log(`  ${APPLY ? "→" : "?"}  ${d.supplier_name.padEnd(22)} GBP ${(d.amount || 0).toFixed(2).padStart(8)}  ${d.date_due}  ${(d.description || "").slice(0, 45)}`);
    if (!APPLY) { updated++; continue; }
    try {
      await updateRow(row.id, { ...d, status: "disputed" });
      updated++;
    } catch (e) {
      console.log(`     FAILED: ${e.message}`);
      failed++;
    }
  }
  console.log("");
  console.log(`Summary: ${APPLY ? "Updated" : "Would update"}: ${updated}, Already disputed: ${skipped}, Failed: ${failed}`);
  if (!APPLY) console.log("Add --apply to actually update.");
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
