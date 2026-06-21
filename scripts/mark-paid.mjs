/* ── Bulk-mark new imports as paid ──
 *
 * Marks rows from slack_dm, asana_ap, and archie_chat_upload as paid,
 * with date_paid = date_due (assume paid on due date as best guess).
 *
 * Exceptions (kept as due/disputed):
 *   - Ashish Dadwal invoices in February 2026 (disputed payments)
 *
 * Run:
 *   node scripts/mark-paid.mjs            # dry-run
 *   node scripts/mark-paid.mjs --apply
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
const TARGET_SOURCES = ["slack_dm", "asana_ap", "archie_chat_upload"];

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

function isDisputed(d) {
  if ((d.supplier_name || "").toLowerCase().includes("ashish")) {
    const dt = d.date_due || "";
    if (dt >= "2026-02-01" && dt <= "2026-02-28") return true;
  }
  return false;
}

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
  console.log(`Marking paid: rows from ${TARGET_SOURCES.join(", ")}`);
  console.log(`Exception: Ashish Dadwal invoices from Feb 2026 → marked disputed`);
  console.log("");

  const all = await listAll();
  const candidates = all.filter((r) => TARGET_SOURCES.includes(r.data?.legacy_source));
  console.log(`Found ${candidates.length} rows in target sources`);

  let paid = 0, disputed = 0, skipped = 0, failed = 0;
  const errors = [];

  for (const row of candidates) {
    const d = row.data;
    if (d.status === "paid" || d.status === "disputed") { skipped++; continue; }

    let newStatus, newData;
    if (isDisputed(d)) {
      newStatus = "disputed";
      newData = { ...d, status: "disputed" };
      console.log(`  ${APPLY ? "→" : "?"}  DISPUTED  ${d.supplier_name.padEnd(22)} ${(d.amount || 0).toFixed(2).padStart(8)}  ${d.date_due}  ${d.description?.slice(0,30) || ""}`);
    } else {
      newStatus = "paid";
      newData = { ...d, status: "paid", date_paid: d.date_due };
    }

    if (!APPLY) {
      if (newStatus === "paid") paid++;
      else disputed++;
      continue;
    }

    try {
      await updateRow(row.id, newData);
      if (newStatus === "paid") paid++;
      else disputed++;
      if (paid % 20 === 0) process.stdout.write(".");
    } catch (e) {
      failed++;
      errors.push(`${d.supplier_name} ${d.date_due}: ${e.message}`);
    }
  }

  console.log("");
  console.log("");
  console.log(`Summary:`);
  console.log(`  ${APPLY ? "Marked" : "Would mark"} paid:     ${paid}`);
  console.log(`  ${APPLY ? "Marked" : "Would mark"} disputed: ${disputed}`);
  console.log(`  Skipped (already paid/disputed): ${skipped}`);
  if (APPLY) console.log(`  Failed: ${failed}`);
  if (errors.length) {
    console.log("\nErrors:");
    for (const e of errors) console.log(`  - ${e}`);
  }
  if (!APPLY) console.log("\nAdd --apply to actually update.");
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
