/* ── Fix wrong dates for Carrington Creative invoices ──
 *
 * The Asana import misread 3 Alister Carrington PDFs that use US date format
 * (MM/DD/YYYY) as UK format (DD/MM/YYYY). This corrects the date_due field
 * and updates the legacy_id (which includes the date) so re-imports are still
 * idempotent.
 *
 * Run:
 *   node scripts/fix-asana-dates.mjs           # dry-run
 *   node scripts/fix-asana-dates.mjs --apply   # actually update
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
if (!SB_URL || !SB_KEY) { console.error("Missing env"); process.exit(1); }

const APPLY = process.argv.includes("--apply");
const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// [old_legacy_id, new_date, new_legacy_id, invoice_number]
const FIXES = [
  // 0000001: was 2025-06-11, should be 2025-10-31
  ["0000001-alister-carrington-2025-06-11", "2025-10-31", "0000001-alister-carrington-2025-10-31", "0000001"],
  // 0000002: was 2025-01-12, should be 2025-11-27
  ["0000002-alister-carrington-2025-01-12", "2025-11-27", "0000002-alister-carrington-2025-11-27", "0000002"],
  // 0000003: was 2026-05-01, should be 2025-12-29
  ["0000003-alister-carrington-2026-05-01", "2025-12-29", "0000003-alister-carrington-2025-12-29", "0000003"],
];

const nowISO = () => new Date().toISOString();

async function listMatching(legacyId) {
  const url = `${SB_URL}/rest/v1/finance_expenses?select=id,data&data->>legacy_id=eq.${encodeURIComponent(legacyId)}`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`List failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function updateRow(rowId, newData) {
  const url = `${SB_URL}/rest/v1/finance_expenses?id=eq.${rowId}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data: newData }),
  });
  if (!r.ok) throw new Error(`Update failed: ${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Fixing ${FIXES.length} Alister Carrington date misreads`);
  console.log("");

  let fixed = 0, missing = 0, failed = 0;

  for (const [oldId, newDate, newId, invNum] of FIXES) {
    const rows = await listMatching(oldId);
    if (rows.length === 0) {
      console.log(`  ?  Invoice ${invNum}: no row found with legacy_id=${oldId}`);
      missing++;
      continue;
    }
    for (const row of rows) {
      const oldDate = row.data.date_due;
      console.log(`  ${APPLY ? "→" : "?"}  Invoice ${invNum}: ${oldDate} → ${newDate}  (row ${row.id})`);
      if (!APPLY) { fixed++; continue; }
      try {
        const newData = { ...row.data, date_due: newDate, legacy_id: newId, updated_at: nowISO() };
        await updateRow(row.id, newData);
        fixed++;
      } catch (e) {
        console.log(`     FAILED: ${e.message}`);
        failed++;
      }
    }
  }

  console.log("");
  console.log(`Summary: ${APPLY ? "Updated" : "Would update"}: ${fixed}, Missing: ${missing}, Failed: ${failed}`);
  if (!APPLY) console.log("Add --apply to actually update.");
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
