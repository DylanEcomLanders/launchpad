/* ── One-shot import: ClickUp Accounts Payable → finance_expenses ──
 *
 * Imports the 52 vendor invoices from the ClickUp "Accounts Payable" list
 * into finance_expenses. Uses legacy_source="clickup_ap" + legacy_id=task_id
 * for idempotency — safe to re-run, will skip rows already imported.
 *
 * Run:
 *   cd ~/Documents/Claude/launchpad
 *   node scripts/import-ap-invoices.mjs            # dry-run summary
 *   node scripts/import-ap-invoices.mjs --apply    # actually insert
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// ── Load .env.local ──
try {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* ignore */
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const TABLE = "finance_expenses";

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ── Manifest: 52 ClickUp Accounts Payable tasks ──
// Each row: ClickUp task id, vendor (canonical), amount (string from ClickUp),
// invoice_date_ms, status (UNPAID|PAID|DISPUTED), pdf title + URL, task URL.
const ROWS = [
  ["86c9vb014","Aleksandar Nedic","1336 USD",1779069600000,"UNPAID","Invoice INV-001.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/9e151936-34b1-4d1b-a4a6-01e62f1a8695/Invoice%20INV-001.pdf"],
  ["86c9r4dzf","Anastasia Balan","1200",1778486400000,"UNPAID","Ecom Landers April 2026.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/df6b21e6-e409-44bb-a340-533f6e3867bd/Ecom%20Landers%20April%202026.pdf"],
  ["86c9mgmh2","Gregorio Arceo Jr","260",1777579200000,"UNPAID","Invoice - 029 updated.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/aa9d263f-2f47-4ab2-bb00-e658b540f549/Invoice%20-%20029%20updated.pdf"],
  ["86c9krdbv","Gregorio Arceo Jr","650",1777579200000,"UNPAID","Invoice - 029.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/9b38f97e-83ab-4925-a63d-05adcd005e65/Invoice%20-%20029.pdf"],
  ["86c9juzfx","Ashish Dadwal","2704",1777415400000,"PAID","Invoice - 00056.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/8cf1b800-152d-480c-a4fd-a075e9791bc9/Invoice%20-%2000056.pdf"],
  ["86c9ju6bh","Alister Carrington","2100",1777518000000,"PAID","Invoice 0000007.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/d06156cb-4b06-4a71-a614-f5bbb5033ae6/Invoice%200000007.pdf"],
  ["86c9jazhq","Hitesh Kaushal","2009",1777329000000,"PAID","Invoice - 0069.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/2697c4e1-0db6-45cc-b48f-aa3504751e29/Invoice%20-%200069.pdf"],
  ["86c9j7ffr","Brandon Baldwin","750",1777305600000,"PAID","Invoice.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/de6fa751-5b0a-4c45-b903-787d8adc2353/Invoice.pdf"],
  ["86c9j73gx","Barnaby","3017.5",1777345200000,"PAID","EL10000003.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/0922881d-8619-4dc9-b748-c8912bf3470c/EL10000003.pdf"],
  ["86c9j73dh","Barnaby","3210.00",1777345200000,"PAID","EL10000002.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/323e0a5e-9853-440e-a29d-17fd7ef88118/EL10000002.pdf"],
  ["86c9j4hdr","Mark Angel Dominisac","4061.5",1777320000000,"PAID","Invoice #017 - Mark Angel Dominisac.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/8c343bb1-ae8d-4061-bd11-40aefa6841cc/Invoice%20%23017%20-%20Mark%20Angel%20Dominisac.pdf"],
  ["86c9hnpuf","Ian Rex Espinosa","2507",1777320000000,"PAID","Invoice_Ecomlanders_IRDE_015.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/7d31ca8d-fc60-4b23-bbfe-7859b9236387/Invoice_Ecomlanders_IRDE_015.pdf"],
  ["86c9e4fed","Jack Blow","600",1776654000000,"PAID","Invoice INV-0115.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/e23c96cb-f51c-4dc2-9ed2-da9041222a9e/Invoice%20INV-0115.pdf"],
  ["86c93d9x0","Ashish Dadwal","600",1774823400000,"PAID","Invoice - 00055.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/6827b447-7c2e-440a-9d09-e500c42e9803/Invoice%20-%2000055.pdf"],
  ["86c93d9r1","Hitesh Kaushal","1322",1774823400000,"PAID","Invoice - 0068.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/30e9b43c-3b45-42b4-a313-ac33c4efad15/Invoice%20-%200068.pdf"],
  ["86c92zzrr","Yuliya Akhrymenka","360",1774836000000,"PAID","3-03-26-FS-YA21-EU 4.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/341d26f9-b901-4465-94ae-c3ab04997775/3-03-26-FS-YA21-EU%204.pdf"],
  ["86c92b016","Barnaby","1346.36",1774670400000,"PAID","_INVOICE33.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/20896491-9f7a-44d3-9aee-2d0e75a606f3/_INVOICE33.pdf"],
  ["86c921h6h","Mark Angel Dominisac","1506.5",1774555200000,"PAID","Invoice #016 - Mark Angel Dominisac.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/4f16177e-de66-4d28-b6d8-ed3172d33464/Invoice%20%23016%20-%20Mark%20Angel%20Dominisac.pdf"],
  ["86c921gnr","Micklien Basilio","1597.5",1774555200000,"PAID","Micklien - Invoice 9.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/f3a6a1e4-3f0e-438e-852b-63b597fa3331/Micklien%20-%20Invoice%209.pdf"],
  ["86c9213dh","Alister Carrington","2100",1774584000000,"PAID","Invoice 0000006.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/85bd94b2-22d1-46af-be8b-6d4401eda5de/Invoice%200000006.pdf"],
  ["86c91pwmv","Gregorio Arceo Jr","650",1774555200000,"PAID","Invoice - 028.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/e4ec31dc-124b-416d-a523-e082f161999f/Invoice%20-%20028.pdf"],
  ["86c91nh9y","Brandon Baldwin","1350",1774537200000,"PAID","Brandon Baldwin - Ecom Landers (March).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/3bf9858c-ea10-4b1d-bee4-ecc52d375c6b/Brandon%20Baldwin%20-%20Ecom%20Landers%20(March).pdf"],
  ["86c91mtgn","Ian Rex Espinosa","2003",1774555200000,"PAID","Invoice_Ecomlanders_IRDE_014.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/84b934e5-aa9b-4675-bc02-dd8251fa81c0/Invoice_Ecomlanders_IRDE_014.pdf"],
  ["86c91fbhb","Viktoriia Parchuk","30",1774490400000,"PAID","Invoice 3 (Viktoriia).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/5559f8b2-e899-4dbf-81e9-388e1e70f6b3/Invoice%203%20(Viktoriia).pdf"],
  ["86c90u3ch","Jack Blow","300",1774411200000,"PAID","Invoice INV-0103.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/f491dcec-1817-48b1-b34e-b3b2caee6ab2/Invoice%20INV-0103.pdf"],
  ["86c8h2h1h","Ashish Dadwal","1506",1772145000000,"DISPUTED","Invoice - 00054.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/568a512c-3db4-4903-8911-84e5bcb9c3e9/Invoice%20-%2000054.pdf"],
  ["86c8gn4qm","Ian Rex Espinosa","1580",1772136000000,"PAID","Invoice_Ecomlanders_IRDE_013.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/450835fb-f304-43e9-9453-8b0deddfa759/Invoice_Ecomlanders_IRDE_013.pdf"],
  ["86c8gj2md","Brandon Baldwin","3025",1772118000000,"PAID","2026 Feb - Brandon Invoice.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/575ccc48-d4c6-47bd-8693-3a415d934617/2026%20Feb%20-%20Brandon%20Invoice.pdf"],
  ["86c8gfy9r","Alister Carrington","2100",1772251200000,"PAID","Invoice 0000005.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/7e0e6587-880a-458a-a4b4-f32792522b95/Invoice%200000005.pdf"],
  ["86c8gfwv5","Ashish Dadwal","1656",1772058600000,"DISPUTED","Invoice - 00054.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/4942e478-fc6c-43a9-a995-ad85a5c81891/Invoice%20-%2000054.pdf"],
  ["86c8gfnyr","Mark Angel Dominisac","1061",1772136000000,"PAID","Invoice #015 - Mark Angel Dominisac.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/e850c936-3e0e-4c25-9366-f5450a941a9d/Invoice%20%23015%20-%20Mark%20Angel%20Dominisac.pdf"],
  ["86c8gempf","Ashish Dadwal","1456",1772058600000,"DISPUTED","Invoice - 00054.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/486b0aed-93a7-471b-9d2a-d0cfe88c808a/Invoice%20-%2000054.pdf"],
  ["86c8gem8t","Hitesh Kaushal","1438",1772058600000,"PAID","Invoice - 0067.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/3b02a079-7c9f-416f-82f7-33f1587abf72/Invoice%20-%200067.pdf"],
  ["86c8g9ap5","Viktoriia Parchuk","2190",1772071200000,"PAID","Invoice 2 (Viktoriia).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/73c97d8b-d81c-4693-91ad-5d5fb102fdf6/Invoice%202%20(Viktoriia).pdf"],
  ["86c8g6w0y","Barnaby","2175",1772078400000,"PAID","_INVOICE32.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/b5077ac8-6d3f-4e92-a7e6-97244064d75d/_INVOICE32.pdf"],
  ["86c8g6vth","Barnaby","810",1772078400000,"PAID","INVOICE31.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/d613c01a-8748-4b2b-9ab5-a8f92d68fb38/INVOICE31.pdf"],
  ["86c8g6987","Micklien Basilio","370",1772136000000,"PAID","Micklien - Invoice 9 (2).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/b1e5bd13-b5e4-40ac-ad38-75709271eeb4/Micklien%20-%20Invoice%209%20(2).pdf"],
  ["86c8evja9","Gregorio Arceo Jr","650",1772136000000,"PAID","Invoice - 027.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/4af13530-e138-4d6d-93f4-70d813017bec/Invoice%20-%20027.pdf"],
  ["86c7y607m","Micklien Basilio","1714",1769544000000,"PAID","Micklien - Invoice 9 (1).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/ab2a00bf-6b19-4779-bb61-8f01eeb0962c/Micklien%20-%20Invoice%209%20(1).pdf"],
  ["86c7y5g6t","Anna Bila","500",1769738400000,"PAID","Invoice _ ecomlanders _ January.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/318a1160-e96a-4aca-a8ae-d56d57e5b780/Invoice%20_%20ecomlanders%20_%20January.pdf"],
  ["86c7wqrc7","Brandon Baldwin","1025",1769526000000,"PAID","Invoice (14).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/a13ce96f-2140-4694-8008-8546af05b82c/Invoice%20(14).pdf"],
  ["86c7wnk1z","Ashish Dadwal","888",1769553000000,"PAID","Invoice - 00053.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/1e862500-272a-4f76-8682-eb15550dbf03/Invoice%20-%2000053.pdf"],
  ["86c7wn9p6","Hitesh Kaushal","2674",1769553000000,"PAID","Invoice - 0066.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/80ed2054-cfad-4ca9-ba4d-4ce07a3c2699/Invoice%20-%200066.pdf"],
  ["86c7wkffq","Mark Angel Dominisac","433",1769544000000,"PAID","Invoice #014 - Mark Angel Dominisac.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/b7652a84-7f99-417f-8016-b7ba94cd6827/Invoice%20%23014%20-%20Mark%20Angel%20Dominisac.pdf"],
  ["86c7w9078","Micklien Basilio","1814",1769544000000,"DISPUTED","Micklien - Invoice 9.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/79b17e07-1e39-41fe-acd0-890ad93d5fb8/Micklien%20-%20Invoice%209.pdf"],
  ["86c7w8xn4","Ian Rex Espinosa","810",1769544000000,"DISPUTED","Invoice_Ecomlanders_IRDE_012.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/13a1a975-f862-4c00-93b9-fa7191b4994c/Invoice_Ecomlanders_IRDE_012.pdf"],
  ["86c7vybw6","Gregorio Arceo Jr","812.5",1769544000000,"DISPUTED","Gregorio Arceo Jr - Invoice 26.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/082e08e3-2827-4b98-ac9d-b88c1080aa1b/Gregorio%20Arceo%20Jr%20-%20Invoice%2026.pdf"],
  ["86c7vutht","Viktoriia Parchuk","865",1769479200000,"PAID","Invoice 1 (Viktoriia).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/3737c054-e5bb-40ee-9f11-139dec9f30fe/Invoice%201%20(Viktoriia).pdf"],
  ["86c7vu190","Alister Carrington","2100",1769745600000,"PAID","Invoice 0000004 (1).pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/4f4e692f-5353-47c9-8479-f4d794183593/Invoice%200000004%20(1).pdf"],
  ["86c7vtywr","Barnaby","762.50",1769486400000,"PAID","INVOICE30.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/ef323a67-c1bc-410c-b912-68a19a3e13d2/INVOICE30.pdf"],
  ["86c7vtytg","Barnaby","562.50",1769486400000,"PAID","INVOICE29.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/404502cc-63c6-4375-9793-a4ee4cf5c9fc/INVOICE29.pdf"],
  ["86c7tyhrc","Barnaby","701.25",1769313600000,"PAID","INVOICE27.pdf","https://t90152130658.p.clickup-attachments.com/t90152130658/3f6be2d5-2445-4528-bbad-fe9222fa0ec0/INVOICE27.pdf"],
];

// ── Helpers ──
function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function nowISO() { return new Date().toISOString(); }
function toDateISO(ms) { return new Date(ms).toISOString().slice(0, 10); }
function parseAmount(raw) {
  // Strip £, $, commas, currency suffixes (GBP, USD); return a number.
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[£$,]/g, "").replace(/\b(GBP|USD|EUR)\b/gi, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ── Fetch existing rows, build skip set ──
async function listExisting() {
  const url = `${SB_URL}/rest/v1/${TABLE}?select=id,data`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`List failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function insertRow(row) {
  const url = `${SB_URL}/rest/v1/${TABLE}`;
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Insert failed (${row.id}): ${r.status} ${await r.text()}`);
  return r.json();
}

// ── Main ──
(async () => {
  console.log(`Mode: ${APPLY ? "APPLY (will insert)" : "DRY-RUN (use --apply to insert)"}`);
  console.log(`Source: ${ROWS.length} ClickUp AP tasks → ${TABLE}`);
  console.log("");

  const existing = await listExisting();
  const seenLegacy = new Set();
  for (const row of existing) {
    const d = row.data || {};
    if (d.legacy_source === "clickup_ap" && d.legacy_id) {
      seenLegacy.add(d.legacy_id);
    }
  }
  console.log(`Existing finance_expenses rows: ${existing.length}`);
  console.log(`Already imported from clickup_ap: ${seenLegacy.size}`);
  console.log("");

  let inserted = 0, skipped = 0, failed = 0;
  const errors = [];

  for (const [task_id, vendor, amountRaw, dateMs, statusRaw, pdfTitle, pdfUrl] of ROWS) {
    if (seenLegacy.has(task_id)) {
      skipped++;
      continue;
    }

    const dateISO = toDateISO(dateMs);
    const amount = parseAmount(amountRaw);
    const isPaid = statusRaw === "PAID";
    const isDisputed = statusRaw === "DISPUTED";

    // Currency-aware description: most are GBP; flag USD/non-GBP in the description so it's visible.
    const isUsd = /USD/i.test(String(amountRaw));
    const descParts = [pdfTitle];
    if (isUsd) descParts.push("(USD)");
    if (isDisputed) descParts.push("[DISPUTED in ClickUp]");

    const expense = {
      id: uid(),
      supplier_name: vendor,
      description: descParts.join(" "),
      category: "contractor",
      amount,
      vat_included: false,
      date_due: dateISO,
      date_paid: isPaid ? dateISO : undefined,
      status: isPaid ? "paid" : "due",
      file_url: pdfUrl,
      file_name: pdfTitle,
      notes: `Imported from ClickUp Accounts Payable. Original task: https://app.clickup.com/t/${task_id}`,
      legacy_source: "clickup_ap",
      legacy_id: task_id,
      created_at: nowISO(),
      updated_at: nowISO(),
    };

    if (!APPLY) {
      console.log(`  + ${vendor.padEnd(28)} £${String(amount).padStart(8)}  ${dateISO}  ${statusRaw}  ${pdfTitle}`);
      inserted++;
      continue;
    }

    try {
      const { id, ...rest } = expense;
      await insertRow({ id, data: rest, created_at: nowISO() });
      inserted++;
      process.stdout.write(".");
    } catch (err) {
      failed++;
      errors.push(`${task_id} (${vendor}): ${err.message}`);
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
    console.log("Errors:");
    for (const e of errors) console.log(`  - ${e}`);
  }
  if (!APPLY) {
    console.log("");
    console.log("This was a DRY-RUN. To insert, run:");
    console.log("  node scripts/import-ap-invoices.mjs --apply");
  }
})().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
