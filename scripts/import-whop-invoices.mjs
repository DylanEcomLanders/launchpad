/* ── Import recent Whop/Stripe paid invoices → finance_invoices_issued ──
 *
 * Reads the CSV at ~/Downloads/exprt_rHY7dsFGNGfR.csv (or path passed as arg),
 * keeps only status=paid rows, transforms into finance_invoices_issued rows,
 * dedupes against existing source_transaction_id.
 *
 * Run:
 *   node scripts/import-whop-invoices.mjs           # dry-run
 *   node scripts/import-whop-invoices.mjs --apply
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
if (!SB_URL || !SB_KEY) { console.error("Missing env"); process.exit(1); }

const APPLY = process.argv.includes("--apply");
const CSV_PATH = process.argv.find((a) => a.endsWith(".csv"))
  || `${process.env.HOME}/Library/Application Support/Claude/local-agent-mode-sessions/b84a4867-8d4f-40c7-95f1-9f6ad513417f/c42372a8-c1b8-47f4-bd90-a662d6af1848/local_da7f9ca0-0868-4ff9-a251-b19044e6a77e/uploads/exprt_rHY7dsFGNGfR.csv`;

const TABLE = "finance_invoices_issued";

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// Whop's UK merchant processing fee is 2.7% of the GBP merchant amount.
// For non-GBP transactions, the "Payment processing percentage fee" in the
// Fee breakdown is denominated in £, so we can reverse-derive the original
// GBP price by dividing by this rate.
const WHOP_PROCESSING_FEE_RATE = 0.027;

function deriveGbpFromFeeBreakdown(feeBreakdown) {
  if (!feeBreakdown) return null;
  const m = feeBreakdown.match(/Payment processing percentage fee:£([\d.]+)/i);
  if (!m) return null;
  const pctFee = parseFloat(m[1]);
  if (!pctFee || isNaN(pctFee)) return null;
  // Round to nearest pound — Whop stores the fee at 2dp, so the derived
  // amount can be off by pennies (e.g. £2998.89 → actual £2999).
  return Math.round(pctFee / WHOP_PROCESSING_FEE_RATE);
}

function parseCsv(text) {
  // Simple CSV parser handling quoted fields
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r") {}
      else cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows[0];
  return rows.slice(1).filter((r) => r.length > 1).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] || ""; });
    return o;
  });
}

async function listExisting() {
  const r = await fetch(`${SB_URL}/rest/v1/${TABLE}?select=id,data`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
async function insertRow(row) {
  const r = await fetch(`${SB_URL}/rest/v1/${TABLE}`, {
    method: "POST", headers, body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

function nextInvoiceNumber(existing, taxYear) {
  // EL-YYYY-NNN format. UK tax year = April-March.
  const prefix = `EL-${taxYear}-`;
  let max = 0;
  for (const n of existing) {
    if (!n || !n.startsWith(prefix)) continue;
    const num = parseInt(n.slice(prefix.length), 10);
    if (num > max) max = num;
  }
  return (n) => `${prefix}${String(max + n).padStart(3, "0")}`;
}

function taxYearFor(dateIso) {
  // UK tax year starts April 6. Return the starting year (e.g. 2025 for FY 2025/26)
  const [y, m, d] = dateIso.split("-").map(Number);
  if (m < 4 || (m === 4 && d < 6)) return y - 1;
  return y;
}

const nowISO = () => new Date().toISOString();
const uid = () => randomUUID();

(async () => {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`CSV: ${CSV_PATH}`);

  const csvText = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(csvText);
  const paid = rows.filter((r) => (r["Status"] || "").toLowerCase() === "paid");
  console.log(`CSV rows: ${rows.length}, paid: ${paid.length}`);
  console.log("");

  const existing = await listExisting();
  const existingTxIds = new Set(
    existing.map((r) => r.data?.source_transaction_id).filter(Boolean),
  );
  const existingNumbers = new Set(
    existing.map((r) => r.data?.invoice_number).filter(Boolean),
  );
  console.log(`Existing ${TABLE} rows: ${existing.length}`);

  let inserted = 0, skipped = 0, failed = 0;
  const errors = [];

  // Group by tax year to assign sequential numbers
  const byYear = {};
  for (const r of paid) {
    const dateIso = (r["Paid at"] || r["Created at"] || "").slice(0, 10);
    const ty = taxYearFor(dateIso);
    (byYear[ty] = byYear[ty] || []).push({ r, dateIso });
  }

  for (const ty of Object.keys(byYear).sort()) {
    const gen = nextInvoiceNumber(existingNumbers, ty);
    let i = 1;
    for (const { r, dateIso } of byYear[ty].sort((a, b) => a.dateIso.localeCompare(b.dateIso))) {
      const txId = r["ID"];
      if (existingTxIds.has(txId)) { skipped++; continue; }

      const meta = (() => { try { return JSON.parse(r["Metadata"] || "{}"); } catch { return {}; } })();
      const nativeCurrency = (r["Payment Currency"] || "gbp").toLowerCase();
      const nativeGross = Number(r["Payment Amount"] || 0);
      const nativeFee = Number(r["Fee"] || 0);
      const clientName = (meta.client_name || r["Customer name"] || "Unknown").toString().trim();
      const customerName = (r["Customer name"] || "").toString().trim();
      const customerEmail = (r["Email"] || "").toString().trim();
      const country = (r["Billing address country"] || "GB").toString().trim().slice(0, 2).toUpperCase();
      // ALL invoices stored in GBP. For non-GBP, derive from Fee breakdown.
      const currency = "gbp";
      const gross = nativeCurrency === "gbp"
        ? nativeGross
        : (deriveGbpFromFeeBreakdown(r["Fee breakdown"]) || 0);
      const gbpEquivalent = gross;
      // Sum the £ fees from the breakdown for an accurate fee_gbp
      const gbpFees = (r["Fee breakdown"] || "").match(/£([\d.]+)/g) || [];
      const feeGbp = gbpFees.length
        ? Math.round(gbpFees.reduce((s, f) => s + parseFloat(f.slice(1)), 0) * 100) / 100
        : (nativeCurrency === "gbp" ? nativeFee : 0);

      // Find unique invoice number
      let invNum;
      do { invNum = gen(i++); } while (existingNumbers.has(invNum));
      existingNumbers.add(invNum);

      const description = (meta.client_name ? `${meta.client_name} — ` : "") + (customerName ? `Payment from ${customerName}` : `Whop payment`);

      const invoice = {
        id: uid(),
        invoice_number: invNum,
        client_name: clientName,
        contact_name: customerName || undefined,
        client_email: customerEmail || undefined,
        client_country: country || "GB",
        invoice_date: dateIso,
        due_date: dateIso,
        paid_date: (r["Paid at"] || "").slice(0, 10) || dateIso,
        items: [
          {
            id: uid(),
            description: description,
            quantity: 1,
            unit_price: gross,
          },
        ],
        currency: currency.toUpperCase(),
        gross_amount: gross,
        vat_amount: 0,
        net_amount: gross,
        gbp_equivalent: gbpEquivalent,
        vat_treatment: "outside_scope",
        source_system: "whop",
        source_transaction_id: txId,
        bank_account_received_into: "whop_balance",
        fee_gbp: feeGbp,
        client_type: "B2B",
        status: "paid",
        notes: `Auto-imported from Whop CSV. Customer: ${customerName} <${customerEmail}>. Card: ${r["Card brand"]} ${r["Last 4"]}.`,
        created_at: nowISO(),
        updated_at: nowISO(),
      };

      if (!APPLY) {
        console.log(`  + ${invNum}  ${clientName.padEnd(22)} ${currency.toUpperCase()} ${gross.toFixed(2).padStart(9)}  (GBP ${gbpEquivalent.toFixed(2)})  ${dateIso}`);
        inserted++;
        continue;
      }

      try {
        const { id, ...rest } = invoice;
        await insertRow({ id, data: rest, created_at: nowISO() });
        inserted++;
        process.stdout.write(".");
      } catch (e) {
        failed++;
        errors.push(`${invNum} (${clientName}): ${e.message}`);
        process.stdout.write("x");
      }
    }
  }

  console.log("");
  console.log("");
  console.log(`Summary:`);
  console.log(`  ${APPLY ? "Inserted" : "Would insert"}: ${inserted}`);
  console.log(`  Skipped (already imported / failed): ${skipped + (rows.length - paid.length)}  (${rows.length - paid.length} non-paid + ${skipped} dupes)`);
  if (APPLY) console.log(`  Failed: ${failed}`);
  if (errors.length) {
    console.log("");
    for (const e of errors) console.log(`  - ${e}`);
  }
  if (!APPLY) console.log("\nAdd --apply to insert.");
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
