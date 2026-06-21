/* ── One-shot import: Slack DM invoices → finance_expenses ──
 *
 * Imports the 50 team-invoice PDFs collected from Slack DMs (since 2025-03-01)
 * into finance_expenses, with PDFs uploaded to the finance-documents bucket.
 *
 * Uses legacy_source="slack_dm" + legacy_id=slack_file_id for idempotency.
 * Also dedupes against existing clickup_ap rows by (vendor, amount, date) so
 * we don't double-count invoices that were already imported from ClickUp.
 *
 * Run:
 *   cd ~/Documents/Claude/launchpad
 *   node scripts/import-slack-invoices.mjs           # dry-run summary + dupe report
 *   node scripts/import-slack-invoices.mjs --apply   # upload PDFs + insert rows
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load .env.local ──
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const INCLUDE_DUPES = process.argv.includes("--include-dupes");
const TABLE = "finance_expenses";
const BUCKET = "finance-documents";
const SLACK_TEAM = "T04V5JCT3LN";

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ── Manifest: 50 Slack DM invoices ──
// [date_iso, vendor_canonical, amount_gbp_or_label_with_currency, label, slack_file_id, slack_slug, local_pdf_path]
const ROWS = [
  ["2025-04-18", "Ashish Dadwal",     364.00, "GBP", "Invoice 00021", "F08P49N5WG1", "invoice_-_00021.pdf",                             "2025-04-18 - Ashish - Invoice 00021.pdf"],
  ["2025-04-18", "Hitesh Kaushal",    384.00, "GBP", "Invoice 0037",  "F08NK3KHMCN", "invoice_-_0037.pdf",                              "2025-04-18 - Hitesh - Invoice 0037.pdf"],
  ["2025-05-09", "Ashish Dadwal",    1040.00, "GBP", "Invoice 0024",  "F08RR3310GJ", "invoice_-_0024.pdf",                              "2025-05-09 - Ashish - Invoice 0024.pdf"],
  ["2025-05-12", "Marko Karadzic",    850.00, "GBP", "Invoice EcomLanders (May 12)", "F08SKLA909W", "invoice_marko_karadzic_-_ecomlanders.pdf", "2025-05-12 - Marko - Invoice EcomLanders (May 12).pdf"],
  ["2025-05-23", "Ashish Dadwal",     876.00, "GBP", "Invoice 00025", "F08TVHBT19A", "ashish_s_invoice_-_00025.pdf",                    "2025-05-23 - Ashish - Invoice 00025.pdf"],
  ["2025-05-23", "Hitesh Kaushal",   1734.00, "GBP", "Invoice 0040",  "F08TVH57Y84", "hitesh_s_invoice_-_0040.pdf",                     "2025-05-23 - Hitesh - Invoice 0040.pdf"],
  ["2025-05-29", "Ashish Dadwal",     850.00, "GBP", "NutarLife Invoice", "F08UBFWQY86", "nutarlife_invoice.pdf",                       "2025-05-29 - Ashish - NutarLife Invoice.pdf"],
  ["2025-05-29", "Ashish Dadwal",    1200.00, "GBP", "Nysonian Invoice", "F08UAJD1MHR", "nysonian_invoice.pdf",                         "2025-05-29 - Ashish - Nysonian Invoice.pdf"],
  ["2025-05-30", "Ashish Dadwal",     615.00, "GBP", "Invoice 00028", "F08UJSHCF8T", "invoice_-_00028.pdf",                             "2025-05-30 - Ashish - Invoice 00028.pdf"],
  ["2025-05-30", "Hitesh Kaushal",   1384.00, "GBP", "Invoice 0041",  "F08UC3ZE13R", "invoice_-_0041.pdf",                              "2025-05-30 - Hitesh - Invoice 0041.pdf"],
  ["2025-06-02", "Ashish Dadwal",     492.00, "USD", "Nutralife Invoice", "F08UVAP4354", "nutralife_invoice.pdf",                       "2025-06-02 - Ashish - Nutralife Invoice.pdf"],
  ["2025-06-06", "Barnaby",           510.00, "GBP", "Invoice 6",     "F090E3A2USE", "ecom_landers_invoice_6.pdf",                      "2025-06-06 - Barnaby - Invoice 6.pdf"],
  ["2025-06-13", "Ashish Dadwal",    1188.00, "GBP", "Invoice 2-13 June", "F09168NDGPM", "ashish_s_invoice_2nd_june_to_13th_june_.pdf", "2025-06-13 - Ashish - Invoice 2-13 June.pdf"],
  ["2025-06-13", "Hitesh Kaushal",   1244.00, "GBP", "Invoice 0042",  "F09169NS203", "invoice_-_0042.pdf",                              "2025-06-13 - Hitesh - Invoice 0042.pdf"],
  ["2025-06-13", "Marko Karadzic",   1500.00, "GBP", "Invoice EcomLanders (Jun 13)", "F0914A9JTP0", "invoice_marko_karadzic_-_ecomlanders.pdf", "2025-06-13 - Marko - Invoice EcomLanders (Jun 13).pdf"],
  ["2025-06-20", "Barnaby",          1100.00, "GBP", "Invoice 7",     "F092CA8AG9Y", "ecom_landers_invoice_7.pdf",                      "2025-06-20 - Barnaby - Invoice 7.pdf"],
  ["2025-06-20", "Marko Karadzic",    600.00, "GBP", "Invoice EcomLanders 2", "F091Y6HGMF1", "invoice_marko_karadzic_-_ecomlanders2.pdf", "2025-06-20 - Marko - Invoice EcomLanders 2.pdf"],
  ["2025-06-20", "Reka",             2020.00, "GBP", "Invoice",       "F0924QL072A", "ecomlanders.pdf",                                  "2025-06-20 - Reka - Invoice.pdf"],
  ["2025-06-27", "Ashish Dadwal",     796.00, "GBP", "Invoice 00031", "F093ES30ATE", "invoice_-_00031.pdf",                             "2025-06-27 - Ashish - Invoice 00031.pdf"],
  ["2025-06-27", "Hitesh Kaushal",    628.00, "GBP", "Invoice 0043",  "F093E205XPU", "invoice_-_0043.pdf",                              "2025-06-27 - Hitesh - Invoice 0043.pdf"],
  ["2025-07-11", "Hitesh Kaushal",   2500.00, "GBP", "Invoice 00032", "F095E0FHUGJ", "invoice_hitesh_-_00032.pdf",                      "2025-07-11 - Hitesh - Invoice 00032.pdf"],
  ["2025-07-18", "Bogdan",            680.00, "GBP", "INV-020",       "F096CT6H7HT", "inv-020.pdf",                                     "2025-07-18 - Bogdan - INV-020.pdf"],
  ["2025-07-18", "Hitesh Kaushal",   2564.00, "GBP", "Invoice 00032 (Dylan re-post)", "F09623WCUDV", "invoice_-_00032__1_.pdf",         "2025-07-18 - Dylan-posted - Invoice 00032.pdf"],
  ["2025-07-18", "Gregorio Arceo Jr", 187.50, "GBP", "Invoice 001",   "F096GB1PF8S", "invoice_-_001.pdf",                               "2025-07-18 - Greg - Invoice 001.pdf"],
  ["2025-07-18", "Gregorio Arceo Jr", 312.50, "GBP", "Invoice 002",   "F096HR84HU4", "invoice_-_002.pdf",                               "2025-07-18 - Greg - Invoice 002.pdf"],
  ["2025-07-23", "Parth",             960.00, "GBP", "01 Unlocked Invoice", "F097GKXS1TK", "01_unlocked_invoice.pdf",                   "2025-07-23 - Parth - 01 Unlocked Invoice.pdf"],
  ["2025-08-01", "Marko Karadzic",    900.00, "GBP", "Invoice EcomLanders (Aug 01)", "F0982A33SG7", "invoice_marko_karadzic_-_ecomlanders.pdf", "2025-08-01 - Marko - Invoice EcomLanders (Aug 01).pdf"],
  ["2025-08-04", "Hitesh Kaushal",    238.00, "GBP", "Invoice 0046",  "F099F61FHPS", "invoice_-_0046.pdf",                              "2025-08-04 - Hitesh - Invoice 0046.pdf"],
  ["2025-08-11", "Marko Karadzic",    900.00, "GBP", "Invoice EcomLanders (Aug 11)", "F09AM5WRZ7A", "invoice_marko_karadzic_-_ecomlanders.pdf", "2025-08-11 - Marko - Invoice EcomLanders (Aug 11).pdf"],
  ["2025-09-01", "Parth",            1660.00, "GBP", "PRT-INV-25-0002", "F09DBNE6RFB", "prt-inv-25-0002.pdf",                           "2025-09-01 - Parth - PRT-INV-25-0002.pdf"],
  ["2025-09-15", "Marko Karadzic",    450.00, "GBP", "Invoice Plumi", "F09F9Q9L3NW", "invoice_marko_karadzic_-_ecomlanders_-_plumi.pdf", "2025-09-15 - Marko - Invoice Plumi.pdf"],
  ["2025-09-19", "Parth",             805.00, "GBP", "PRT-INV-25-0004", "F09FW5VSKT5", "prt-inv-25-0004.pdf",                           "2025-09-19 - Parth - PRT-INV-25-0004.pdf"],
  ["2025-10-13", "Ashish Dadwal",    2120.00, "GBP", "Invoice 00043", "F09LKMJEGBT", "invoice_-_00043__1_.pdf",                         "2025-10-13 - Ashish - Invoice 00043.pdf"],
  ["2025-10-13", "Ashish Dadwal",     664.00, "GBP", "Invoice 00044", "F09LKMJD5ND", "invoice_-_00044.pdf",                             "2025-10-13 - Ashish - Invoice 00044.pdf"],
  ["2025-10-13", "Hitesh Kaushal",   1040.00, "GBP", "Invoice 0054",  "F09L3AM5ANR", "invoice_-_0054__1_.pdf",                          "2025-10-13 - Hitesh - Invoice 0054.pdf"],
  ["2025-10-13", "Hitesh Kaushal",    714.00, "GBP", "Invoice 0055",  "F09M15N3GUQ", "invoice_-_0055.pdf",                              "2025-10-13 - Hitesh - Invoice 0055.pdf"],
  ["2025-10-24", "Parth",             350.00, "GBP", "PRT-INV-25-0005", "F09NQE1AHUZ", "prt-inv-25-0005.pdf",                           "2025-10-24 - Parth - PRT-INV-25-0005.pdf"],
  ["2025-10-28", "Ashish Dadwal",    3120.00, "GBP", "Invoice 00045", "F09Q0QUF1ME", "invoice_-_00045.pdf",                             "2025-10-28 - Ashish - Invoice 00045.pdf"],
  ["2025-10-28", "Hitesh Kaushal",   1560.00, "GBP", "Invoice 0056",  "F09P4H9HKGS", "invoice_-_0056.pdf",                              "2025-10-28 - Hitesh - Invoice 0056.pdf"],
  ["2025-11-07", "Brandon Baldwin",   750.00, "GBP", "Invoice 5",     "F09RHJW2GFQ", "invoice__5_.pdf",                                 "2025-11-07 - Brandon - Invoice 5.pdf"],
  ["2025-11-22", "Hitesh Kaushal",    852.00, "GBP", "Invoice 0058",  "F09UFCCR2PM", "invoice_-_0058__1_.pdf",                          "2025-11-22 - Hitesh - Invoice 0058.pdf"],
  ["2025-11-27", "Parth",            1050.00, "GBP", "PRT-INV-25-0006", "F0A144HTAKA", "prt-inv-25-0006.pdf",                           "2025-11-27 - Parth - PRT-INV-25-0006.pdf"],
  ["2025-12-09", "Parth",             950.00, "GBP", "PRT-INV-25-0007", "F0A28T21MKM", "prt-inv-25-0007.pdf",                           "2025-12-09 - Parth - PRT-INV-25-0007.pdf"],
  ["2025-12-19", "Anna Bila",         150.00, "USD", "Invoice December", "F0A4QUD90DS", "invoice___ecomlanders___december.pdf",         "2025-12-19 - Anna - Invoice December.pdf"],
  ["2025-12-19", "Gregorio Arceo Jr", 162.50, "GBP", "Invoice 023",   "F0A4ZSAAMFT", "invoice_-_023.pdf",                               "2025-12-19 - Greg - Invoice 023.pdf"],
  ["2025-12-20", "Parth",            1150.00, "GBP", "PRT-INV-25-0008", "F0A4QCHLB1B", "prt-inv-25-0008.pdf",                           "2025-12-20 - Parth - PRT-INV-25-0008.pdf"],
  ["2025-12-22", "Viktoriia Parchuk", 325.00, "GBP", "Invoice 12",    "F0A5X4BR40Y", "invoice_12__viktoriia_.pdf",                      "2025-12-22 - Victoria - Invoice 12.pdf"],
  ["2026-01-05", "Hitesh Kaushal",    510.00, "GBP", "Invoice 0062",  "F0A6X1DCB6Y", "invoice_-_0062__1_.pdf",                          "2026-01-05 - Hitesh - Invoice 0062.pdf"],
  ["2026-01-30", "Anna Bila",         500.00, "USD", "Invoice January", "F0ACDNQD133", "invoice___ecomlanders___january.pdf",           "2026-01-30 - Anna - Invoice January.pdf"],
  ["2026-02-28", "Ashish Dadwal",    1506.00, "GBP", "Invoice 00054", "F0AHJEH255Z", "invoice_-_00054.pdf",                             "2026-02-28 - Ashish - Invoice 00054.pdf"],
];

const DOWNLOADS_DIR = `${process.env.HOME}/Downloads`;
const nowISO = () => new Date().toISOString();
const uid = () => randomUUID();

async function listExisting() {
  const r = await fetch(`${SB_URL}/rest/v1/${TABLE}?select=id,data`, { headers });
  if (!r.ok) throw new Error(`List failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function uploadPdf(localPath, bucketPath, contentType = "application/pdf") {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(localPath);
  const r = await fetch(
    `${SB_URL}/storage/v1/object/${BUCKET}/${bucketPath}`,
    {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buf,
    },
  );
  if (!r.ok) throw new Error(`Upload failed: ${r.status} ${await r.text()}`);
  return bucketPath;
}

async function signUrl(bucketPath, ttlSeconds = 3600) {
  const r = await fetch(
    `${SB_URL}/storage/v1/object/sign/${BUCKET}/${bucketPath}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ expiresIn: ttlSeconds }),
    },
  );
  if (!r.ok) throw new Error(`Sign failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return `${SB_URL}/storage/v1${j.signedURL || j.signedUrl}`;
}

async function insertRow(row) {
  const r = await fetch(`${SB_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Insert failed (${row.id}): ${r.status} ${await r.text()}`);
  return r.json();
}

function findCrossSourceDupe(existingRows, vendor, amount, dateISO) {
  // Look for ANY existing row (any source, including manual entries) that matches
  // on vendor + amount + date (±14 days). We don't restrict to clickup_ap.
  const target = new Date(dateISO).getTime();
  for (const row of existingRows) {
    const d = row.data || {};
    if (d.legacy_source === "slack_dm") continue; // handled by sameSourceSeen
    if ((d.supplier_name || "").toLowerCase() !== vendor.toLowerCase()) continue;
    const dAmt = Math.abs(Number(d.amount || 0) - amount);
    if (dAmt > 1) continue;
    if (!d.date_due) continue;
    const days = Math.abs(new Date(d.date_due).getTime() - target) / (1000 * 60 * 60 * 24);
    if (days > 14) continue;
    return { row, days, amount: d.amount, source: d.legacy_source || "manual" };
  }
  return null;
}

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY (will upload PDFs + insert rows)" : "DRY-RUN (use --apply to insert)"}`);
  console.log(`Source: ${ROWS.length} Slack DM invoices → ${TABLE}`);
  console.log("");

  const existing = await listExisting();
  const sameSourceSeen = new Set();
  const sourceBreakdown = {};
  for (const row of existing) {
    const d = row.data || {};
    const src = d.legacy_source || "manual";
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    if (d.legacy_source === "slack_dm" && d.legacy_id) sameSourceSeen.add(d.legacy_id);
  }
  console.log(`Existing finance_expenses rows: ${existing.length}`);
  console.log(`  By source: ${Object.entries(sourceBreakdown).map(([s, c]) => `${s}=${c}`).join(", ")}`);
  console.log(`Already imported from slack_dm: ${sameSourceSeen.size}`);
  console.log("");

  let inserted = 0, skipped = 0, dupes = 0, failed = 0;
  const errors = [];
  const dupeList = [];

  for (const [dateISO, vendor, amount, currency, label, slackId, slug, localName] of ROWS) {
    // Idempotent guard: skip if same slack_file_id already imported
    if (sameSourceSeen.has(slackId)) {
      skipped++;
      continue;
    }

    // Cross-source dedupe: by default skip; --include-dupes to insert anyway flagged
    const dupe = findCrossSourceDupe(existing, vendor, amount, dateISO);
    if (dupe) {
      dupes++;
      dupeList.push(`${dateISO}  ${vendor.padEnd(22)} ${currency} ${amount.toFixed(2).padStart(8)}  ${label}  → matches ${dupe.source} row (${dupe.amount} on ${dupe.row.data.date_due})`);
      if (!INCLUDE_DUPES) {
        continue; // skip this row, already in DB from another source
      }
    }

    const descParts = [label];
    if (currency !== "GBP") descParts.push(`(${currency})`);
    if (dupe) descParts.push(`[DUPLICATE of ${dupe.source} row]`);

    const localPath = `${DOWNLOADS_DIR}/${localName}`;
    const bucketPath = `contractor/slack-${slackId}.pdf`;
    const slackPermalink = `https://ecomlanders.slack.com/files/U073X9X6FJM/${slackId}/${slug}`;

    if (!APPLY) {
      const flag = dupe ? "  DUPE" : "";
      console.log(`  + ${vendor.padEnd(22)} ${currency} ${amount.toFixed(2).padStart(8)}  ${dateISO}  ${label.slice(0,28).padEnd(28)}${flag}`);
      inserted++;
      continue;
    }

    try {
      // 1. Upload PDF to Supabase Storage
      await uploadPdf(localPath, bucketPath);
      const signed = await signUrl(bucketPath);

      // 2. Build row
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
        notes: `Imported from Slack DM. Original Slack file: ${slackPermalink}`,
        legacy_source: "slack_dm",
        legacy_id: slackId,
        created_at: nowISO(),
        updated_at: nowISO(),
      };

      const { id, ...rest } = expense;
      await insertRow({ id, data: rest, created_at: nowISO() });
      inserted++;
      process.stdout.write(".");
    } catch (err) {
      failed++;
      errors.push(`${slackId} (${vendor} ${label}): ${err.message}`);
      process.stdout.write("x");
    }
  }

  console.log("");
  console.log("");
  console.log(`Summary:`);
  console.log(`  ${APPLY ? "Inserted" : "Would insert"}: ${inserted}`);
  console.log(`  Skipped (already imported from slack_dm): ${skipped}`);
  console.log(`  Cross-source duplicates: ${dupes}  ${INCLUDE_DUPES ? "(INCLUDED, flagged in description)" : "(SKIPPED — use --include-dupes to import anyway)"}`);
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
  if (!APPLY) {
    console.log("");
    console.log("This was a DRY-RUN. To insert + upload PDFs, run:");
    console.log("  node scripts/import-slack-invoices.mjs --apply");
  }
})().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
