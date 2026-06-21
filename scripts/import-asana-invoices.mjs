/* ── One-shot import: Asana Team Invoices → finance_expenses ──
 *
 * Imports 86 invoice PDFs exported from Asana's "06 - Invoices → Team Invoices"
 * section into finance_expenses, with PDFs uploaded to finance-documents.
 *
 * Uses legacy_source="asana_ap" + legacy_id=<filename> for idempotency,
 * and cross-source dedupe against clickup_ap/slack_dm/archie_chat_upload
 * by (vendor, amount, date_due ±14 days) to avoid double-counting.
 *
 * PDFs live in: ~/Downloads/Asana invoices/<filename>.pdf
 *
 * Run:
 *   node scripts/import-asana-invoices.mjs           # dry-run
 *   node scripts/import-asana-invoices.mjs --apply   # upload + insert
 *   node scripts/import-asana-invoices.mjs --apply --include-dupes
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
const INCLUDE_DUPES = process.argv.includes("--include-dupes");
const TABLE = "finance_expenses";
const BUCKET = "finance-documents";

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// [date_iso, vendor_canonical, amount, currency, invoice_number, local_filename]
const ROWS = [
  ["2025-01-12", "Alister Carrington", 2100.00, "GBP", "0000002", "Invoice Form submission — Invoice 0000002 (1).pdf"],
  ["2025-03-10", "Ian Rex Espinosa", 300.00, "GBP", "004", "Invoice Form submission — Invoice_Ecomlanders_IRDE_005.pdf"],
  ["2025-06-11", "Alister Carrington", 2100.00, "GBP", "0000001", "Invoice Form submission — Invoice 0000001.pdf"],
  ["2025-07-11", "Ian Rex Espinosa", 300.00, "GBP", "009", "Invoice Form submission — Invoice_Ecomlanders_IRDE_009.pdf"],
  ["2025-09-19", "Mark Angel Dominisac", 1410.00, "GBP", "004", "Invoice Form submission — Invoice #004 & #005 - Mark Angel Dominisac.pdf"],
  ["2025-09-26", "Ian Rex Espinosa", 1200.00, "GBP", "004", "Invoice Form submission — Invoice_Ecomlanders_IRDE_004.pdf"],
  ["2025-09-30", "Barnaby", 1600.00, "GBP", "2025-0029", "Invoice Form submission — INVOICE22.pdf"],
  ["2025-09-30", "Alister Carrington", 1050.00, "GBP", "0001", "Invoice Form submission — Invoice - 0001 (1).pdf"],
  ["2025-10-03", "Mark Angel Dominisac", 600.00, "GBP", "006", "Invoice Form submission — Invoice #006 - Mark Angel Dominisac.pdf"],
  ["2025-10-03", "Ashish Dadwal", 2120.00, "GBP", "00043", "Invoice Form submission — Invoice - 00043.pdf"],
  ["2025-10-03", "Ashish Dadwal", 1040.00, "GBP", "0054", "Invoice Form submission — Invoice - 0054.pdf"],
  ["2025-10-03", "Gregorio Arceo Jr", 312.50, "GBP", "012", "Invoice Form submission — Invoice - 012.pdf"],
  ["2025-10-03", "Viktoriia Parchuk", 1550.00, "GBP", "5", "Invoice Form submission — Invoice 5 (Viktoriia).pdf"],
  ["2025-10-03", "Micklien Basilio", 540.00, "GBP", "5", "Invoice Form submission — Micklien - Invoice 5.pdf"],
  ["2025-10-04", "Reka", 600.00, "USD", "SZABO-2025-23", "Invoice Form submission — Szamla_SZABO-2025-23_A4.pdf"],
  ["2025-10-10", "Barnaby", 2040.00, "GBP", "2025-0030", "Invoice Form submission — INVOICE23.pdf"],
  ["2025-10-10", "Barnaby", 792.50, "GBP", "2025-0032", "Invoice Form submission — INVOICE25.pdf"],
  ["2025-10-10", "Ashish Dadwal", 714.00, "GBP", "0055", "Invoice Form submission — Invoice - 0055.pdf"],
  ["2025-10-10", "Gregorio Arceo Jr", 312.50, "GBP", "013", "Invoice Form submission — Invoice - 013.pdf"],
  ["2025-10-10", "Ian Rex Espinosa", 1080.00, "GBP", "006", "Invoice Form submission — Invoice_Ecomlanders_IRDE_006.pdf"],
  ["2025-10-11", "Ashish Dadwal", 664.00, "GBP", "00044", "Invoice Form submission — Invoice - 00044.pdf"],
  ["2025-10-15", "Reka", 550.00, "GBP", "SZABO-2025-27", "Invoice Form submission — Szamla_SZABO-2025-27_A4.pdf"],
  ["2025-10-17", "Barnaby", 475.00, "GBP", "2025-0031", "Invoice Form submission — INVOICE24.pdf"],
  ["2025-10-17", "Ashish Dadwal", 3520.00, "GBP", "00045", "Invoice Form submission — Invoice - 00045.pdf"],
  ["2025-10-17", "Ashish Dadwal", 1960.00, "GBP", "0056", "Invoice Form submission — Invoice - 0056.pdf"],
  ["2025-10-17", "Gregorio Arceo Jr", 312.50, "GBP", "014", "Invoice Form submission — Invoice - 014.pdf"],
  ["2025-10-17", "Viktoriia Parchuk", 325.00, "GBP", "6", "Invoice Form submission — Invoice 6 (Viktoriia).pdf"],
  ["2025-10-18", "Micklien Basilio", 700.00, "GBP", "6", "Invoice Form submission — Micklien - Invoice 6.pdf"],
  ["2025-10-24", "Mark Angel Dominisac", 628.00, "GBP", "007", "Invoice Form submission — Invoice #007 - Mark Angel Dominisac.pdf"],
  ["2025-10-24", "Gregorio Arceo Jr", 312.50, "GBP", "015", "Invoice Form submission — Invoice - 015.pdf"],
  ["2025-10-24", "Parth", 350.00, "GBP", "PRT-INV-25-0005", "Invoice Form submission — PRT-INV-25-0005.pdf"],
  ["2025-10-24", "Ian Rex Espinosa", 1278.00, "GBP", "007", "Invoice Form submission — Invoice_Ecomlanders_IRDE_007.pdf"],
  ["2025-10-31", "Mark Angel Dominisac", 384.00, "GBP", "008", "Invoice Form submission — Invoice #008 - Mark Angel Dominisac.pdf"],
  ["2025-10-31", "Gregorio Arceo Jr", 100.00, "GBP", "016", "Invoice Form submission — Invoice - 016 - additional.pdf"],
  ["2025-10-31", "Viktoriia Parchuk", 1196.00, "GBP", "7", "Invoice Form submission — Invoice 7 (Viktoriia).pdf"],
  ["2025-10-31", "Instagram", 750.00, "GBP", "Q7PTRIPO-0001", "Invoice Form submission — Invoice-Q7PTRIPO-0001.pdf"],
  ["2025-10-31", "Ian Rex Espinosa", 600.00, "GBP", "008", "Invoice Form submission — Invoice_Ecomlanders_IRDE_008.pdf"],
  ["2025-11-07", "Mark Angel Dominisac", 300.00, "GBP", "009", "Invoice Form submission — Invoice #009 - Mark Angel Dominisac.pdf"],
  ["2025-11-07", "Ashish Dadwal", 740.00, "GBP", "0057", "Invoice Form submission — Invoice - 0057.pdf"],
  ["2025-11-07", "Gregorio Arceo Jr", 162.50, "GBP", "017", "Invoice Form submission — Invoice - 017.pdf"],
  ["2025-11-07", "Viktoriia Parchuk", 250.00, "GBP", "8", "Invoice Form submission — Invoice 8 (Viktoriia).pdf"],
  ["2025-11-07", "Reka", 425.00, "GBP", "SZABO-2025-29", "Invoice Form submission — Invoice_SZABO-2025-29_A4.pdf"],
  ["2025-11-07", "Micklien Basilio", 1090.00, "GBP", "7", "Invoice Form submission — Micklien - Invoice 7 (1).pdf"],
  ["2025-11-07", "Micklien Basilio", 2083.00, "GBP", "8-alt", "Invoice Form submission — _Micklien - Invoice 8.pdf"],
  ["2025-11-14", "Brandon Baldwin", 1000.00, "GBP", "03-2025-11", "Invoice Form submission — Invoice (1).pdf"],
  ["2025-11-14", "Ashish Dadwal", 700.00, "GBP", "00046", "Invoice Form submission — Invoice - 00046.pdf"],
  ["2025-11-14", "Ashish Dadwal", 942.00, "GBP", "0058", "Invoice Form submission — Invoice - 0058.pdf"],
  ["2025-11-14", "Gregorio Arceo Jr", 162.50, "GBP", "018", "Invoice Form submission — Invoice - 018.pdf"],
  ["2025-11-14", "Viktoriia Parchuk", 744.00, "GBP", "9", "Invoice Form submission — Invoice 9 (Viktoriia).pdf"],
  ["2025-11-21", "Mark Angel Dominisac", 300.00, "GBP", "010", "Invoice Form submission — Invoice #010 - Mark Angel Dominisac.pdf"],
  ["2025-11-21", "Ashish Dadwal", 300.00, "GBP", "00047", "Invoice Form submission — Invoice - 00047.pdf"],
  ["2025-11-21", "Gregorio Arceo Jr", 162.50, "GBP", "019", "Invoice Form submission — Invoice - 019.pdf"],
  ["2025-11-21", "Viktoriia Parchuk", 914.00, "GBP", "10", "Invoice Form submission — Invoice 10 (Viktoriia).pdf"],
  ["2025-11-21", "Ian Rex Espinosa", 1795.00, "GBP", "010", "Invoice Form submission — Invoice_Ecomlanders_IRDE_010.pdf"],
  ["2025-11-23", "Barnaby", 1050.00, "GBP", "2025-0033", "Invoice Form submission — INVOICE26.pdf"],
  ["2025-11-28", "Mark Angel Dominisac", 342.00, "GBP", "011", "Invoice Form submission — Invoice #011 - Mark Angel Dominisac.pdf"],
  ["2025-11-28", "Brandon Baldwin", 750.00, "GBP", "03-2025-11-28", "Invoice Form submission — Invoice (7).pdf"],
  ["2025-11-28", "Ashish Dadwal", 432.00, "GBP", "00048", "Invoice Form submission — Invoice - 00048.pdf"],
  ["2025-11-28", "Gregorio Arceo Jr", 162.50, "GBP", "020", "Invoice Form submission — Invoice - 020.pdf"],
  ["2025-11-28", "Parth", 1050.00, "GBP", "PRT-INV-25-0006", "Invoice Form submission — PRT-INV-25-0006.pdf"],
  ["2025-12-05", "Mark Angel Dominisac", 342.00, "GBP", "012", "Invoice Form submission — Invoice #012 - Mark Angel Dominisac.pdf"],
  ["2025-12-05", "Ashish Dadwal", 380.00, "GBP", "00049", "Invoice Form submission — Invoice - 00049.pdf"],
  ["2025-12-05", "Ashish Dadwal", 728.00, "GBP", "0059", "Invoice Form submission — Invoice - 0059.pdf"],
  ["2025-12-05", "Gregorio Arceo Jr", 162.50, "GBP", "021", "Invoice Form submission — Invoice - 021.pdf"],
  ["2025-12-05", "Viktoriia Parchuk", 370.00, "GBP", "11", "Invoice Form submission — Invoice 11 (Viktoriia).pdf"],
  ["2025-12-05", "Micklien Basilio", 510.00, "GBP", "7-alt", "Invoice Form submission — Micklien - Invoice 7.pdf"],
  ["2025-12-12", "Ashish Dadwal", 396.00, "GBP", "00050", "Invoice Form submission — Invoice - 00050.pdf"],
  ["2025-12-12", "Ashish Dadwal", 524.00, "GBP", "0060", "Invoice Form submission — Invoice - 0060.pdf"],
  ["2025-12-12", "Gregorio Arceo Jr", 162.50, "GBP", "022", "Invoice Form submission — Invoice - 022.pdf"],
  ["2025-12-12", "Brandon Baldwin", 375.00, "GBP", "004-2025-12-12", "Invoice Form submission — Invoice.pdf"],
  ["2025-12-13", "Viktoriia Parchuk", 325.00, "GBP", "12", "Invoice Form submission — Invoice 12 (Viktoriia).pdf"],
  ["2025-12-19", "Mark Angel Dominisac", 600.00, "GBP", "013", "Invoice Form submission — Invoice #013 - Mark Angel Dominisac.pdf"],
  ["2025-12-19", "Ashish Dadwal", 332.00, "GBP", "0051", "Invoice Form submission — Invoice - 0051.pdf"],
  ["2025-12-19", "Ashish Dadwal", 754.00, "GBP", "0061", "Invoice Form submission — Invoice - 0061.pdf"],
  ["2025-12-19", "Gregorio Arceo Jr", 162.50, "GBP", "023", "Invoice Form submission — Invoice - 023.pdf"],
  ["2025-12-19", "Viktoriia Parchuk", 540.00, "GBP", "13", "Invoice Form submission — Invoice 13 (Viktoriia).pdf"],
  ["2025-12-19", "Brandon Baldwin", 250.00, "GBP", "01-2025-12-19", "Invoice Form submission — Invoice 19th.pdf"],
  ["2025-12-19", "Ian Rex Espinosa", 555.00, "GBP", "011", "Invoice Form submission — Invoice_Ecomlanders_IRDE_011.pdf"],
  ["2025-12-20", "Parth", 1150.00, "GBP", "PRT-INV-25-0008", "Invoice Form submission — PRT-INV-25-0008.pdf"],
  ["2025-12-26", "Brandon Baldwin", 2100.00, "GBP", "01-2025-12-26", "Invoice Form submission — Invoice (3).pdf"],
  ["2025-12-26", "Ashish Dadwal", 1216.00, "GBP", "0052", "Invoice Form submission — Invoice - 0052.pdf"],
  ["2025-12-26", "Ashish Dadwal", 864.00, "GBP", "0062", "Invoice Form submission — Invoice - 0062.pdf"],
  ["2025-12-26", "Gregorio Arceo Jr", 162.50, "GBP", "024", "Invoice Form submission — Invoice - 024.pdf"],
  ["2025-12-26", "Micklien Basilio", 712.00, "GBP", "8", "Invoice Form submission — Micklien - Invoice 8.pdf"],
  ["2026-01-02", "Gregorio Arceo Jr", 162.50, "GBP", "025", "Invoice Form submission — Invoice - 025.pdf"],
  ["2026-05-01", "Alister Carrington", 2250.00, "GBP", "0000003", "Invoice Form submission — Invoice 0000003 (1).pdf"],
];

const DOWNLOADS_DIR = `${process.env.HOME}/Downloads/Asana invoices`;
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
    method: "POST", headers, body: JSON.stringify({ expiresIn: ttlSeconds }),
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

function findCrossSourceDupe(existingRows, vendor, amount, dateISO) {
  const target = new Date(dateISO).getTime();
  for (const row of existingRows) {
    const d = row.data || {};
    if (d.legacy_source === "asana_ap") continue;
    if ((d.supplier_name || "").toLowerCase() !== vendor.toLowerCase()) continue;
    const dAmt = Math.abs(Number(d.amount || 0) - amount);
    if (dAmt > 1) continue;
    if (!d.date_due) continue;
    const days = Math.abs(new Date(d.date_due).getTime() - target) / (1000 * 60 * 60 * 24);
    if (days > 14) continue;
    return { row, source: d.legacy_source || "manual", amount: d.amount };
  }
  return null;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Source: ${ROWS.length} Asana team invoices → ${TABLE}`);
  console.log("");

  const existing = await listExisting();
  const sameSeen = new Set();
  const breakdown = {};
  for (const row of existing) {
    const d = row.data || {};
    const src = d.legacy_source || "manual";
    breakdown[src] = (breakdown[src] || 0) + 1;
    if (d.legacy_source === "asana_ap" && d.legacy_id) sameSeen.add(d.legacy_id);
  }
  console.log(`Existing rows: ${existing.length}`);
  console.log(`  By source: ${Object.entries(breakdown).map(([s,c]) => `${s}=${c}`).join(", ")}`);
  console.log(`Already imported from asana_ap: ${sameSeen.size}`);
  console.log("");

  let inserted = 0, skipped = 0, dupes = 0, failed = 0;
  const errors = [];
  const dupeList = [];

  for (const [dateISO, vendor, amount, currency, invNum, localName] of ROWS) {
    const legacyId = `${invNum}-${slugify(vendor)}-${dateISO}`;
    if (sameSeen.has(legacyId)) { skipped++; continue; }

    const dupe = findCrossSourceDupe(existing, vendor, amount, dateISO);
    if (dupe) {
      dupes++;
      dupeList.push(`${dateISO}  ${vendor.padEnd(22)} ${currency} ${amount.toFixed(2).padStart(8)}  inv ${invNum}  → matches ${dupe.source} (${dupe.amount} on ${dupe.row.data.date_due})`);
      if (!INCLUDE_DUPES) continue;
    }

    if (!APPLY) {
      const flag = dupe ? "  DUPE" : "";
      console.log(`  + ${vendor.padEnd(22)} ${currency} ${amount.toFixed(2).padStart(8)}  ${dateISO}  inv ${invNum}${flag}`);
      inserted++;
      continue;
    }

    try {
      const bucketPath = `contractor/asana-${slugify(vendor)}-${slugify(invNum)}-${dateISO}.pdf`;
      await uploadPdf(`${DOWNLOADS_DIR}/${localName}`, bucketPath);
      const signed = await signUrl(bucketPath);

      const descParts = [`Invoice ${invNum}`];
      if (currency !== "GBP") descParts.push(`(${currency})`);
      if (dupe) descParts.push(`[DUPLICATE of ${dupe.source}]`);

      const expense = {
        id: uid(),
        supplier_name: vendor,
        description: descParts.join(" "),
        category: "contractor",
        amount,
        vat_included: false,
        date_due: dateISO,
        status: "due",
        file_url: signed,
        file_path: bucketPath,
        file_name: localName,
        notes: `Imported from Asana 06 - Invoices → Team Invoices.`,
        legacy_source: "asana_ap",
        legacy_id: legacyId,
        created_at: nowISO(),
        updated_at: nowISO(),
      };

      const { id, ...rest } = expense;
      await insertRow({ id, data: rest, created_at: nowISO() });
      inserted++;
      process.stdout.write(".");
    } catch (err) {
      failed++;
      errors.push(`${invNum} ${vendor}: ${err.message}`);
      process.stdout.write("x");
    }
  }

  console.log("");
  console.log("");
  console.log(`Summary:`);
  console.log(`  ${APPLY ? "Inserted" : "Would insert"}: ${inserted}`);
  console.log(`  Skipped (already imported from asana_ap): ${skipped}`);
  console.log(`  Cross-source duplicates: ${dupes}  ${INCLUDE_DUPES ? "(INCLUDED, flagged)" : "(SKIPPED — use --include-dupes to import anyway)"}`);
  if (APPLY) console.log(`  Failed: ${failed}`);
  if (dupeList.length) {
    console.log("");
    console.log(`Cross-source duplicates ${INCLUDE_DUPES ? "(imported, flagged)" : "(skipped)"}:`);
    for (const d of dupeList) console.log(`  ${d}`);
  }
  if (errors.length) {
    console.log("");
    console.log("Errors:");
    for (const e of errors) console.log(`  - ${e}`);
  }
  if (!APPLY) console.log("\nDry-run only. Add --apply to insert.");
})().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
