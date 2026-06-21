/* ── One-shot import: Archie Hollyfield invoices → finance_expenses ──
 *
 * Imports 4 monthly retainer invoices from Archie Hollyfield, uploaded
 * by Dylan via the chat. Uses legacy_source="archie_chat_upload" +
 * legacy_id=invoice_number for idempotency.
 *
 * Run:
 *   node scripts/import-archie-invoices.mjs           # dry-run
 *   node scripts/import-archie-invoices.mjs --apply   # actually insert
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
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
if (!SB_URL || !SB_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const TABLE = "finance_expenses";
const BUCKET = "finance-documents";

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// [invoice_number, date_due, amount, local_filename]
const ROWS = [
  ["014", "2026-01-30", 3375.00, "2026-01-28 - Archie - Invoice 014.pdf"],
  ["015", "2026-03-02", 4500.00, "2026-02-28 - Archie - Invoice 015.pdf"],
  ["016", "2026-04-02", 4500.00, "2026-03-28 - Archie - Invoice 016.pdf"],
  ["019", "2026-05-03", 4500.00, "2026-04-28 - Archie - Invoice 019.pdf"],
];

const DOWNLOADS_DIR = `${process.env.HOME}/Downloads`;
const VENDOR = "Archie Hollyfield";
const nowISO = () => new Date().toISOString();
const uid = () => randomUUID();

async function listExisting() {
  const r = await fetch(`${SB_URL}/rest/v1/${TABLE}?select=id,data`, { headers });
  if (!r.ok) throw new Error(`List failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function uploadPdf(localPath, bucketPath) {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(localPath);
  const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${bucketPath}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!r.ok) throw new Error(`Upload failed: ${r.status} ${await r.text()}`);
  return bucketPath;
}

async function signUrl(bucketPath, ttlSeconds = 3600) {
  const r = await fetch(`${SB_URL}/storage/v1/object/sign/${BUCKET}/${bucketPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ expiresIn: ttlSeconds }),
  });
  if (!r.ok) throw new Error(`Sign failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return `${SB_URL}/storage/v1${j.signedURL || j.signedUrl}`;
}

async function insertRow(row) {
  const r = await fetch(`${SB_URL}/rest/v1/${TABLE}`, {
    method: "POST", headers, body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Insert failed: ${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Source: ${ROWS.length} Archie invoices → ${TABLE}`);
  console.log("");

  const existing = await listExisting();
  const seen = new Set();
  for (const row of existing) {
    const d = row.data || {};
    if (d.legacy_source === "archie_chat_upload" && d.legacy_id) seen.add(d.legacy_id);
  }
  console.log(`Existing finance_expenses rows: ${existing.length}`);
  console.log(`Already imported from archie_chat_upload: ${seen.size}`);
  console.log("");

  let inserted = 0, skipped = 0, failed = 0;
  const errors = [];

  for (const [invNum, dateISO, amount, localName] of ROWS) {
    if (seen.has(invNum)) { skipped++; continue; }

    if (!APPLY) {
      console.log(`  + ${VENDOR}  GBP ${amount.toFixed(2).padStart(8)}  due ${dateISO}  Invoice ${invNum}`);
      inserted++;
      continue;
    }

    try {
      const bucketPath = `contractor/archie-${invNum}.pdf`;
      await uploadPdf(`${DOWNLOADS_DIR}/${localName}`, bucketPath);
      const signed = await signUrl(bucketPath);

      const expense = {
        id: uid(),
        supplier_name: VENDOR,
        description: `Invoice ${invNum} - Monthly retainer`,
        category: "contractor",
        amount,
        vat_included: false,
        date_due: dateISO,
        status: "due",
        file_url: signed,
        file_path: bucketPath,
        file_name: localName,
        notes: `Monthly retainer invoice. Uploaded directly by Dylan via chat.`,
        legacy_source: "archie_chat_upload",
        legacy_id: invNum,
        created_at: nowISO(),
        updated_at: nowISO(),
      };

      const { id, ...rest } = expense;
      await insertRow({ id, data: rest, created_at: nowISO() });
      inserted++;
      process.stdout.write(".");
    } catch (err) {
      failed++;
      errors.push(`Invoice ${invNum}: ${err.message}`);
      process.stdout.write("x");
    }
  }

  console.log("");
  console.log("");
  console.log(`Summary:`);
  console.log(`  ${APPLY ? "Inserted" : "Would insert"}: ${inserted}`);
  console.log(`  Skipped (already imported): ${skipped}`);
  if (APPLY) console.log(`  Failed: ${failed}`);
  if (errors.length) {
    console.log("");
    for (const e of errors) console.log(`  - ${e}`);
  }
  if (!APPLY) console.log("\nDry-run only. Add --apply to insert.");
})().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
