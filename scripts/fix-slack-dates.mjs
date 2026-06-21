/* ── Fix Slack DM invoice dates to match PDF invoice dates ──
 *
 * The Slack DM import used file-upload date (when the contractor sent the
 * PDF in DM) rather than the actual invoice date. This corrects date_due
 * to match what the PDF says.
 *
 * Run:
 *   node scripts/fix-slack-dates.mjs           # dry-run
 *   node scripts/fix-slack-dates.mjs --apply
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

// [slack_file_id, new_date, label]
const FIXES = [
  ["F08UBFWQY86", "2025-05-16", "Ashish - NutarLife"],
  ["F093ES30ATE", "2025-06-20", "Ashish - 00031"],
  ["F093E205XPU", "2025-06-20", "Hitesh - 0043"],
  ["F095E0FHUGJ", "2025-07-04", "Hitesh - 00032 (orig)"],
  ["F09623WCUDV", "2025-07-04", "Hitesh - 00032 (Dylan re-post)"],
  ["F096GB1PF8S", "2025-07-11", "Greg - 001"],
  ["F099F61FHPS", "2025-07-25", "Hitesh - 0046"],
  ["F09LKMJEGBT", "2025-10-03", "Ashish - 00043"],
  ["F09L3AM5ANR", "2025-10-03", "Hitesh - 0054"],
  ["F09Q0QUF1ME", "2025-10-17", "Ashish - 00045"],
  ["F09P4H9HKGS", "2025-10-17", "Hitesh - 0056"],
  ["F09RHJW2GFQ", "2025-10-31", "Brandon - Invoice 5"],
  ["F09UFCCR2PM", "2025-11-14", "Hitesh - 0058"],
  ["F0A4QUD90DS", "2025-11-19", "Anna - December"],
  ["F0A5X4BR40Y", "2025-12-13", "Viktoriia - Invoice 12"],
  ["F0A6X1DCB6Y", "2025-12-26", "Hitesh - 0062"],
  // Minor fixes (1-3 days off)
  ["F0924QL072A", "2025-06-21", "Reka - Invoice"],
  ["F09LKMJD5ND", "2025-10-11", "Ashish - 00044"],
  ["F09M15N3GUQ", "2025-10-10", "Hitesh - 0055"],
  ["F0A144HTAKA", "2025-11-28", "Parth - PRT-INV-25-0006"],
];

async function listById(legacyId) {
  const url = `${SB_URL}/rest/v1/finance_expenses?select=id,data&data->>legacy_id=eq.${encodeURIComponent(legacyId)}`;
  const r = await fetch(url, { headers });
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
  console.log(`Fixing ${FIXES.length} Slack DM date mismatches`);
  console.log("");

  let fixed = 0, missing = 0, failed = 0;
  for (const [slackId, newDate, label] of FIXES) {
    const rows = await listById(slackId);
    if (rows.length === 0) {
      console.log(`  ?  ${label}: no row found for ${slackId}`);
      missing++;
      continue;
    }
    for (const row of rows) {
      const oldDate = row.data.date_due;
      if (oldDate === newDate) { console.log(`  =  ${label}: already ${newDate}`); continue; }
      console.log(`  ${APPLY ? "→" : "?"}  ${label.padEnd(34)} ${oldDate} → ${newDate}`);
      if (!APPLY) { fixed++; continue; }
      try {
        await updateRow(row.id, { ...row.data, date_due: newDate });
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
