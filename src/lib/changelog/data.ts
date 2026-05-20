/* ── Changelog & Roadmap data layer (Supabase + localStorage fallback) ── */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { createStore } from "@/lib/supabase-store";

export type ChangeType = "added" | "improved" | "fixed" | "removed";
export type RoadmapPriority = "next" | "planned" | "exploring";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  id: string;
  date: string;
  version: string;
  title: string;
  changes: ChangeItem[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  priority: RoadmapPriority;
  addedBy?: string;
  addedAt: string;
}

// ── Storage keys ──

const CHANGELOG_KEY = "launchpad-changelog";
const ROADMAP_KEY = "launchpad-roadmap";

// ── Seed data ──

const seedChangelog: ChangelogEntry[] = [
  {
    id: "cl-73",
    date: "20 May 2026",
    version: "0.46.0",
    title: "Finance: clients table, CSV bulk import, new VAT/source/currency schema",
    changes: [
      { type: "added", text: "Bulk invoice importer at /finance/import. Upload a CSV (invoice_number, client_name, issue_date, due_date, gross_amount, vat_amount, net_amount, vat_treatment, source_system, status required; everything else optional) and the server parses, upserts clients by name, snapshots client fields onto each invoice, and creates the records. Idempotent on invoice_number so re-running the same file skips already-imported rows. Returns per-row error detail (with row + field) so you can fix bad data and re-run. Built for the planned 213-row historical migration but generic enough for any CSV-formatted invoice source" },
      { type: "added", text: "Clients master table (finance_clients) + ClientPicker component on the New Invoice form. Dropdown of existing clients with '+ Create new client' inline form; selecting a client snapshots name / contact / email / address / country onto the invoice (so historical PDFs render correctly even if the client's address changes later). Storage / RLS follow the same service-role-only pattern as the other finance_* tables (migration 017)" },
      { type: "added", text: "New invoice fields aligned to the import spec: currency (GBP/USD/EUR/AUD/CAD, default GBP), gross_amount + vat_amount + net_amount snapshots (computed from line items for in-app invoices, taken directly from the CSV for imported ones), gbp_equivalent (the gross in GBP for multi-currency tracking), source_system (stripe / wise / whop / direct / manual), source_transaction_id, bank_account_received_into (tide / wise_gbp / wise_usd / wise_eur / whop_balance / other), tide_transaction_id. All optional except currency + the amounts which now always populate on save" },
      { type: "added", text: "void status on InvoiceIssued. Cancelled-and-won't-be-paid state, distinct from disputed (which is parked pending correction). Adds the standard four-state lifecycle the import spec expects: draft / sent / paid / void" },
      { type: "improved", text: "Renamed vat_treatment enum values to match the import spec exactly: uk_standard → standard_20, uk_inclusive → inclusive_20, not_registered → pre_vat_registration. Added outside_scope and exempt as new options. Updated everywhere they're referenced (vat.ts, calc.ts, vat-return.ts, types.ts, badges, filters, PDF rendering). No data migration needed since the only existing rows were the in-dev samples which were patched in place" },
      { type: "added", text: "Migration 017_create_finance_clients.sql. Run in the Supabase SQL editor before using the importer or the new client picker. Creates the finance_clients table with RLS enabled but no anon policy — service-role only, same as the other finance_* tables post-016" },
      { type: "added", text: "Suppliers master table (finance_suppliers) + bulk supplier import. Mirrors the clients pattern: jsonb blob, service-role-only RLS, idempotent on case-insensitive name match. Supplier rows carry default_category + default_vat_treatment so the expense importer can fall back to sensible defaults when a row doesn't specify, plus aggregated stats (transaction_count, total_spent, avg_per_transaction, first/last_transaction) for top-supplier views. Migration 018_create_finance_suppliers.sql must be run in the Supabase SQL editor first" },
      { type: "added", text: "Bulk expense importer at /finance/import (Stage 4). Upload expenses_master_clean.csv (temp_id, expense_number, issue_date, payment_date, supplier, description, category, currency, amount_gbp, vat_amount_gbp, net_amount_gbp, vat_treatment, source_system, paid_from, status, tax_year). Blank expense_numbers are auto-assigned EXP-YYYY-NNN with the counter resetting at each UK tax-year boundary (6 April), continuing from the existing max so re-runs don't clash. Idempotent on expense_number, returns per-row error detail, supports dry_run for preflight and strict_match to fail rows instead of auto-creating suppliers" },
      { type: "added", text: "Expense schema expanded to match the real data shape: currency, amount_native (gross in the supplier's currency), amount_gbp (gross in GBP), vat_amount_gbp (reclaimable input VAT), net_amount_gbp split, a dedicated ExpenseVatTreatment enum (uk_20_reclaimable / reverse_charge / outside_scope / zero_rated / exempt / pre_vat_registration / review_needed / manual) with input-VAT semantics, separate from the invoice-side VatTreatment. Also ExpenseSourceSystem (tide_bank / stripe_fees / whop_fees / shopify_fees / wise / card / manual), ExpensePaidFrom (tide / wise_gbp/usd/eur / stripe_deduction / whop_deduction / shopify_deduction / card / other), keeping deduction semantics out of the receivables BankAccountReceivedInto enum. Plus expense_number, issue_date, payment_date, tax_year, supplier_id FK. Legacy single-amount fields (amount, vat_included, date_due, date_paid) stay populated alongside so any existing UI reading the old shape keeps rendering" },
      { type: "added", text: "ExpenseCategory enum extended with 6 new values: advertising (paid ads), platform_fee (Stripe/Whop/Shopify processing), bank_fee (monthly/transactional), fuel (subset of travel for reclaim tracking), food_drink (meals/subsistence), entertainment (limited deductibility, separate from food_drink). Updated label map + dashboard pie chart colour palette to match" },
      { type: "added", text: "Category pill bar on /finance/expenses for one-click filtering by category. Horizontal scrolling row of pills above the existing filter row, sorted by row count descending, each pill showing the count next to its label. Replaces the category dropdown. Mirror UX on /finance/invoices: All / UK / International / per-country pill bar so you can filter by client country in one tap (UK = client_country GB or blank, International = everything else, plus one pill per non-UK country code present in the dataset)" },
      { type: "improved", text: "Finance dashboard restyled to fit one viewport with a premium aesthetic: title + tab nav collapsed into a single row (saved ~100px), hero KPI tiles get icon chips + inline 6mo sparklines + tighter typography, period selector replaced with iOS-style segmented pill bar (Month / Quarter / Tax year / Custom), forecast tiles condensed into one inline strip with vertical dividers. The whole module now fits in 900px viewport with no scrolling needed for the at-a-glance read" },
      { type: "improved", text: "Revenue vs expenses chart redesigned from a basic bar chart into a smooth area+line combo: emerald revenue line + amber expense line, both with subtle gradient area fills, dot-grid background pattern, custom dark tooltip card showing the period total + per-series breakdown in pill badges. Chart now always shows trailing 12 months (decoupled from the page-level period filter — KPIs filter by period, chart is for trend context). Expense breakdown donut got a glow-on-hover state, rounded segment corners, an interactive center display that swaps from 'Total / across N categories' to '[Category] / £X / N% of total' on hover" },
      { type: "improved", text: "VAT row on the dashboard now displays whenever there's any tagged VAT data, not just when the company is VAT registered. So the moment you start tagging invoices with standard_20 or expenses with vat_included=true, the dashboard shows VAT collected / VAT paid (input reclaim) / VAT owed as a forward-looking estimate. Sub-labels switch from 'Estimate (pre-registration)' to 'From UK invoices' once you flip the registered toggle on in Settings. Reclaim calc no longer short-circuits to 0 when not registered" },
      { type: "fixed", text: "Dashboard revenue was inflated by £105,267 due to two bugs. (1) invoiceTotalsGbp() in calc.ts read inv.net_amount and inv.vat_amount directly as GBP, but those fields are stored in NATIVE currency per the type spec. For GBP invoices native == GBP so the bug was invisible, but for the 19 USD invoices the dashboard summed native USD amounts (e.g. $12,000) as £12,000 instead of the £8,711 gbp_equivalent. Now scales net/vat by the gbp_equivalent/gross_amount ratio so rollups are always consistently in GBP. (2) Four historical GBP invoices (EL-2024-002, 006, 009, 013) had gross_amount + net_amount + items[0].unitPrice set to inflated values (£11,644 / £10,562 / £66,103 / £9,382) that didn't match gbp_equivalent (£2,000 / £1,800 / £4,997 / £1,600). Likely an import quirk where a Stripe customer LTV got jammed into gross_amount instead of the single-transaction value. Patched in place via scripts/patch-corrupted-gbp-invoices.mjs to set all three fields to gbp_equivalent. Dashboard all-time revenue now correctly shows £676,130.94" },
    ],
  },
  {
    id: "cl-72",
    date: "20 May 2026",
    version: "0.45.3",
    title: "Finance: Disputed status on expenses + PATCH null-as-delete fix",
    changes: [
      { type: "added", text: "Disputed status on expenses, mirroring the invoice flow. Mark Disputed prompts for an optional reason that surfaces on the detail page. Disputed expenses are excluded from: period totals (gross profit / expense category breakdown), monthly time series, committed recurring outflow projection, and Boxes 4 / 7 of the VAT return. List page gets a yellow Disputed badge and a Disputed filter option. Detail page gets a Status 'Change to' dropdown plus Mark Disputed / Resolve Dispute header buttons. Use this for supplier invoices you're querying without polluting the books" },
      { type: "fixed", text: "PATCH /api/finance/store/[table]/[id] now treats null values as field deletions on the JSONB blob. Previously, passing `{ disputed_reason: undefined }` to expensesStore.update silently kept the old value because JSON.stringify strips undefined and the server-side merge re-applied the existing field. Resolving a dispute would leave stale disputed_at + disputed_reason visible on the detail page. Now both the server merge and the client-store wrapper handle this: client converts undefined to null on the wire, server deletes the key when value is null. Spotted by the smoke test of the new resolve-dispute flow" },
    ],
  },
  {
    id: "cl-71",
    date: "20 May 2026",
    version: "0.45.2",
    title: "Finance: Disputed status, Due relabel, invoice attachments",
    changes: [
      { type: "added", text: "Disputed status on invoices issued. Use it to park an invoice that needs correcting (wrong amount, wrong line items, client disputing) without polluting revenue / VAT / dashboard calcs. Mark Disputed prompts for an optional reason that surfaces on the detail page. Disputed invoices are excluded from: revenue + VAT collected in computePeriodTotals, monthly time series on the dashboard, rolling 12mo turnover for the VAT threshold warning, and Boxes 1 / 6 of the VAT return. They stay visible in the invoice list (with a yellow badge) and filterable. 'Resolve dispute' button flips it back to Due, clearing disputed_at + disputed_reason" },
      { type: "improved", text: "Renamed the 'Sent' label to 'Due' across the invoice list filter, detail badge, status dropdown, and Mark button. The underlying status value stays 'sent' (no data migration), only the human label changes — for the recipient an issued invoice IS due, the founder asked for that vocabulary. sent_date field name preserved since it still captures the date we sent it" },
      { type: "added", text: "Status dropdown on the invoice detail page lets you flip to any status (Draft / Due / Paid / Disputed) from one control, instead of having to use the conditional Mark buttons. Overdue stays auto-derived from due_date passing and is shown as a non-selectable option. Picking Disputed triggers the reason prompt, picking anything else clears dispute metadata" },
      { type: "added", text: "Invoice attachment slot. Receivable invoices now have an optional file attachment (signed PO, payment confirmation, contract reference, etc) separate from the auto-generated PDF. Upload via the Attachment card on /finance/invoices/[id]. Stored in the same private finance-documents bucket as expense receipts. View opens a fresh 15min signed URL on click — link doesn't sit live in the DOM. Remove clears it. Mirrors the existing pattern on expenses" },
    ],
  },
  {
    id: "cl-70",
    date: "20 May 2026",
    version: "0.45.1",
    title: "Finance module hardening — RLS lockdown, edit pages, recurring forecasting, email send",
    changes: [
      { type: "improved", text: "Security · finance data layer no longer goes browser → Supabase with the anon key. All finance_* table access now routes through /api/finance/store/[table] (and /[id]), which validates the FinanceGate passcode cookie SERVER-SIDE (cookie value === env passcode, not just presence) and uses a service-role Supabase client to do the actual reads/writes. Same pattern for /api/finance/invoice-number, /upload, /sign, /send-invoice, /migrate-legacy. Migration 016_lock_finance_rls.sql drops the permissive '_anon_all' RLS policies on all five finance_* tables and revokes anon EXECUTE on the finance_next_invoice_number function — after applying 016, the anon publishable key cannot touch any finance row even with a stolen Launchpad session. Required new env var: SUPABASE_SERVICE_ROLE_KEY (server-only). Storage bucket finance-documents needs the same hardening from the Supabase dashboard (revoke anon, keep service-role only)" },
      { type: "improved", text: "Friendly config-check banner inside the finance layout — calls /api/finance/store/finance_company_profile on mount; if the API returns 503 FINANCE_NOT_CONFIGURED (the new error code thrown when SUPABASE_SERVICE_ROLE_KEY isn't set) it surfaces a red banner saying exactly which env vars are missing instead of hanging on an infinite loading skeleton. Same banner appears on every finance page since it lives in the layout" },
      { type: "added", text: "Edit mode for /finance/invoices/[id] and /finance/expenses/[id]. Click 'Edit' to swap the read-only detail panels for a full form (line items, client info, dates, VAT treatment, payment details for invoices; supplier, amount, VAT-included flag, dates, recurring frequency for expenses). Save merges via PATCH /api/finance/store/[table]/[id] (server-side merge so partial updates can't clobber other fields). Recurring expenses also expose a 'Roll forward' button that creates the next occurrence (based on monthly/quarterly/annual frequency) and navigates to it, so the manual forecasting flow doesn't require entering the same supplier name 12 times a year" },
      { type: "added", text: "Recurring expense forecasting on the dashboard — two new tiles. 'Committed recurring (monthly)' normalises every recurring expense to its monthly equivalent (quarterly /3, annual /12), totalled. 'Projected outflow (next 3mo)' is that monthly × 3. Caption breaks down monthly/quarterly/annual contributions so it's obvious which bucket is driving the total" },
      { type: "added", text: "VAT registration threshold warning on the dashboard. Computes rolling 12-month net taxable turnover from non-draft invoices. New tile 'Rolling 12mo turnover' shows the figure plus headroom to the £90k threshold; turns amber at £85k and red at £90k+. A separate red banner above the period selector fires when the company is currently flagged as not VAT registered AND the rolling figure crosses either trigger — copy includes the HMRC rule ('register within 30 days of crossing'). Once Settings 'VAT registered' is toggled on, the banner suppresses" },
      { type: "added", text: "Inline PDF preview on /finance/invoices/[id]. New 'Generate preview' button renders the invoice via @react-pdf/renderer client-side, drops the blob into an iframe so you see the actual document before downloading or sending. Object URLs revoke on unmount; preview invalidates when the invoice is edited so you can't accidentally send a stale render" },
      { type: "added", text: "Email invoice to client — new 'Email client' button on /finance/invoices/[id]. Generates the PDF client-side, posts the base64 to /api/finance/send-invoice, server attaches it to a Resend send to the invoice's client_email. Auto-marks the invoice as sent if it was a draft. Uses RESEND_API_KEY (already in env for /api/portal/notify) and FROM defaults to 'Ecomlanders <noreply@ecomlanders.com>' (override via FINANCE_INVOICE_FROM)" },
      { type: "improved", text: "Lazy signed URLs for finance documents and expense attachments — pages no longer pre-sign URLs on mount. Click on a document or attachment kicks off /api/finance/sign and opens the fresh URL in a new tab. Signed URL TTL dropped from 1h to 15min by default since they only need to live as long as the new tab takes to load the file. Caption under expense attachments now says 'Link signed on click, expires 15min'" },
      { type: "improved", text: "Lazy invoice number assignment. New Invoice form no longer reserves a sequence number on mount — only on save. Abandoned drafts now leave no holes in the INV-YYYY-NNN sequence. Form field is editable so you can still override with a custom number if needed" },
      { type: "improved", text: "Legacy migration mapping fix. /tools/expenses legacy rows now default to status=paid with date_paid=created_at (most legacy rows were active recurring expenses the founder was already paying, not unpaid bills). Rows with status='cut' in the legacy table get the recurring frequency stripped and a note appended so it's visible they were historically discontinued. /company/invoices rows still derive status from their legacy paid_date field" },
      { type: "removed", text: "src/lib/finance/migrate-legacy.ts (client-side). Migration logic moved to /api/finance/migrate-legacy server route. Settings page button now calls the API instead of importing the function directly. Required so the migration runs as service-role (the legacy tables will eventually want anon revoked too)" },
    ],
  },
  {
    id: "cl-69",
    date: "20 May 2026",
    version: "0.45.0",
    title: "Finance module — founder-gated money source of truth at /finance",
    changes: [
      { type: "added", text: "Finance module at /finance, founder-only behind a separate FinanceGate passcode (env FINANCE_PASSCODE) with a 30-minute idle timeout that re-locks the section without affecting the outer Launchpad auth. Five tabs: Dashboard, Invoices, Expenses, Documents, Settings. Sits inside the existing (dashboard) layout so it inherits the sidebar and chrome, but the passcode gate is enforced at the layout level so refreshing a deep link still prompts for the code. Sidebar Finance section gets a 'PRIVATE' badge and a 'Money (founder)' entry that opens it" },
      { type: "added", text: "Receivables. New /finance/invoices list (filterable by status and VAT treatment, sortable, CSV export, summary cards for outstanding / overdue / paid-this-month), /finance/invoices/new form, /finance/invoices/[id] detail with mark-sent / mark-paid / regenerate-PDF / delete. Invoice numbers are auto-incremented server-side via a Postgres function (finance_next_invoice_number(year)) so concurrent calls can't collide; format INV-YYYY-NNN, per-year sequence. PDF generation lifted from the legacy /tools/invoice-generator (still using @react-pdf/renderer) but reworked to take a typed InvoiceIssued and CompanyProfile, and to print the VAT note line on reverse-charge / zero-rated invoices" },
      { type: "added", text: "VAT logic. Each invoice carries a vat_treatment (uk_standard, reverse_charge, zero_rated, not_registered, manual). The form suggests a treatment from client country + the company's VAT-registered flag, but lets the user override. Reverse-charge invoices print 'Reverse charge: customer to account for VAT to HMRC (Article 196 VAT Directive 2006/112/EC)' on the PDF. Zero-rated invoices print 'Zero-rated for VAT (outside the scope of UK VAT)'. Manual override allows a flat VAT amount for edge cases" },
      { type: "added", text: "Payables. New /finance/expenses replaces /tools/expenses and /company/invoices (both now redirect). Every expense carries a vat_included flag and optional vat_amount so reclaimable input VAT can be tracked from day one — required for the dashboard's VAT Owed tile to be accurate once the company crosses the VAT threshold. Recurring frequency (monthly / quarterly / annual) and recurring_next_date fields land in v1. PDF / receipt attachments upload to a private Supabase bucket (finance-documents) via /api/finance/upload, and the detail page re-signs the URL on view via /api/finance/sign — bucket is private, not public" },
      { type: "added", text: "Dashboard. Tiles for Revenue (gross + net), Expenses, Gross Profit, Net Profit after Corporation Tax estimate, plus VAT collected / paid / owed. Period selector for current month / current quarter / current UK tax year (6 April → 5 April rollover handled) / custom range. Recharts bar chart for monthly revenue vs expenses, pie chart for expenses by category. Corporation Tax estimate uses current UK rates: 19% under £50k, marginal relief in £50k–£250k band, 25% over £250k. Big disclaimer banner reminds the user it's an estimate only — confirm with accountant" },
      { type: "added", text: "Documents bucket. Drag-and-drop upload zone at /finance/documents with tag + category + document-date metadata, search across name/tag/note, category filter. PDFs / images / CSVs / Excel up to 25MB. Stored privately in finance-documents Supabase bucket, opened via short-lived signed URLs. Categories: Bank Statement, Tax Document, Contract, Receipt, Other" },
      { type: "added", text: "Settings. /finance/settings now owns the Ecomlanders company profile (legal name, registered address, company number, VAT registration status, default bank details, default payment term). Previously hardcoded in src/lib/business-profile.ts — that file remains as the seed value (loadCompanyProfile() falls back to it if no Supabase row exists yet), but the editable copy lives in finance_company_profile. Invoice PDFs and the dashboard's VAT logic both read from the live profile. Includes an 'Import legacy data' button that pulls existing rows from company_invoices and the flat expenses table into finance_expenses with legacy_source/legacy_id breadcrumbs so re-runs skip already-imported rows" },
      { type: "added", text: "Supabase migration 015_create_finance_module.sql — finance_invoices_issued, finance_expenses, finance_documents, finance_company_profile (all jsonb-blob pattern), finance_invoice_sequence (single-row counter table for atomic invoice number increment). Per project memory, this must be pasted into the Supabase SQL editor manually; the storage bucket finance-documents also has to be created from the dashboard as PRIVATE (not public). Set NEXT_PUBLIC_FINANCE_PASSCODE in .env.local before first use" },
      { type: "removed", text: "Sidebar entries for /tools/invoice-generator and /tools/expenses (under the Finance section) and /company/invoices (under Company) — those routes now 308-redirect to their /finance counterparts via next.config.ts. Legacy data is preserved in the original Supabase tables until the user runs the migration; nothing is deleted from Supabase by the cutover itself" },
      { type: "added", text: "VAT return tab at /finance/vat-return — accountant-ready 9-box HMRC summary for any period. Period picker covers Last quarter / Current quarter / Current UK tax year / Custom; basis selector toggles between accruals (invoice date for sales, due date for purchases) and cash (date paid). Each of the 9 boxes renders on screen with the standard HMRC labelling; NI-only boxes (2, 8, 9) are visually muted since they're 0 for a GB Ltd. Box 5 colour-codes green/amber based on whether HMRC owes us or we owe HMRC. Inline blue callout flags reverse-charge sales totals separately (included in Box 6 net, zero output VAT). 'Download VAT pack (.zip)' button produces a ZIP via jszip containing three CSVs: vat-return-summary, sales detail (per invoice: number, date, client, country, treatment, net/VAT/gross, reverse-charge flag), purchases detail (per expense: date, supplier, category, net/VAT/gross). Filenames embed the period and the company legal name so the accountant can drop straight into a filing folder. Big amber disclaimer reminds the user to confirm with accountant before filing, plus per-period footnote that includes the basis used and any caveat (e.g. company not VAT registered → figures shown for reference only)" },
    ],
  },
  {
    id: "cl-68",
    date: "19 May 2026",
    version: "0.44.2",
    title: "Pods client roster routes to engagement, team mirror at /team/engagements",
    changes: [
      { type: "improved", text: "Pods admin · clicking a client in the cross-pod roster on /pods-v2/admin now opens the client engagement at /engagements/[id] instead of the legacy /tools/client-portal page. The portal was a vestige of the pre-engagement architecture and never had the brief, intake, deliverables, or pod context that PMs actually need when they pop into a client card. Caption under the roster updated to 'Click into a client to open their engagement' so the affordance matches the destination" },
      { type: "improved", text: "Pods · individual client cards inside a pod (the per-pod roster on /pods-v2/[podId] and /team/pods/[podId]) now route to the engagement page too. Admin-context cards link to /engagements/[id], team-context cards link to /team/engagements/[id] so team members stay inside the team hub instead of bouncing off the AuthGate redirect that protects /engagements/*" },
      { type: "added", text: "Team-side engagement detail at /team/engagements/[id]. New route reuses the existing EngagementDetailClient component but mounts it inside the (team) layout so the TeamSidebar and team chrome stay consistent. Pathname-aware logic inside the detail client hides admin-only chrome when in the team route: the Delete client button, the 'Pick a pod from purgatory' nudge that only renders for parked engagements (podNumber === 0), and the inline 'Open purgatory' link on the scoped deliverables preview are all suppressed for team. Back link swaps from 'All clients' → /engagements (admin) to 'Back to pods' → /team/pods (team), and the post-delete router.push redirect uses the same base so the admin flow still lands on the engagement list after a delete" },
    ],
  },
  {
    id: "cl-67",
    date: "18 May 2026",
    version: "0.44.1",
    title: "Cap Node heap to stop build memory spikes",
    changes: [
      { type: "fixed", text: "Pods · stable member IDs + Manage Roster UI. Pod members used to be hardcoded into SEED_POD_DEFINITIONS with random per-browser UUIDs, so avatars were keyed by pod_name+role (e.g. 'pod:Pod 2:primary_designer') and there was no path to move anyone between pods. Two bugs fell out of that: (1) Jack occasionally rendered Brandon's photo because the legacy avatar map and the additive Supabase mirror could fight over which Pod 2 / Pod 3 row 'won' dedupe, and (2) Dan's avatar disappeared whenever a fresh browser hit /pods-v2 because ensureCroLeads() wrote an avatar-less Dan to localStorage which then mirrored an upsert into pods_v2_cro_leads, blanking the cloud copy. Fixes: pod and member ids are now deterministic ('pod-1' / 'member-jack' etc.) with a one-time migration in ensureSeed that rewrites old random ids, rewires client.pod_id / project.pod_id / task.assigned_to, and deletes the orphan random-UUID rows from Supabase. Initial pod seed + ensureCroLeads() now bypass the Supabase mirror so a fresh browser doesn't trample the cloud before bootstrapPodsSync has hydrated. bootstrapPodsSync now overlays any local avatar_url onto cloud rows whose slot has none (per stable member id) and writes the merged result back, so the cloud heals itself if an avatar-less write ever lands. Avatar URLs now live primarily on member.avatar_url and follow the member through moves; the business_settings.avatars pod_name+role map is kept in sync as a legacy fallback" },
      { type: "fixed", text: "Pods · Add deliverable form now surfaces every client on the pod, not just the ones that already have a project. Alister reported he couldn't add deliverables to Harvestory because the inline form was project-scoped, and Harvestory had a Client row (8k retainer) but no Project yet, so it was invisible to the dropdown. The picker now lists each existing project plus a '+ New project for <client>' option for every pod client without a project. Selecting the new option auto-creates a stub Project (name 'Initial build', empty pages, today's signoff_date → next-Monday kickoff → Thursday delivery via the standard bucket math) before threading its id into addPairedDeliverable so the paired Design + Build tasks land on the right swim lane immediately. Removes the bounce through /pods-v2/new-project for retainer clients with no scoped pages on the books" },
      { type: "fixed", text: "Pods · task status pip can now step back via shift-click or right-click, so a mistaken tick on a design task no longer traps you in the dev handoff modal. Alister reported he 'couldn't untick the Trusted Prenup design' because the forward cycle (todo → in_progress → done → todo) gates in_progress → done behind a 3-checkbox handoff modal, and there was no path back from in_progress without going through that gate. The pip now responds to shift-click (and right-click as a fallback) by stepping backward: in_progress → todo, done → in_progress. todo is the start of the line so shift-click is a no-op there, prevents accidental wrap-forward into done and the side effect of skipping the handoff gate. Same behaviour wired into /pods-v2 root and /pods-v2/me. Tooltip updated to 'Click to advance · Shift-click or right-click to step back'" },
      { type: "added", text: "Pods admin · Manage roster section on /pods-v2/admin. Move members between pods with the → Pod N buttons, swap two members in one click by selecting one then clicking another (roles + pods swap together, useful for re-pairing secondaries by timezone), change role inline via the dropdown under the name, and rename / un-placeholder a slot by clicking the name. Avatars travel with the member because IDs are stable, so re-pairing doesn't reset photos or break task assignments. Backed by new moveMemberToPod / swapMembers / updateMemberDetails exports in pods-v2/data.ts" },
      { type: "fixed", text: "Local builds were spiking past available RAM and freezing the laptop during routine Claude-driven changes. Root cause: with no NODE_OPTIONS cap set, next build, tsc, and eslint each grew their heap unbounded, and when run concurrently against the larger client files (conversion-pack/presentation.tsx at 5,190 lines and tools/client-portal/[id]/page.tsx at 5,187 lines, each a single module with 20+ sub-component declarations) the summed working memory blew past the 18GB physical RAM ceiling. macOS responded with aggressive memory compression + swap thrashing, which presents in Activity Monitor as 'Claude' using 60-70GB (that figure is RSS + compressed + swapped, not real RAM). Fix: dev, build, lint, and a new typecheck script now prefix NODE_OPTIONS='--max-old-space-size=8192' inline in package.json so every Node process spawned by npm run is capped at an 8GB heap. Caps the worst case instead of letting one runaway worker pull the whole system into swap. A process that genuinely needs more than 8GB will now error with 'JavaScript heap out of memory' rather than freezing the OS, which is a useful signal that a file (likely one of the 5K-line ones) needs splitting. Vercel inherits the cap via the same scripts but current production builds sit well under 8GB so deploys are unaffected. Also nuked the stale .next/dev cache (1GB, last touched 8 days before the fix and pre-dated 8+ feature commits) to force a clean rebuild against current code" },
      { type: "added", text: "New npm run typecheck script that runs tsc --noEmit with the same 8GB heap cap. Use this in place of 'npx tsc --noEmit' going forward so the pre-push type check inherits the memory cap and matches the pattern used by the other scripts. CLAUDE.md still mandates the type check before every push to main, this just gives it a safer execution path" },
    ],
  },
  {
    id: "cl-66",
    date: "14 May 2026",
    version: "0.44.0",
    title: "Clients area cleanup + roadmap deck",
    changes: [
      { type: "added", text: "Timestamped Notes section on /engagements/[id]. New panel above the Activity feed: textarea at the top for the new entry (Cmd+Enter to save), reverse-chronological log below with date + time on each row and a hover trash icon to delete. Notes persist on the pods-v2 Client.notes[] array (new ClientNote type), pushed up to Supabase via the standard write() upsert and threaded through to MockEngagement via the engagement-from-pods bridge. Locally-only engagements (no Client row) keep the log in component state. Add / delete handlers are optimistic locally, then sync to pods-v2 in the background. Use it for client asks captured on Slack, blocker recaps, decisions made off-doc, anything that doesn't fit the auto-generated activity feed" },
      { type: "added", text: "Onboarding inbox: revert an approved submission back to pending. New 'Send back to pending' link sits next to the green Approved chip; clicking it confirms then clears status + assigned_at + assigned_by. Lets the PM unstick a misfire (wrong checklist tick, wrong portal pick) without having to delete + re-submit. The linked engagement (if any) stays put, re-approval is idempotent so the same Client gets returned" },
      { type: "added", text: "Onboarding inbox: 'Create Client Engagement' button now requires at least one scoped deliverable before it'll fire. Disabled state shows an amber hint above the button ('Scope at least one deliverable above before spinning up an engagement'). Prevents the empty-engagement trap where a submission gets approved with zero deliverables and the engagement page renders blank stage tables" },
      { type: "improved", text: "Public onboarding form (/onboard) example placeholders swapped from Luma Nutrition / competitor1.com / store.com / Your Brand Name / your-store.myshopify.com to Ecomlanders-coded placeholders. Sets the brand-correct expectation in the form for anyone landing cold" },
      { type: "added", text: "Pods page weekly capacity. Each pod card now shows a two-cell strip below the monthly capacity meter: This week + Next week, each as a Mon-Sun window with the design-discipline points landing inside, against a derived weekly cap (capacity_points_per_month / 4 = 10pts for a standard 40pt pod). Same emerald / amber / rose tone scale as the monthly bar so an overloaded week reads at a glance even when the month overall looks fine. New weekWindow helper in pods-v2/calc.ts, CapacityMeter component picks up two new optional props (thisWeekUsed, nextWeekUsed) and renders the strip via a new WeekCell" },
      { type: "improved", text: "Add-deliverable form on /engagements/[id] swapped the W1-W4 Thursday dropdown for a free-pick date input. Defaults to the W3 Thursday of the currently-viewed cycle so the form opens with a sensible cadence-aligned date, but the PM can override to any calendar day (rush turnarounds, mid-cycle adds, off-cadence one-offs). Live preview chip next to the date input shows the Month + Week + day index the chosen date will resolve to, so it's clear which slot the deliverable will land in even when the date isn't on cycle. dueDay + cycle + weekInCycle all derived on submit via cycleForDay / weekInCycleForDay" },
      { type: "added", text: "Delete a custom deliverable from /engagements/[id]. Each PM-added row picks up a tiny trash icon on hover at the right end of the doc cell. Click → native confirm → drops the row from the stage table, clears its deliverable state, logs an activity entry. For pods-v2 Clients the matching pod-board Task is also deleted via deleteTask (paired design + dev tasks dropped together via paired_task_id), so the same deliverable doesn't keep appearing on the pod side. Audit-template rows aren't deletable, those are fixed CRO scaffolding the engagement template ships with" },
      { type: "added", text: "Soft-delete for client engagements with a double-confirm + Trash area. New 'Delete client' button in the top-right of /engagements/[id] opens a two-step modal: Step 1 explains the move-to-trash + restore option, Step 2 requires typing the client's exact brand name to enable the destructive button. Confirming snapshots the full Client + Projects + Tasks payload (for pods-sourced engagements) or the MockEngagement (for locally-created ones) into a new engagements_trash store, then cascade-deletes the underlying pods_v2_clients / pods_v2_projects / pods_v2_tasks rows from localStorage + Supabase via mirrorDeleteFromSupabase so the engagement is gone everywhere. New deleteClientCascade + restoreClientCascade helpers in pods-v2/data.ts handle the writes idempotently. A new /engagements/trash route lists every deleted engagement with delete timestamp, source (pod client / local / reference), project + task counts, plus two actions: Restore (puts the snapshot back into all three stores, mirrors to cloud via the standard write() upsert) and Delete forever (second double-confirm modal, type-the-name pattern). Trashed ids filter out of the /engagements grid and the /engagements/[id] detail page so a direct URL to a deleted engagement 404s even if its static mock still exists in code. Trash count chips into the top-right of /engagements next to New client when non-empty. Trash store mirrors to a new engagements_trash Supabase table (migration 013) so a delete on device A propagates the hide + the restorable snapshot to device B" },
      { type: "added", text: "Templated HTML roadmap deck at /share/roadmap/[clientId]. Public URL, no auth, auto-generated from the engagement data. Uses the same three-tier lookup as /engagements/[id] (localStorage-created then pods-v2 Supabase Client then static MOCK_ENGAGEMENTS) so every engagement the dashboard can render also has a working roadmap deck. Cover (brand name, project roadmap kicker), At a glance facts grid (engagement type, scope/bucket, working days, pod, kickoff, delivery, primary contact), goal callout (primary goal + success metric from the brief), what we're building (per-deliverable rows showing stage, working day, owner, and shipped/in-progress chips driven by deliverable status), 3-phase 'how we get there' card row, dark Slack/weekly/reviews communication block, footer attribution. Shareable end-to-end with the client" },
      { type: "fixed", text: "/share/roadmap was 404ing on bucket mock engagements (eng-003, eng-004, eng-005). Root cause: the page was server-fetching from Supabase only, which doesn't see localStorage-created engagements or the static MOCK_ENGAGEMENTS array. Refactored to a client component using the same loadLocalEngagementById, loadEngagementFromPodsById (with a bootstrap pre-flight so a fresh browser hydrates from Supabase), MOCK_ENGAGEMENTS fallback hierarchy that the engagement detail page uses" },
      { type: "fixed", text: "Pods were displaying as 9 cards (three duplicate rows of Pod 1 / Pod 2 / Pod 3) on /pods-v2. Root cause: the additive Supabase mirror in pods-v2/sync.ts accumulated extra rows whenever a fresh browser ran ensureSeed (each pod was assigned a new uid and the mirror added it alongside the existing rows instead of replacing). Pods are seeded as a fixed set of 3 with stable names, so bootstrapPodsSync now dedupes by name post-pull: groups duplicates, keeps the canonical row (highest completeness score across non-placeholder member count, avatar uploads, and slack channel set), and deletes the others via mirrorDeleteFromSupabase so the cleanup sticks across every device. Only triggers when cloud returns more than 3 pod rows so steady-state runs are no-op" },
      { type: "fixed", text: "Engagement routes (/engagements and /engagements/[id]) were missing the bootstrapPodsSync pre-flight. A fresh browser visiting /engagements without first going through /pods-v2 saw only mocks and the detail route notFound on real pods-v2 client ids. Both routes now run bootstrap on mount and re-read engagements after cloud hydrates. The previous 1500ms retry band-aid on the index page is replaced with the real bootstrap pull" },
      { type: "fixed", text: "spawnEngagementFromOnboarding is now idempotent. If a Client already exists for the given onboarding_submission_id (re-approval after un-archive, double-click during slow network, cross-device replay), the existing engagement is returned instead of spawning a duplicate. Prevents orphaned Client rows that the inbox deep-link could pick the wrong one of" },
      { type: "improved", text: "Engagement creation is now decoupled from pod assignment. Clicking 'Create Client Engagement' in the inbox spawns a parked Client (pod_id=''), no Project, no tasks, no auto-pick of Pod 1. The Client lands in /pods-v2 purgatory where the PM uses 'Assign to pod' (capacity-aware picker, lightest-loaded pod pre-selected) to create the Project + seed the design and dev tasks. Lets the PM scope and prep the brief before committing capacity. The AssignToPodModal now matches existing parked Clients by onboarding_submission_id (falling back to name for legacy rows), syncs the Client's pod_id via moveClientToPod when first assigned, and threads variant labels onto task titles. Inbox button subtitle updated to reflect the two-step flow" },
      { type: "added", text: "Parked-engagement nudge banner at the top of /engagements/[id]. When engagement.podNumber === 0 (no pod assigned yet), an amber callout sits above the metrics strip with copy 'Not assigned to a pod yet, pick a pod from purgatory to spin up the build tasks. The brief, intake, and roadmap are ready to go' plus an Assign-to-pod button linking to /pods-v2. Disappears once a pod is assigned" },
      { type: "added", text: "Scoped deliverables preview on /engagements/[id]. When the engagement was spawned from an inbox submission but no project has been created yet (still in purgatory), the deliverables the PM scoped during intake render as a numbered list with type + variant label + 'pending pod' pill. Each row uses the canonical page label (PDP / Homepage / etc.) and a footer link to /pods-v2 purgatory. Disappears the moment the pod-assignment flow creates the real customDeliverables. Fixes the 'they didn't move to the engagement' confusion where the PM scoped pages in the inbox but the engagement page looked empty" },
      { type: "improved", text: "Add deliverable form on /engagements/[id] reworked. Old free-text 'Deliverable name' + 'Day 1-90' inputs replaced with: Type dropdown (every PageType: PDP / Homepage / Quiz / Advertorial / etc.), Variant label (optional, e.g. 'Whitening Strips' so 3 PDPs read uniquely), Owner select, and a 'Lands on' Thursday picker (W1/W2/W3/W4 of the current cycle, defaults to W3) with a live '(M{cycle} · day N)' preview. Due day is auto-computed to land on the chosen week's Thursday so deliverables stay on the team's weekly cadence. Deliverable name is auto-built from type + variant ('PDP · Whitening Strips') so the pod board reads cleanly across paired tasks. Picked type also feeds the bucket-sizing logic when the project lands on a pod" },
      { type: "added", text: "Roadmap deck now surfaces the post-launch support window. New 'Support wraps' milestone gets auto-synthesised 30 calendar days after the Launch milestone with body 'New work scoped separately from here'. New 'Post-launch support' channel cell ('30 days from go-live. Bug fixes, tweaks, monitoring. We stay on it.') joins Slack / Monday check-in / Thursday delivery, so the channels block reads as a 4-tile grid covering the full engagement rhythm" },
      { type: "improved", text: "Roadmap deck green accents stripped. Pre-headers (PROJECT ROADMAP kicker top-left, WORKING TOGETHER kicker on dark hero) shift from green to grey. Timeline dots all black now (Kickoff, First design over, Live link sent), no more selective green accent for Kickoff + Launch. After-launch 30-day support window dot moves from green to neutral grey. Orange slippage warning kept (it's a warning indicator, not a brand accent). Whole deck now reads monochrome with only the orange slippage cue, which makes the warning land harder when it does appear" },
      { type: "improved", text: "Comms cards rewritten to match the actual rhythm. Slack: 'Available to answer questions or queries on the shared channel set up at kickoff' (not 'day-to-day async' which implied constant chatter). Monday Update (renamed from 'Monday check-in'): 'Where we are, what's locked for the week, anything that needs a decision' (dropped the '30 minute' framing — it's an update, not a fixed-length call). Thursday Delivery copy kept. Cadence stat secondary line shifts from 'Mondays for check-ins' to 'Mondays for updates' to match" },
      { type: "fixed", text: "Roadmap deck Live link milestone now always lands on a Thursday. Previously calculated as `lastBuild + 1` (just one working day past the last build deliverable), which produced Tuesday or Wednesday dates when mock data wasn't Thursday-aligned. New snapToThursday helper rolls the date forward to the next Thursday so the deck stays on the team's cadence regardless of underlying data" },
      { type: "improved", text: "Roadmap deck page background switched from #FAFAF7 (warm cream, slight yellow cast) to #F7F8FA (cool neutral grey) so the deck matches the launchpad brand palette. Inner card backgrounds + bordered tile bgs unchanged" },
      { type: "removed", text: "Dropped the 'This page updates live as scope evolves' line from the roadmap deck header subtitle and footer Document cell. Implementation detail, not interesting to a client" },
      { type: "improved", text: "Roadmap deck loses Conversion Engine branding so the same template works across project-only buckets, retainers, and bespoke work. Top-left kicker switched from green 'CONVERSION ENGINE' to green 'PROJECT ROADMAP'. Top-right replaces 'Project roadmap / Generated [today]' with a bigger 'Kickoff / 13 April 2026' block. Footer brand cell drops the 'CONVERSION ENGINE' subtitle in favour of a generic 'Design + build for ecommerce.' tagline" },
      { type: "improved", text: "After Launch section rebuilt as two text-only cards without dates. The 'we watch the numbers' card covers performance tracking + test wins + the readout call; the '30-day support window' card covers bug fixes, tweaks, and monitoring with the 'anything new after that gets scoped separately' boundary. Removes the date-stamped readout / support-wraps stage tiles which weren't useful at the engagement level — readout timing depends on test signal, support wrap-up is an engagement boundary not a milestone" },
      { type: "improved", text: "Roadmap deck footer Questions cell switched from a mailto hello@ecomlanders.com link to 'Reply on Slack' with subtitle 'Shared channel goes live at kickoff. Fastest way to reach us.' Slack is the primary support channel, no reason to give clients an email escape hatch on the deck" },
      { type: "removed", text: "Dropped the 'What we're focused on' goal callout from the roadmap deck. Removed the unused brief.primaryGoal / brief.successMetric variables that powered it. Header was carrying its weight anyway" },
      { type: "improved", text: "Roadmap deck header right-side metadata switched from 'Generated [today]' (not useful to a client) to 'Kickoff · 13 April 2026' (the date that actually matters). Tabular nums for consistent rhythm with the rest of the deck" },
      { type: "added", text: "Roadmap heading carries an orange asterisk anchoring a footnote below the roadmap card: 'Timeline assumes Shopify access, brand assets, and any other requested inputs are returned on time. If client-side requirements come back late, the slippage rules above apply and delivery dates shift to the following Thursday.' Sets client-side expectations honestly without burying it in body copy" },
      { type: "improved", text: "Roadmap deck body text bumped to 14-15px across the board so nothing reads tiny. All 11-13px body text (rhythm tile bodies, slippage secondary, milestone bodies, dark channel descriptions, key-date descriptors, after-launch bodies, footer document/email/notes) lifted to 14px. Rhythm tile stage names (Kickoff / Designs delivered / Revs + dev / Live link sent) bumped to 15-16px. Header subtitle bumped to 15px with leading-relaxed. Tiny uppercase tracking labels (10px micro-type for section kickers, stage tags) kept small intentionally — they're labels not reading copy. Stat primary values (22-24px) and brand headline (36-44px) unchanged. Hierarchy intact, but no more squinting on the body" },
      { type: "improved", text: "Roadmap deck aesthetic relaunched to match the Pod Overview pattern (rounded-2xl white cards on cream, soft shadows, inner stat tiles). Every major section is now a card: Key dates, How the cycle runs, Roadmap, After launch, Working together (dark variant), Footer. Inside each card, sub-tiles use the same rounded-lg + #FAFBFC bg + #EDEDEF border pattern that the Pod cards use for their inner metrics. Header now horizontal (brand left, 'PROJECT ROADMAP / Generated' right) to free vertical space. Slippage callout sits inside the cycle card as an amber-bordered nested block with the orange left bar. Roadmap milestones live in a bordered list inside their card with divide-y separators. Whole deck reads as one consistent system that matches the internal Launchpad aesthetic instead of feeling like a different design vocabulary" },
      { type: "improved", text: "Roadmap deck bottom-half rebuilt for weight + polish. Slippage callout moved out of the cycle-rhythm container into its own bordered card with a 6px orange left-accent bar, uppercase IF REVISIONS SLIP tag, a 14-15px tracking-tight headline ('Past Monday or multiple rounds means we move the build to the following Thursday.') and a smaller secondary line ('Sometimes that means delivering early. Always means shipping clean.'). Reads as a deliberate tone-setter not a footnote. Working-together channels block switched back to a dark hero card (bg-#1B1B1B, white text) with a green kicker, a 22-26px headline ('How communication runs across the engagement.'), and 4 channel cells separated by white/10 hairlines. Footer rebuilt as a 3-column block with a 2px black top rule: Ecomlanders mark + Conversion Engine sub on the left, Document metadata in the middle, Questions / email + Slack note on the right. Brand name typography jumped to 18-20px font-semibold so the footer carries weight instead of trailing off" },
      { type: "improved", text: "Roadmap deck formatting tightened. Dropped the 'Deliverables count' stat tile (the count was meaningless to a client without context); stats grid now reads as 3 evenly-spaced cells: Kickoff, Delivery, Cadence. Channels block dropped the dark callout block + gap-px treatment in favour of the same hairline-bordered grid pattern as the stats / rhythm / after-launch strips, so every grid in the deck shares one visual language. Channel cells now match cell padding (py-5 md:py-6 md:px-4) and use the same border-r + last:border-r-0 pattern. Section spacing tightened from mb-14 to mb-12 across the board. Roadmap rows picked up matching md:py-6. Whole deck reads as one consistent system rather than a stack of slightly-different-looking sections" },
      { type: "improved", text: "Cycle-rhythm strip renamed 'How the cycle runs' (Mon to Thu, week over week) and restructured to cover the full 2-week pattern: Mon W1 Kickoff (project starts, wireframes + design begin same day) → Thu W1 Designs delivered (initial design lands by EOD, revisions asked for by Friday EOD) → Mon W2 Revs + dev (notes addressed, desktops built, hand-off to dev) → Thu W2 Live link sent (approval signed, build pushed live). Slippage rule pulled inside the same bordered container as a tone-setting amber row: 'IF REVISIONS SLIP, past Monday or multiple rounds means we move the build to the following Thursday. Sometimes that delivers early. Always ships clean.' Sets the cadence + the escape valve in one strip so the client sees both the rhythm and the consequence of slow revisions" },
      { type: "added", text: "(superseded) Weekly-rhythm strip 'How a week runs' between the stats grid and the roadmap timeline. Four hairline-separated cells anchor the real Thu-to-Thu cadence: THU Design delivered (by EOD) → FRI Revisions requested → MON Revisions + dev (notes addressed, dev starts same day) → THU Build live. Below the strip, a 'Slippage rule' callout explains the auto-push behaviour: 'If revisions run past Monday or need multiple rounds, we move the build to the following Thursday rather than ship rushed. Sometimes that means delivering early. Always means shipping clean.' Sets honest expectations client-side and protects the team from death-march cycles when revisions sprawl" },
      { type: "improved", text: "Roadmap headline timeline cut to the three dates that matter to the client: Kickoff (Monday work starts), First design over (the Thursday the first design lands), Live link sent (the Thursday the build goes live). Per-deliverable design / build rows folded out of the headline view — they were noise for a client trying to find the three milestones they care about. Test wrap, readout, and support-wraps moved into a smaller two-cell 'After launch' strip below the main timeline. Launch row copy carries the launch-time + Friday flex ('Launch slot confirmed with you ahead of go-live. US evenings and Friday windows available.') so US clients and Friday-launch requests are visible without needing a separate field. Slippage rule callout still covers revision-overrun behaviour" },
      { type: "improved", text: "Roadmap timeline rows slimmed. Removed the deliverable-name list and walkthrough language from each Thursday row (PM clarified: 'we don't do a slack walkthrough or a call'). Design review row reads 'Design ready in Figma. Sign-off needed by EOD Friday to stay on cycle.' Build live reads 'Live on staging. Preview link in your inbox.' Test wrap reads 'Test results captured. Wins logged.' Kickoff row reworded from project-setup chatter ('Slack channel goes live. Access requests out') to 'Build phase begins. Wireframes start the same day' since the first Monday is typically client-in-person not async setup" },
      { type: "improved", text: "Monday vs Thursday distinction sharpened across the roadmap deck so the client never confuses a check-in with a delivery. CADENCE stat tile now leads with 'Thursdays' (primary) and 'Deliveries · Mon check-ins' (secondary). Monday channel renamed to 'Monday check-in' with explicit copy ('30 minutes. Lock priorities, surface blockers. Not a delivery slot.'). Thursday gets its own channel ('Core deliverables ship. Preview link or design review in your inbox.'). DELIVERY stat tile pins to the Launch milestone date rather than the absolute last milestone, so the post-launch support wrap-up date doesn't get presented as the delivery" },
      { type: "improved", text: "Roadmap deck visually rebuilt to match the launchpad / conversion-pack aesthetic. Cover: tiny green CONVERSION ENGINE kicker top-left, grey PROJECT ROADMAP top-right, then a 56-72px tracking-tight brand headline with a single hairline rule underneath. Goal + success metric optionally sit under the headline as a one-paragraph callout with a 10px uppercase 'SUCCESS' marker. Stats strip: 4-cell grid with hairline-separated cells (Kickoff / Delivery / Deliverables / Cadence), each tile leading with an uppercase 10px tracking-[0.22em] label, a 26-30px tabular-num primary value, and a small secondary descriptor (weekday for dates, 'in scope' for the count, 'Thursday deliveries' for cadence). Roadmap: 7+ milestone rows as a vertical list with hairline dividers; left pillar (140-180px) holds a tiny uppercase weekday + a 24-28px tabular-num date; right pillar leads with a coloured dot + 10px uppercase stage tag (Kickoff / Design review / Build live / Test wrap / Launch / Readout) and a 15-16px one-line description. Kickoff + Launch tags pick up the green accent; the rest stay in #1B1B1B for restraint. Channels block: 3-cell grid (Slack / Weekly check-in / Reviews) with the same hairline-grid pattern, one-line bodies under each. Footer: ECOMLANDERS mark + 'Generated {date}. Updates live' on the left, mailto link on the right, thin black rule above. Cuts the 'How we get there' 3-phase deep dive and the dark Slack callout from the previous version, both too chatty. Whole deck reads like a professional client artefact rather than an internal status page" },
      { type: "improved", text: "Supabase mirror failures now log to console instead of silently swallowing. Affected paths: mirrorToSupabase, mirrorDeleteFromSupabase, pullTable (all in pods-v2/sync.ts), plus the read() corruption catch and the four fire-and-forget fetches (slip-notify, portal phase sync, stale-notify, blocker-notify) in pods-v2/data.ts. localStorage is still the always-correct cache so correctness isn't affected, but cloud-drift regressions now surface in devtools instead of being invisible until they pile up" },
      { type: "removed", text: "buildSeedProjectsAndClients in pods-v2/data.ts: a 232-line function that built Acme Skincare / Glow & Co / Boreal Coffee / Hadron Apparel / Quartz Goods demo clients + projects + tasks. Never called anywhere, leftover from the pre-Conversion-Engine seed era. Pure dead code removal, no behaviour change" },
      { type: "improved", text: "engagement-detail-client.tsx reduced from ~1800 lines to ~1450 by extracting three section components into src/components/engagements/: MustDosRow (the 4-gate row + modal opener), BriefIntakePanel (the full intake form render with the slim fallback for unlinked engagements), and GeneratedDocs (the Project roadmap card). State stays on the parent; props pass down. Easier to reason about and to refactor further without one file owning everything" },
      { type: "improved", text: "245 em-dashes and en-dashes swept out of the pods-v2 + engagements + roadmap + must-do code paths (comments + user-facing strings alike). Replaced with commas in the typical X, Y clarifier construction. Brings the relevant code in line with the project no-dash convention" },
      { type: "fixed", text: "Roadmap deck delivery date drifted by one calendar day in BST due to a toISOString().slice(0, 10) call returning the UTC date. Replaced with a local-tz YMD formatter using getFullYear / getMonth / getDate so the displayed delivery date matches the working-day calc regardless of timezone" },
      { type: "improved", text: "Roadmap deck stripped of internal language now that it's a client-facing artefact. Removed Pod number, bucket designation, engagement type label, and primary contact card (all PM-internal). Goal callout slimmed (just the primary goal + success line). The 3-phase 'How we get there' deep-dive replaced with a single 'The flow' paragraph. Communication callout rewritten to: 'Core updates arrive on the Thursdays above. Between those, we're on Slack and on hand to answer questions, share progress, or jump on a call any time'. Hook-order bug in the loading/null guard path fixed by moving the useMemo above the early returns" },
      { type: "improved", text: "Roadmap timeline expanded from a thin date list into a full stage-labelled milestone roadmap. Each customDeliverable now emits a row tagged Design review (purple), Build live (blue), or Test wrap (orange) with a one-line client-facing body that names what's landing on that date ('Design ready for your review: PDP hero rework. Walk-through over Slack or a call, whichever you prefer.'). The deck also auto-synthesises a Launch row (green, anchored to the last build deliverable + 1 wd, copy: 'We push live and watch the metrics for 48 hours, then send a snapshot of the baseline so any lift is provable.') and a Readout row (black, +10 wd from launch, copy: 'Performance call with the numbers, the wins, and what we'd test next.'). Dot colours + stage labels on each row are colour-matched to the kind. Kickoff stays at the top with its own copy explaining what happens on day one. Same Calendar-date conversion from working-day numbers as before so the client sees real dates not internal day counters" },
      { type: "added", text: "Generated docs section above Resources on /engagements/[id]. Single card for now (Project roadmap) linking to /share/roadmap/[id] with a Client-safe badge. Scope brief + monthly readout PDFs slot in here as they land. Replaces the 'live in the inbox' default for client-shareable artefacts" },
      { type: "improved", text: "Brief panel on /engagements/[id] is now the full intake form read-through (replacing the slim 14-field editable Brief). Default state open (the brief is the most-referenced context on a delivery, no reason to bury it). When the engagement is spawned from an onboarding submission, every captured field renders: PM checklist with notes, Access & data (Shopify URL, analytics software, tracking pixels, integrations, existing landing pages), Brand & business (target customer, top competitors, main products, current metrics), Creative & messaging (brand assets, reviews, tone of voice, words to avoid, USPs, value props), Project specifics (product URL, page type, traffic source, ASINs, Meta page name, direction), Success metrics (primary goal, success definition, timeline expectations), Risk & bottlenecks (conversion challenges, objections, compliance, previous agencies), Workflow & communication (primary contact, decision maker, timezone), uploaded files grid, additional info. Pre-link engagements fall back to the slim brief snapshot if populated, or a 'no brief captured' nudge. Inbox jump link now sits as a sibling of the toggle button (no more nested-interactive HTML warning)" },
      { type: "added", text: "Must dos at the top of /engagements/[id] are now modal-driven gates, same workflow shape as the portal QA gates. Three engagement-level gates (Design QA, Client review, Dev QA), each with its own checklist, optional artefact link field (Figma link, preview URL, shared link), and notes textarea. Pill states: empty (0/N items, grey), partial (k/N items, amber), or complete (timestamp set, emerald with checkmark). Footer shows aggregate k/3 complete. Clicking a pill opens a modal sheet with the relevant gate's content. Two save paths: 'Save progress' captures partial state without completing, 'Mark complete' (enabled only when every item is ticked) stamps completed_at. State persists per gate to pods_v2_clients.must_dos via setClientMustDoGate which merges patches. Replaces yesterday's simple 3-checkbox version" },
      { type: "improved", text: "Must dos now mirror the portal QA pipeline 1:1. Four gates instead of three: Design Brief (CRO Strategist, 6 items, CRO_BRIEF_ITEMS), Dev Handover (Designer, 4 items, DESIGN_HANDOFF_ITEMS, Figma link field), Dev QA (Developer, 151 items across 40 categories, DEV_HANDOFF_ITEMS + DEV_HANDOFF_CATEGORIES, with collapsible category groups + a Preview URLs sub-panel for staging links), Handoff / Testing (Senior Developer, 7 items, LAUNCH_PREP_ITEMS). Gate keys, item content, owners, and category structure all imported live from @/lib/portal/qa-gates so the engagement view and the portal stay in lockstep without duplication. Imported portal copy is normalised through a clean() helper that swaps em / en dashes for commas at render time. Dropped the invented Design QA + Client review gates and the curated 19-item Dev QA slice from earlier today (Dylan flagged that the engagement gates should reference portal verbatim, not invent shapes). Replaced setClientMustDoGate's key union to align: cro_brief / design_handoff / dev_handoff / launch_prep. MustDoGate type now carries an optional preview_urls[] array used by the Dev QA gate" },
      { type: "improved", text: "Wins on /engagements/[id] are now manual-entry only. Auto-derive from test_result.status=winner has been removed because the wins appeared from nowhere with no clear input path on the engagement side, which was confusing. New 'Add win' button on the wins section header opens an inline form (title, impact metric, day, notes). Saved entries go straight onto the pods_v2_clients.wins[] array via addClientWin. Test results stay on the pod board for the share-card and retro analytics" },
      { type: "improved", text: "Metrics strip on /engagements/[id] slimmed to one row per metric: label, baseline (small grey), current (medium black), delta + delta % (green/red). Each metric is a single horizontal row instead of a 2-column card with vertically stacked baseline/current. Half the previous height, easier to scan" },
      { type: "improved", text: "Phase picker on the pod board is now discipline-aware. Design tasks no longer show Development / Dev QA / Dev revision phases, and dev tasks no longer show Design / Internal design QA / Design revision. Strategy tasks (Dan's CRO weekly work) show only Onboarding + Research. New phasesForDiscipline helper in @/lib/task-board/phases. Stops the cross-discipline phase mistakes that 12 flat options invited" },
      { type: "improved", text: "Significance % chip removed from the engagement deliverable row. Was creating visual clutter. Significance still rendered on the share-card and now also lives in the row test-chip's tooltip (e.g. '95% sig. Hero variant B beat control')" },
      { type: "fixed", text: "PhaseTimeline component was using a Tailwind dynamic class (`space-y-${compact ? '2.5' : '4'}`) which Tailwind's JIT can't pick up, so spans rendered flush together. Replaced with a literal ternary returning whole class names. Vertical spacing now actually applies" },
      { type: "fixed", text: "Removed invalid HTML where the Intake panel had a <Link> nested inside the collapse-toggle <button>. Restructured so the inbox link sits as a sibling of the toggle button. No more React hydration warnings" },
    ],
  },
  {
    id: "cl-65",
    date: "13 May 2026",
    version: "0.43.0",
    title: "Phase timeline + Intake panel across Pods and Clients",
    changes: [
      { type: "added", text: "Pods-v2 tasks now carry phase_history. Every visit to a phase appends a span (revisits stay separate, never aggregated). External Design Review to Design Revision and back to External Design Review records as three distinct rows, so the revision-loop count is the signal a PM can read. Initial seed phase, createProject seed tasks, addPairedDeliverable, and the legacy seedClient path all stamp an opening span on create. updateTaskPhase routes through a withPhaseTransition helper that appends only when phase actually changes (re-clicking the current phase is a no-op)" },
      { type: "added", text: "Shared <PhaseTimeline> component (src/components/task-board/phase-timeline.tsx) extracted from the Task Board drawer. Renders the chronological span list with phase-coloured pills, per-span duration, entered-at / exited-at timestamps, and an 'in progress' marker on the current span. Task Board drawer now consumes it; pods-v2 and engagement portal share the same surface" },
      { type: "added", text: "Phase pill on every engagement deliverable row at /engagements/[id]. When tasks carry phase data through from the pods-v2 bridge, the row gets a colour-coded current-phase chip next to the QA gates. Click the chip to expand a phase-timeline drawer underneath the row showing the same per-visit spans the pod board shows. Lets PMs and Dylan see how many revision rounds a deliverable went through without leaving the client view" },
      { type: "added", text: "Pods-v2 phase popover now ends with a Phase history section. Clicking a task's phase pill opens both the 'Move to phase' picker AND a compact timeline of every prior visit + duration. Replaces the lost context where the pod board only ever showed current phase" },
      { type: "improved", text: "task-board Phase enum gains 'wireframe' between research and design so it matches the 12-phase pods-v2 TaskPhase set. PHASE_OPTIONS, PHASE_TO_DEADLINE (designDueDate), and PHASE_TO_CATEGORY (design category) all updated. Previously a pods-v2 task in the wireframe phase rendered as a blank in the shared timeline component" },
      { type: "added", text: "Client.onboarding_submission_id field linking a pods-v2 Client back to the OnboardingSubmission it was spawned from. Wired through spawnEngagementFromOnboarding so every new engagement carries the link. Flows through clientToEngagement to MockEngagement.onboardingSubmissionId so the engagement detail page can lazy-load the full intake. Pre-link clients and bucket mocks degrade gracefully (no panel renders)" },
      { type: "fixed", text: "Onboarding-in-purgatory table on /pods-v2 now deep-links to /engagements/[clientId] when the row was spawned via the new Create Client Engagement flow, falling back to the legacy /tools/client-portal/[portalId] only when the row used the legacy path. Header column renamed from 'Portal' to 'View'. Filter logic also resolves matched Client via the new onboarding_submission_id foreign key (with the company-name fallback retained for legacy rows)" },
      { type: "added", text: "Open client engagement link in the Onboarding Inbox detail panel. Once a submission is approved, the inbox surfaces an emerald 'Open client engagement' link above the existing legacy View Portal row when a pods-v2 Client carries this submission's id. Legacy portal flow untouched (both surfaces remain available during the migration)" },
    ],
  },
  {
    id: "cl-64",
    date: "12 May 2026",
    version: "0.42.1",
    title: "Conversion Pack rename + orbit diagram fit fix",
    changes: [
      { type: "improved", text: "Sales deck route renamed from /sales-deck to /conversion-pack so the URL reads cleanly when shared with leads. Internal links on the dashboard tile and the /offer hub Deck card both updated. Permanent 301 redirect added from /sales-deck so any links already in the wild keep working" },
      { type: "fixed", text: "Slide 6 (Monthly scope) orbit diagram sub-label pills no longer clip on MacBook Air 15 / sub-1440 viewports. Root cause: sub-nodes were positioned at radius 50/54% of the orbit stage, which with nowrap pill text extended past the stage's right and left bounds. Stage max-width bumped 42rem to 48rem, sub-node radii pulled in to 43/46, stagger reduced from 4 to 3, radial spacing tightened from 0.26 to 0.22 rad. Every sub-label ('Funnel audits', 'Components', 'USP framing', 'Stat-sig analysis' etc.) now sits fully inside the slide's content width with breathing room left over" },
      { type: "fixed", text: "Pricing roadmap anchor now scales with the selected buy-in floor on /offer. Previously the Anchor card was hardcoded to £12K regardless of which step was previewed, breaking the 'deal feel' psychology at higher tiers. New anchor mapping: £8K to £12K, £10K to £15K, £15K to £20K, £20K to £25K, £25K to £35K. Anchor card now gets the same green ring + 'Previewing' tag as the buy-in card while a step is selected. Footnote rewritten to interpolate the live anchor figure" },
      { type: "fixed", text: "Conversion Pack deck slide 10 (Next step) has working contact links now. Hero card 'We'll dig in and map the leaks' is clickable to the Calendly booking page (calendly.com/hello-ecomlanders/demo-call) with a 'Book a call · Free funnel audit' tag. WhatsApp link points to the real number (api.whatsapp.com/send/?phone=447457414032). Meta line on the hero swapped 'No call needed' for '30 min' since clicking books a call" },
      { type: "fixed", text: "Mission Control · Portfolio tile now points to /portfolio (v1) instead of /portfolio-v2" },
      { type: "fixed", text: "Conversion Pack deck (/conversion-pack) is now responsive on mobile (viewports ≤768px). Previously every slide overflowed: the cover headline ('Conversion Engine Partnership') clipped off the right edge, the marquee portfolio backdrop covered slide content with its 24vw side columns, the calc/ROI 2-column bodies, scope orbit, rhythm timeline, funnel rows and partner stack all spilled past the viewport, and the 4.5rem h1 / 3.5rem h2 base typography was way too big. Fixed by adding a single @media (max-width: 768px) block at the end of the deck styles: backdrop hidden, base typography scaled down (h1 4.5rem → 2.25rem, h2 → 1.6rem, cover headline 4.75rem → 2.25rem, each slide's bespoke headline brought to ~1.55rem), every grid-template-columns rule overridden to '1fr', the scope orbit reset from absolute-positioned radial layout into a flex column of icon+title rows with the hub centered above, sliders/cards/badges resized, outer container padding reduced (px-10 → px-4 sm:px-6), '← → arrow keys to navigate' hint hidden on mobile. Tighter ≤480px overrides for very small phones. Desktop layout untouched (overrides only fire under 768px). All 9 slides verified at 375×812 and 1280×800" },
      { type: "added", text: "Client portal v1 (mock-data preview) lands at /engagements. Per-client delivery dashboard for CE retainers + one-off bucket projects (A=10wd, B=15wd, C=20wd, Bespoke). Bento layout: header with kind tag + day/working-day counters + retainer/pod metadata; collapsible Brief panel sourcing 14 fields from the OnboardingSubmission schema with inline pencil-edit per field; metrics strip (CVR baseline → current + AOV baseline → current with delta % chips); cycle pill tabs (retainers only); stage tables driven by kind — Audit & Strategy / Design & Build / Test, Learn, Prep for retainers, Design / Development / Testing for buckets with size-aware week ranges; deliverable rows show status dot (clickable to cycle todo→in_progress→blocked→done), owner badge (Pod N resolves engagement.podNumber), due date with weekday and OVERDUE pill, doc/link cell with auto-detected brand badge (Google G blue, Sheet G green, Word W, Notion N, Figma F, Miro M, PDF P) + View + Download + replace, QA gate chips per build/dev deliverable (Design QA / Client review / Dev QA, click to tick), test result chip (WINNER +X% with significance, LOSER, INCONCLUSIVE, TEST PENDING); wins log section auto-renders from engagement.wins (title + day shipped + metric impact + notes); resources card grid scoped per cycle (Figma / Roadmap / Audit / Monthly brief / Preview URLs / Analytics for retainers, Figma / Preview URLs / Analytics for buckets) with dashed-orange MISSING state when empty + black filled Add CTA; activity feed. List page (/engagements) has Engagement Health row (Active / Overdue / Blocked / Missing) + CE Retainers section (full-size cards) + Single Projects section (compact cards); '+ New client' button spawns /engagements/new with kind selector + brand + vertical + value + pod + contact + timezone + URL + kickoff Monday date, persists to localStorage and redirects to the new id. Sidebar entry 'Clients' between Offer and Pods. Mock data: 1 demo engagement (Forge Athletics, Bucket C) populated with metrics, gates, test results + wins to show the full surface; Caster (A) and Vista (B) sit as bucket-size reference cards. All schema parallels pods-v2 Client/Project/Task — next slice wires the engagement portal as a client-shaped read/write lens over the same Supabase tables the pod board operates on" },
    ],
  },
  {
    id: "cl-63",
    date: "11 May 2026",
    version: "0.42.0",
    title: "Conversion Engine sales deck v2 + offer hub bento redesign",
    changes: [
      { type: "improved", text: "Sales deck (/sales-deck) flipped from dark to a light design language matched to Launchpad. New cover slide leads with the Ecomlanders mark, big typographic 'Conversion Engine Partnership' headline, and a positioning sub ('Compounding funnel-wide wins that recover the revenue you're losing'). Marquee of portfolio screenshots stays as the cinematic backdrop, retuned for the light bg. All 9 remaining slides rebuilt in the same v2 vocabulary — dark headlines with a faded-grey accent half, soft-green hero callouts with a circular arrow badge + dot-textured fill, neutral support cards, consistent kicker / sub / divider / foot rhythm. Solid green #00C853 replaces the luminous mint, used sparingly on hero-only elements" },
      { type: "improved", text: "Slide 2 reframed from 'leak nobody owns' three-box diagram → 'What it is': 4 operating pillars (Strategy / Build / Test / Learn) above a labelled funnel scope visualisation. Three zones demarcate ownership — pre-click (ad agency), our zone (Land → Engage → Add to cart → Checkout → Buy, with a 'What we own' column listing landing pages / PDPs / cart drawer / checkout flow / order confirm), and post-sale (retention agency). Headline 'A monthly partnership built to recover the revenue leaking from every stage of your funnel.' Cold prospects now get the shape of the engagement in one frame" },
      { type: "improved", text: "Slide 3 (Revenue projector) bento'd around the value comparison. 5 sliders on the left (Monthly traffic + Current/Target CVR + Current/Target AOV) feed a calculation that the right column visualises as two stacked proportionally-sized cards: a green-textured Monthly Lift hero (with arrow badge, '+£X / +Y% vs today') and a neutral Today card. Beneath them a green Annual Opportunity callout with its own arrow badge. Headline pivots from 'don't dismiss ads' to 'Make every bit of ad spend count. So when you scale, it compounds.' Drag-to-model dynamic — both cards resize via flex-grow as the sliders move" },
      { type: "improved", text: "Slide 4 (Page build vs CE) reframed to not dismiss single builds. One Page card lists actual deliverables (Strategy / Page build / Copy / Dev + launch — 'One-off · a high-impact page, scoped & shipped end-to-end.'); Engine card is the green hero with the full list (Rolling 90-day roadmap, Page builds across the funnel, Copy + design + dev, Continuous A/B test programme, Deep funnel audits, Monthly reports & reviews, Full-funnel coverage). Headline 'Ownership of your entire conversion layer, not just single points.' Single builds positioned as the on-ramp to the Engine, not the lesser option" },
      { type: "improved", text: "Slide 5 (We sit between) restructured so we visually anchor the funnel rather than slot in between. Two small satellite cards top-left/top-right (Ads agency / Email agency, with channel + tool pills + flow indicators) feed into a large green hero card below — 'The Conversion Engine: We hold the funnel together.' Hero has a two-column body showing what we do For acquisition (convert ad traffic with intent, lift AOV, drop CAC) and For retention (high-LTV buyers, post-purchase flows, continuous testing). Stack pills (Shopify · Intelligems · Figma · Clarity) ground us in real tooling. 'We work with your ad agency and email team — never against' framing kills the vendor-stepping-on-toes objection" },
      { type: "improved", text: "Slide 6 (Monthly scope) redesigned as an orbital diagram. Centre: a green-textured hub circle containing the Conversion Engine mark (no text — the mark IS the brand). Around it, six main function nodes (Rolling roadmap / Page builds / A/B testing / AOV + LTV / Offer + positioning / Monthly readout) connected via dashed spoke lines on a faint elliptical orbit. Each main node has a fan of staggered sub-node pills (Funnel audits · Priority matrix · Weekly review · PDPs · Landers · Advertorials · Components · etc.) showing the breadth of work under each. Headline 'Your entire conversion engine, all under one roof.' Replaces the senior-hire framing — emphasises scope, not cost comparison" },
      { type: "improved", text: "Slide 7 (Rhythm) converted from a thin timeline into 3 phase cards with a 'Ships this cycle' output footer on each — 01 Strategy (1 roadmap · 5+ prioritised leak fixes), 02 Design + build (Every leak in the queue · pages, components, flows), 03 Live, test, learn (Live A/B tests · monthly readout · lifts logged). Phase 03 is the green hero with the arrow badge — the cycle's payoff. Dropped the hardcoded '2-3 builds' commitment in favour of 'whatever week 1 prioritised gets built' — volume scoped by audit findings, not a fixed quota. 'Repeats monthly' loop indicator under the row" },
      { type: "improved", text: "Slide 8 (Investment ROI) — was 'The investment' with horizontal bars, now 'For every £1 in, you pull back £Nx' with two comparison cards (You invest / You recover-as-green-hero) above a 3-metric summary strip (Return multiple, Annual gain, Breakeven CVR lift). £12K anchor added as a dashed-divider note inside the You Invest card ('Or scale to £12K/mo for accelerated cadence') so the upper tier is visible without dominating. Dropped the '30-day notice from M4' pill — too in-the-weeds for a deck. All values pull live from the slide 3 calc inputs" },
      { type: "removed", text: "Slide 8 (Proof) dropped from the deck for now. CRO team flagged that the framing conflates proof with evidence; will rework with the right framing before re-adding. ProofStatsSlide component left in the file (un-routed) for easy re-enable. Deck is now 9 slides" },
      { type: "improved", text: "Slide 9 (Next step) reframed from a 30-minute strategy call to a free funnel audit as the natural next step. Tag 'Free funnel audit', title 'We'll dig in and map the leaks', bullets describe what the audit delivers (full-funnel look, leaks ranked by impact, top 3 to fix first — not a full 90-day plan, which stays as the paid deliverable). Calendar grid replaced with a contact stack: WhatsApp card (green icon, 'Fastest way to get a reply') + Email card ('Custom deep-dive + 90-day roadmap draft'). Both are bordered cards that hover-lift. Deck now works as a standalone send — prospect chooses the channel" },
      { type: "improved", text: "All slides fit on a 1440×900 MacBook viewport. Outer slide padding tightened (py-16 → py-8), v2 headlines scaled (3rem → 2.5rem), sub margin-bottoms reduced (2.5rem → 1.75rem), slide 6 orbital stage shrunk (40rem → 32rem) with hub resized (14rem → 11rem) and node positions retuned, slide 2 funnel bar heights and pillar paddings compressed. Bounding-rect check across all 9 slides confirms each fits under 900px in the worst case" },
      { type: "improved", text: "Cover→slide-2 transition tightened. The exiting cover overlay now fades out (and lifts slightly upward) over 260ms while the new slide is held invisible for the first 240ms before its own 320ms fade-in. Stops the two headlines visually overlapping during the cross-fade — the cover leaves cleanly before slide 2 appears" },
      { type: "improved", text: "Offer hub at /offer rebuilt as a bento layout. Top: pricing block (£8K buy-in + £12K anchor cards). Below: interactive Pricing Roadmap — 5 steps (£8K → £10K → £15K → £20K → £25K, scaled by active-retainer count) where clicking a step previews the new floor across the whole page (header subtitle, buy-in card, projector retainer all reflect the preview tier), with Confirm / Cancel controls and localStorage persistence on lock-in. Sales section: Revenue Projector live widget (2-cols wide, drag sliders for CVR/AOV → see Monthly recovered / Annual opportunity / ROI vs retainer) next to a dark Deck tile (Conversion Engine cover preview with a 'PRESENT ▷' pill that flips to yellow on hover). Objections row: FAQ / Objections / Cheat Sheet. Closing row: Proposal Generator / Onboarding Link. Page is the daily power-tool for Ajay's selling — pricing controls, live calc, and link-outs all on one screen" },
      { type: "added", text: "Revenue Projector widget extracted into a reusable component (src/components/offer-engine/revenue-projector-widget.tsx). Inline on the offer hub now; same component can drop into the deck or a standalone tool later. Accepts a retainer prop so the ROI multiple stays in sync with whichever pricing tier is active" },
      { type: "added", text: "Conversion Engine cover preview component (src/components/offer-engine/deck-cover-preview.tsx) — a 16:9 mini-cover used inside the Offer hub's Deck tile. Dark backdrop, animated mid-opacity portfolio marquee behind a centered Conversion Engine logo. Server-side fetches the live portfolio screenshots so the cover always reflects current case studies" },
      { type: "added", text: "FAQ, Objections, and Cheat Sheet are now inline-editable so the CRO lead can refine copy without a code change. Hover any block → pencil icon → textarea with the markdown source → Save. FAQ splits per ### Q&A (20 sections), Objections splits per ## block (10 + walk-away), Cheat Sheet edits the Positioning banner, all 6 cards, and each objection q+a independently. Edited sections get a yellow tint + 'Edited' tag with a reset arrow to restore the default. Overrides persist to a new Supabase table (offer_content_overrides, jsonb) with localStorage fallback — same pattern as business_settings. Defaults stay in the markdown files / hardcoded TSX and remain authoritative until overridden" },
    ],
  },
  {
    id: "cl-62",
    date: "10 May 2026",
    version: "0.41.0",
    title: "Pods + Conversion Engine offer hub + sidebar restructure",
    changes: [
      { type: "added", text: "Conversion Engine offer hub at /offer — pinned top-level alongside Mission Control + Pods. Single screen unifies what we sell: pricing block (£8K buy-in alongside £12K anchor), tile grid into 9 wiki sections (overview, sales process, onboarding, delivery, conversion matrix, revenue projector, slide deck, positioning, FAQ, objections), cross-links to cheat sheet + case studies + sales deck + audit funnel, and a live audit-funnel snapshot (page views / submissions / CVR / 30-day leads). Replaces the scattered /sales-engine/conversion-partnership and /tools/conversion-partnership surfaces" },
      { type: "added", text: "/offer/[slug] detail route — single-column prose pages for each wiki module with breadcrumb back to /offer + prev/next nav. Slide deck section embeds the inline DeckBuilder. Reuses the conversion-partnership content folder so the existing wiki at /sales-engine/conversion-partnership keeps working until we retire it in a follow-up" },
      { type: "added", text: "Dedicated Objections module (09-objections.md) — promoted from being buried inside the sales process doc and the /internal/cheatsheet/conversion-engine page. Ten common pushbacks with the response we lead with, plus a \"when to walk away\" closing block. Cheat sheet still has the same objections with copy-to-clipboard buttons for live calls; the new module is the canonical reference text" },
      { type: "fixed", text: "Reconciled the stale tier copy in 00-overview.md against the locked May 2026 offer shape. Removed \"Core £8–10K / Pro £12–15K\" tier framing; replaced with single £8K buy-in + £12K anchor positioning (no tiers, always quote both, larger scopes price upward from £8K naturally). Revenue projection table updated to flat £8K rows. The offer hub, cheat sheet, and overview now all tell the same story" },
      { type: "added", text: "Sidebar restructured around the agency lifecycle. Three pinned daily drivers at the top (Mission Control / Offer / Pods) — the two anchors of what we sell + how we deliver are one click away. Below: lifecycle dropdowns (Acquisition → Delivery → Operations), then ops (Finance / Company), then a default-collapsed Shelved drawer for parked tools. Acquisition holds Audits, Social, Portfolio, Case Studies, Proposals — the daily prospect-facing surfaces. Shelved holds the cheat sheets, Articles, Calendar, Lead Magnets, Leads (Outreach), Quiz Leads, Scout, Resources (Referrals), Pipeline, Funnel Playbook, Funnels, Deck Builder, Referral Programme — work parked until it has a clear daily use case (e.g. Leads needs SimilarWeb data before promoting back). Soft hairline dividers between every group. Old Operations/Execution/Finance/Source-of-Truth/Growth groupings retired. Portfolio link points at v1 (/sales-engine/portfolio) until v2 is fully working" },
      { type: "fixed", text: "Slack notify endpoints (/api/pods/blocker-notify, /slip-notify, /stale-notify) now require the launchpad-role cookie. Anyone with the URL could previously POST arbitrary text to a pod's Slack channel. Auth helper extracted to src/lib/auth/role.ts so other internal API routes can reuse the same check" },
      { type: "added", text: "Test result tracking on Build tasks (M2/M3 of a Conversion Engine cycle). New `test_result` field captures status (pending/winner/loser/inconclusive), lift % vs control, significance %, and free-text notes. A coloured chip on the swim lane row reads \"+18.4% won\" / \"-3% lost\" / \"pending\" — click to edit. Without this the entire CE retainer was running on vibes; now M3 strategy is informed by what M2 actually moved" },
      { type: "added", text: "CVR + AOV per client. Baseline + current entered manually by the PM at intake / each month, with a % delta computed live. Surfaces as two tiles on each Client Roster card (\"2.1% → 3.4% +61.9%\"). Click either tile to edit. Drives the renewal conversation — turns CE retainers from a design service into a measurable growth product" },
      { type: "added", text: "Pod health dashboard at the top of /pods-v2. Single row, three pod tiles, each with a green/amber/red overall tone derived from four signals: capacity utilisation (≥100% red, ≥80% amber), slips this quarter (>2 red, >0 amber), oldest open blocker (>96h red, >48h amber), out-of-office count (both primaries out = red, ≥2 members out = amber). Header shows agency-wide tone (\"Healthy\" / \"Watch\" / \"Action needed\"). Lets Dylan/Alister scan agency state in 2 seconds before reading individual cards" },
      { type: "added", text: "Today view at /pods-v2/me. Per-member filter — visitor picks their name from a dropdown (saved on this device); page shows their work in four buckets: Overdue (rose), Due today (amber), In progress (blue), Up next (gray). Click status circle to cycle. Replaces \"scroll three columns to find my next task\" with a one-screen focused view. \"Today\" button added to the /pods-v2 header" },
      { type: "added", text: "Standup view at /pods-v2/standup. One-screen agency-wide brief of what changed in the last 24h: tasks created, blockers raised, blockers resolved, projects shipping in next 48h, slipped projects still active. Read top-to-bottom in standup; nothing to click. \"Standup\" button added to the /pods-v2 header" },
      { type: "added", text: "Test-result share-card at /share/test-result. URL-driven (no DB lookup) so the page is fully shareable — params are client, page, lift, sig, status, period, hyp. Renders a 540×540 card optimised for screenshot/social: client name, what was tested, big coloured lift % (green for winner, rose for loser), significance, hypothesis, ecomlanders watermark. \"Save as PNG\" button uses an SVG → canvas pipeline (no external service). Test-result editor on Build tasks shows a \"Share-card →\" link in the footer once a non-pending result is recorded — one click to a renewal-ready asset" },
      { type: "fixed", text: "Team + CRO lead avatar URLs now persist across localStorage resets, browsers, and devices. Image files were always permanent in the company-avatars Supabase bucket but the URLs pointing to them lived only in localStorage — a clear / new browser orphaned every photo even though the image was still there. New src/lib/pods-v2/team-avatars.ts pins the URL → slot mapping (keyed by pod_name+role for pod members, or cro:{name} for CRO leads) to a business_settings row id=\"pods-v2-team-avatars\". updateMemberAvatar + updateCroLeadAvatar now fire-and-forget the cloud write; ensureSeed-adjacent hydrateTeamAvatarsFromCloud runs on /pods-v2 + pod-detail mount and overlays cloud URLs onto local pod data. Cloud is source of truth so the same avatars show up identically across machines without rebuilding the rest of the pods data layer to Supabase" },
      { type: "added", text: "Pods data now lives in Supabase. Five new tables (pods_v2_pods / clients / projects / tasks / cro_leads) using the standard { id, data jsonb, updated_at } pattern; SQL migration is supabase/migrations/011_create_pods_v2_tables.sql. localStorage stays as the sync cache so existing call sites don't change — every write fire-and-forgets a mirror to Supabase via src/lib/pods-v2/sync.ts. On /pods-v2 mount, bootstrapPodsSync pulls cloud-truth and overlays onto local. Cloud wins on conflict, so multi-device shows the same data. First-run migration on each user's first mount: if Supabase is empty for a collection but localStorage has data, the local data is pushed up automatically — nobody loses their work. The avatar-URL pinning shipped earlier today is now structurally redundant (URLs ride along on Pod.members[]) but kept exported for back-compat" },
      { type: "added", text: "AI daily standup cron at 9am UK Mon-Fri (/api/cron/pods-standup). For each pod with a configured Slack channel, reads the live state from Supabase, builds a structured snapshot of the last 24h + today's priorities, and asks Claude Sonnet 4.6 to narrate it as a 5-7 sentence punchy standup ending with \"Top focus today: ...\". Posts to the pod's Slack channel. Lives entirely server-side now — no admin browser needs to be open" },
      { type: "added", text: "AI pods weekly digest cron at 4pm UK Fridays (/api/cron/pods-weekly-digest). Agency-wide narrative: opens with the week's overall posture, summarises each pod (shipped / slipped / blocked / tested), flags winning conversion tests with their lift %, mentions client CVR/AOV deltas if meaningful, closes with \"Watch next week:\" for the 1-3 things needing eyes Monday. Posts to the ops Slack channel. Distinct from the legacy /friday-digest cron which operates on client_portals — this one is the pods-v2 view" },
    ],
  },
  {
    id: "cl-61",
    date: "9 May 2026",
    version: "0.39.0",
    title: "Pods — Conversion Engine cycle, forward capacity, rush flow, Slack pings, portal sync",
    changes: [
      { type: "added", text: "Ticking the \"Conversion Engine retainer\" box on the Assign-to-Pod modal now pre-seeds the entire 90-day cycle in one shot — 3 months × W1 strategy → W2 design → W3 build → W4 test/prep, autopaired across the pod's primary designer + dev. Project bucket flips to Bespoke and delivery_date moves to Thu of M3 W4 so the engagement window reads honestly. Per deliverable, that's: Dan gets Strategy + Wireframe (asset_prep, due Fri W1), the designer gets Design (core, due Thu W2, paired with dev), the dev gets Build (core, due Thu W3, paired with designer), and both get Test/Prep tickets (asset_prep, due Thu W4) — repeated for M2 and M3" },
      { type: "added", text: "Each cycle task carries a `cycle: { month, week }` field driving a green M1 · W1 · Strategy / M2 · W3 · Build chip on the pod swim lane right next to the points pill. Hover for the full month/week tooltip. Tasks created outside the cycle (manual ticket adds, non-CE projects) leave the chip off — keeps non-retainer work readable" },
      { type: "added", text: "CRO Pipeline panel now sub-groups Dan's tasks by month within each pod section (Month 1 / Month 2 / Month 3 / Ad-hoc) with an open count per group — the 90-day runway is visible at a glance instead of a flat chronological list. Helper copy updated to reflect the pre-seeded full cycle" },
      { type: "added", text: "Capacity meter is now properly forward-looking. Each pod card and the per-pod detail panel show two bars: the green primary bar = points whose design due-dates land in the next 4 weeks (this month), and a thinner secondary bar underneath labelled \"Next month\" = points landing in weeks 5-8. Tone (green/amber/rose) escalates per bar based on % utilisation. Capacity planning can now see the cliff before it hits, and CE retainers' M2/M3 load surfaces in the projection instead of being invisible" },
      { type: "improved", text: "Capacity model for retainers: M1 builds carry full points, M2 + M3 carry half-points (variant-test iterations cost ~50% of a fresh build). Combined with the now-windowed capacityUsed, this means a single CE retainer shows full M1 load this month, then ~half load next month — accurately reflecting what a pod actually has on its plate" },
      { type: "improved", text: "capacityUsed in src/lib/pods-v2/calc.ts now takes optional windowStart/windowEnd YMD arguments. Without them, behaviour is unchanged. With them, only tasks whose due_date falls in [start, end] are summed. Added fourWeekWindow(fromYMD) helper that returns the inclusive Mon-Sun span covering 4 weeks from a given date — used to compute current-month and next-month windows for the meter" },
      { type: "added", text: "Rush exception flow on Assign-to-Pod. Second checkbox under Conversion Engine: when ticked, kickoff = signoff_date directly (no Monday-snap, just bumps Sat/Sun forward to the next weekday) and bucket duration halves (A: 10→5d, B: 15→8d, C: 20→10d). Always snaps delivery to the nearest Thursday forward. Pod cards track rush count in a new \"Rush\" stat (replacing the redundant \"Total active\" stat) so heavy rush use is visible in the operating model. kickoffMondayFor + deliveryThursdayFor now both take an optional rush flag" },
      { type: "added", text: "Slack blocker notifications. New optional pod.slack_channel_id field — admins can paste a channel id (e.g. C0123ABC) inline on the pod's Blockers panel header; saved on blur. When a blocker is raised, addBlocker fire-and-forgets a POST to /api/pods/blocker-notify which formats a Slack message (icon + title + description + owner + raised_by + link back to /pods-v2) and posts via the existing slack-bot helper using SLACK_BOT_TOKEN. A small green Slack pill on the panel header shows when notifications are wired. Failure is silent — blocker is already saved locally" },
      { type: "added", text: "Pod ↔ portal phase sync. When a designer flips Design – {Page} core deliverable to done in the pod swim lane, the linked client portal's matching scope item gets design_approved=true automatically. Same for Build – {Page} → dev_live=true. Lookup chain: project.onboarding_id → onboarding.assigned_portal_id → portal.scope, matched by canonical PageType (with substring fallback for legacy string-only scope items). Fire-and-forget side-effect inside updateTaskStatus — only fires for core deliverables on the done transition, never on un-done. One source of truth, one click" },
      { type: "added", text: "Capacity-aware pod picker on Assign-to-Pod. The Pod dropdown now shows each pod's this-month + next-month load (e.g. \"Pod 2 — 4/40pts now · 12/40pts next · lightest\") and pre-selects the lightest-loaded pod. Stops Alister blindly picking Pod 1 every time" },
      { type: "added", text: "Wireframe is now a real phase, not just a task. Slotted into TaskPhase between Research and Design (and into TASK_PHASE_ORDER for the click-through phase ladder). Amber pill colour on the swim lane (between research's cyan and design's purple), amber dot in MemberCalendars. Lets Dan's wireframe work be visible in the phase column without having to live as a free-text task title" },
      { type: "added", text: "Revision count badge on Client Roster cards. >2 revision-type tickets across a client's projects = rose pill (\"4 revs\") on the card. Quality signal — flags clients/projects that are in revision hell so admins can dig in early, before the pod silently absorbs five more rounds" },
      { type: "added", text: "Designer → Dev handoff modal. When a designer flips a Design – {Page} core deliverable from in-progress to done, a 3-checkbox gate appears: Figma link present / assets exported / scope locked. Confirm button gated until all three tick. Cancel leaves the task in_progress. Stops the back-and-forth where dev pings the designer two days later asking for the file" },
      { type: "added", text: "Member out-of-office state. Each PodMember can carry an ooo_start / ooo_end window. When today is inside that window, the avatar dims, the member row shows an amber \"OOO until 14 May\" pill, and Conversion Engine seeding falls through to the secondary instead of stacking work on an empty seat. Inline editor under each member row (admin-only) — two date inputs + Save / Clear" },
      { type: "added", text: "Slipped-project Slack ping. When a project flips to slipped status, fires a fire-and-forget POST to /api/pods/slip-notify which formats a :warning: message (project name, client, original delivery date, slip reason if set) and posts to the pod's Slack channel. Only fires once per slip transition — going slipped → in_progress → slipped re-pings, but staying slipped doesn't" },
      { type: "added", text: "Stale-ticket Slack ping. New stale_pinged_at field on Task. On /pods-v2 admin mount, a client-side scanner walks all open tickets and fires a single Slack ping for any that have crossed 48h of effective time (paused windows excluded). stale_pinged_at marks the task as already-pinged so the same ticket doesn't re-ping every page load. Why client-side: pods data lives in localStorage; a server cron can't see it. 48h threshold means we don't need second-by-second precision for this to work" },
      { type: "added", text: "Friday weekly digest panel on /pods-v2. Admin-only, auto-shows on Fridays (Mon-Thu it's collapsed behind a small \"Show Friday digest\" link so it doesn't add noise mid-week). Per-pod summary tiles: shipped this week, in-flight count, stale tickets, active blockers, slipped projects. \"Post to Slack\" button on each tile fires the formatted message to that pod's channel — admin reviews on screen first, posts when satisfied. No silent cron — explicit, on-demand, with a preview" },
      { type: "added", text: "Pod-level filters on the swim lane: client dropdown (single-client zoom) and Hide done checkbox. Useful when columns get full and you want to focus on what matters. Filters affect only the swim lane rendering — capacity / revisions / cycle counts continue to use the unfiltered task graph" },
      { type: "added", text: "Hotkeys on the pod board. j / k = move focus between task rows (highlighted with a light-blue focus ring), space = cycle focused task status (todo → in_progress → done → todo), d = toggle Hide done, / = focus the client filter, ? = toggle a help tray, esc = clear filters or close the help tray. All ignored when the user's typing in an input — no accidental selects mid-form" },
    ],
  },
  {
    id: "cl-60",
    date: "8 May 2026",
    version: "0.38.0",
    title: "Pods v2 — promoted to main Pods view",
    changes: [
      { type: "improved", text: "Pods v2 is now the main Pods view in the sidebar (was a sibling under Execution). The original /pods route stays in the codebase for the moment but is no longer linked — we'll prune it once the team has been on v2 for a couple of weeks. Sidebar entry renamed back to plain \"Pods\"" },
      { type: "improved", text: "Pod-detail card density cut substantially. Tasks went from heavy bordered cards down to slim list rows: status circle on the left, title + client · project · phase/type pill in the middle, due-date or open-age signal on the right. The bucket-coloured left edge, discipline badge, bucket chip, warm chip and reassign chip all dropped — that's six chips' worth of visual noise gone per row. Hover reveals the delete X" },
      { type: "improved", text: "All four pod members now get their own column on the Work in flight swim lane. Was just primary designer + primary dev; secondaries (Victoria, Kaye, etc.) lived in a separate Tickets table below. Merged into one per-member view so each person's full plate sits in the same place. Per-member calendars dropped — they were eating ~600px of vertical space and not paying off" },
      { type: "improved", text: "Done tasks fade to 50% opacity, line-through the title, and sort to the bottom of their column automatically. They still count toward capacity (committed work). Deleting a task removes it from capacity entirely — capacity is now task-based (sum of design-half points) instead of project-page-based, so the meter responds to deletes in real time" },
      { type: "added", text: "Editable phase pill on primary cards — click the phase tag and a popover lists the full 11-step phase ladder (Onboarding → Research → Design → Internal Design QA → External Design Review → Design Revision → Development → Development QA → External Dev Review → Dev Revision → Launch) with coloured dots so you can see what the new pill will look like before picking. Mutation persists locally" },
      { type: "added", text: "Same-type points discount: when a project has multiple of the same page type (e.g. 3 PDPs for 3 product variants), the second-and-later get half points. The design system + dev infrastructure get reused so they're cheaper. Applied automatically in createProject (driven by effectivePagePoints in calc) and inside addPairedDeliverable for one-off adds. Capacity meter and per-task points pill both reflect the discount — first PDP shows 3pts, the next ones show 1.5pts" },
      { type: "added", text: "Add-deliverable form on primary columns now creates BOTH halves of a deliverable in one click: a Design – {LABEL} task for the designer + a paired Build – {LABEL} for the dev, sharing one points value (not doubled). Form has a Type dropdown (PDP/Homepage/Cart/etc with point hints), a Variant label input (so 3 PDPs read \"Sling Carrier\" / \"Wrap Carrier\" / \"Hip Seat\" instead of identical), and a Project picker. Empty-projects state shows a clear amber callout pointing at + New project / Onboarding-in-purgatory instead of silently failing" },
      { type: "added", text: "Secondary members get the ticket form by default (Revision / Bug / Desktop fix / Asset prep / Library) — they don't do core deliverables. Display logic also flips: any task assigned to a secondary renders ticket-style regardless of the task.type so columns read consistently even if legacy data put a core_deliverable on a secondary" },
      { type: "added", text: "Ticket open-age signal on the right of each ticket row — task-board-style coloured pill (\"Added: 3d 12h\") with thresholds at 24h (amber) and 48h (red). Click the timer to pause: \"Waiting on client\" / \"Waiting on internal\" radio options. While paused, the pill becomes a grey \"⏸ Waiting on client\" badge — the clock stops and paused duration is banked into paused_total_ms so it doesn't unfairly escalate when resumed. Click again to resume from where it left off" },
      { type: "added", text: "Onboarding in purgatory section on /pods-v2 — onboarding forms that have been processed (PM picked them up + assigned a portal) but no tasks are spun up yet. Shows client name, status, portal link, processed-on date, age signal (green <3d, amber 3-7d, red ≥7d). Each row has an Assign-to-pod button" },
      { type: "added", text: "Assign-to-pod modal pre-populates deliverables from a three-tier fallback chain: 1. linked client portal's scope (the source of truth Alister works in), 2. onboarding form's deliverables array (PM-captured), 3. legacy comma-separated page_type field (parsed via substring match — \"PDP\" → pdp, \"Hero Lander\" → advertorial, etc.). PM confirms or edits the line items (each row is type + custom variant label) before pressing Confirm & assign. Auto-creates a Project + paired design+dev tasks per deliverable, with design due Friday week 1 and dev due delivery Thursday" },
      { type: "added", text: "Pod-wide blockers panel on the pod page. Raise a blocker (title + optional description + optional owner from pod members), see active ones with auto colour escalation (24h amber, 48h red), Resolve to mark complete (moves to a collapsible Recently resolved list), Re-open if the fix didn't stick (moves it back to active), Delete to drop entirely. Blocker count surfaces on each pod card on the all-pods view as a red \"Blockers: N\" stat when > 0" },
      { type: "added", text: "Unassign-from-pod flow on each client card in the Client Roster. Modal offers two paths: Move to another pod (reassigns the client + their open tasks to the destination pod's primary designer/dev — done tasks stay attached to the original assignee for audit), or Park (no pod) which clears pod_id and flips open projects to queued, returning the client to the purgatory list ready for re-assignment when capacity opens up" },
      { type: "added", text: "Onboarding inbox: PM Checklist now has a \"Deliverables scope\" section right under PM Notes. PMs add line items (Type dropdown + Variant label) during their checklist phase so the Assign-to-pod modal pre-populates correctly. Functional setSelected pattern + optimistic updateSubmission (no await load() race) so labels persist correctly through Supabase write-back" },
      { type: "added", text: "Member avatars are uploadable. Hover any member's photo on the pod page (header strip or swim-lane column header) → \"Change\" overlay → click → file picker → uploaded image replaces the generated PodAvatar SVG. Stored on PodMember.avatar_url, persisted via updateMemberAvatar. Reuses the existing /api/company/upload endpoint + company-avatars Supabase bucket" },
      { type: "improved", text: "Card pills change colour by urgency. Due pill (primary tasks): green ≤7d, amber ≤3d, red overdue. Added pill (tickets): green <24h, amber 24-48h, red ≥48h. The thresholds reflect the relative speed of each lane — primaries are week-scale, tickets are hour-scale" },
      { type: "fixed", text: "Pod blockers Resolve button wasn't reflecting in the UI — refresh() was re-reading projects/clients/tasks but not the pod itself (where blockers live). Added setPod(getPodById(podId)) to the refresh callback. Same fix benefits any future pod-level mutations" },
      { type: "fixed", text: "Parked clients now correctly return to the Onboarding-in-purgatory list. Park flips client.pod_id to empty and queues projects but leaves tasks attached (just unassigned), so the old purgatory filter — \"client has zero tasks\" — kept them invisible. Filter now also includes any onboarding whose matched client has an empty pod_id, regardless of task count" },
      { type: "improved", text: "Onboarding/Pods seed wipe on first load. New `clean-v1` sentinel triggers a one-time per-browser wipe of legacy fake clients/projects/tasks data, leaving only the real team structure (pods + members) seeded. \"Wipe all data\" button on /pods-v2 retained for ad-hoc resets — now keeps pods + members and only clears clients/projects/tasks" },
    ],
  },
  {
    id: "cl-59",
    date: "7 May 2026",
    version: "0.37.0",
    title: "Company module — people, structure, invoices, hiring",
    changes: [
      { type: "added", text: "New Company top-level module at /company replacing scattered Notion/docs/folder structures with a single source of truth for Ecom Landers itself (separate from client work). Five sub-pages tied together by a shared sticky sub-nav: Overview dashboard, People directory, Org Structure chart, Invoices, Hiring kanban. Whole module is admin-gated at the layout level so the team's financial + performance data stays out of non-admin reach. Sidebar gets a new \"Company\" section under Finance, also admin-only" },
      { type: "added", text: "People directory at /company/people. Grid + table view toggle, search by name/title/email, filter by department, employment type (employee/contractor) and status (active/on leave/notice/left). Avatar cards show initials with department colour or uploaded photo. Add-person modal captures name + title + dept + type + email; full profile lives at /company/people/[id]" },
      { type: "added", text: "Person profile page with three tabs — Overview (personal, role, contact, emergency contact, notes), Financial (compensation type/amount/currency/frequency/method, tax status, company name/UTR, bank details, full compensation history table with Log change action), Performance (reviews, goals, 1:1 notes — each as add/edit/delete cards with markdown content). Financial + Performance tabs are admin-only. Auto-save on every field change. Avatar upload via /api/company/upload to the company-avatars Supabase bucket" },
      { type: "added", text: "Org Structure chart at /company/structure. React Flow canvas with auto-hierarchical layout (top-down, parents centred over children) on first render, drag-to-rearrange with positions persisted per person on chart_position_x/y, smoothstep edges from reports_to relationships, MiniMap, fit-to-screen Controls, Reset layout button, department legend. Click any node → side preview panel with avatar + dept + email + location + Open profile link. Empty-state CTA when no people exist yet" },
      { type: "added", text: "Invoices at /company/invoices — storage + status tracking only (we are not generating invoices). Three summary cards at top: Outstanding (pending + overdue), Overdue (red), Paid this month (green). Sortable table with supplier / invoice # / dates / amount / status / file column. Filter by status, search by supplier or invoice number. Status badges colour-coded (paid green, pending amber, overdue red, disputed grey). Auto-derives overdue status when due_date < today on read. Detail page at /company/invoices/[id] with PDF preview pane, status history log, mark paid/pending/disputed quick actions, and editable metadata. Supplier autocomplete pulled from contractors in the people directory" },
      { type: "added", text: "Invoice upload modal — drag a PDF (or image, ≤15MB), captures supplier (with autocomplete), invoice number, issue/due dates, amount + currency, category, optional linked person from the directory, notes. File goes to the company-invoices Supabase bucket via /api/company/upload" },
      { type: "added", text: "Hiring pipeline at /company/hiring — drag-and-drop kanban with five live columns (Applied → Screening → Interview → Offer → Hired) and a collapsible Rejected archive at the bottom. Top strip shows open roles with candidate counts; click a role to filter the board to just its candidates. Add candidate from any column (pre-fills status), add open roles via separate modal. Cards show name, role, source, date added — drag between columns to update status with optimistic UI + Supabase write" },
      { type: "added", text: "Candidate side panel — full editable detail (name/email/phone, role, status, source, CV upload to company-cvs bucket, markdown notes). Convert-to-person button on hired candidates creates a Person row in /company/people pre-filled with the candidate's data and the role's title/department/employment type" },
      { type: "added", text: "Company Overview dashboard at /company aggregates live counts from every sub-module: headcount (total + employees/contractors split), open roles + active candidates, outstanding invoices total with overdue flag (red when >0), org structure size. Recent activity feed surfaces the last 10 events across modules (new people, invoices created/paid, candidate status changes) sorted newest-first. Jump-to panel for quick navigation" },
      { type: "added", text: "Schema: migration 010_create_company_module.sql adds company_people, company_invoices, company_open_roles, company_candidates tables — all using the standard { id, data jsonb, created_at } blob pattern with anon RLS policies, matching the rest of the app's Supabase + localStorage fallback layer via createStore(). Three Supabase storage buckets needed: company-invoices, company-cvs, company-avatars (create from dashboard, public read)" },
      { type: "added", text: "Generic /api/company/upload endpoint accepts file + bucket, validates per-bucket type allowlists (PDFs and images for invoices, PDFs only for CVs, images only for avatars) and size caps, returns the public URL. Single endpoint, three buckets, same call site shape across the module" },
      { type: "added", text: "Page-level password gate on /company (additional layer on top of the existing admin role check) — single password unlocks the whole module for the session, mirrors the cheatsheet WIPGate pattern. Extra protection over what's effectively the company's HR + payroll surface" },
    ],
  },
  {
    id: "cl-58",
    date: "6 May 2026",
    version: "0.36.4",
    title: "Pricing revamp, tickets screenshots, case study layouts",
    changes: [
      { type: "improved", text: "Pricing page restructured around three stacked offers: 01 · Conversion Engine retainer (£8K Standard / £12K Anchor — always quoted side by side per the cheat sheet's anchor framing), 02 · Funnel Build one-off (Framing + PDP + Cart, £7,999) framed as the AOV push between retainer and individual pages, 03 · à la carte quote builder for existing per-page builds. Sales-framing caveats baked under the retainer cards (range expectation, 90-day reset). Free-audit CTA strip added before the sticky cart so non-buyers have a clear path to /audit, and the \"Most popular\" badge moved off 2 Page Build now that Funnel Build is the recommended one" },
      { type: "added", text: "Tickets — drop / paste / pick screenshots. Three input paths (use whichever's fastest): drop a file onto the composer or an open card, Cmd+V paste from clipboard (screenshot → paste → done in ~2s), or click the paperclip for the file picker (multi-select). Inline thumbnails render on every card and inside the composer; click → full-size lightbox with ESC to close; hover in edit mode → small × to remove. Triage mode surfaces attached screenshots on the focused card so reviewers see them before deciding. New public `tickets` Supabase bucket with a 10MB cap per file, PNG/JPG/WebP/GIF only, server-side validated" },
      { type: "fixed", text: "Ticket screenshot uploads were silently blocked by Supabase RLS on the day they shipped — the original storage migration only created a SELECT policy on the bucket, so the anon-keyed upload from the API route had nowhere to land. Added INSERT/UPDATE/DELETE policies; file-type and size validation still gate the upload server-side" },
      { type: "added", text: "Five screenshot row layout options on case studies — 1 hero, 2 side-by-side, 3 equal, 1 wide + 2 stack, 2 stack + 1 wide. Visual picker with mini SVG diagrams sits above the slot uploads in the editor, and both editor and public render share a single grid component so the live preview matches the published page exactly. Slot count auto-trims when switching to a smaller layout" },
      { type: "fixed", text: "Selected screenshot layout reverted to the 3-equal default after reload because the case-study data normaliser rebuilt the results object with only tests + screenshots, silently dropping screenshotLayout on every load. Now persisted through the read path so a chosen layout sticks across reloads and renders correctly on the public page" },
      { type: "fixed", text: "Case study Design syncs hitting Figma's \"Render timeout, try requesting fewer or smaller images\" error on heavy frames. Sync now tries @2x first and falls back to @1x on render timeout (with a brief gap between attempts to give Figma's render farm room); other errors (bad token, missing node) still fail fast" },
      { type: "fixed", text: "Four-file ClientTier cleanup sweep — the type was removed from @/data/services when tiers were retired, but four sites still imported it and broke Vercel builds one by one across the day: tools/price-lists page, proposal-builder page, /api/proposals/checkout route, and the dead /pricing/[tier] route (now removed entirely). Local working trees already had the cleanups; this committed and pushed them" },
      { type: "fixed", text: "Dashboard \"Cheat sheet\" tile under Sell was pointing at /internal/cheatsheet (the Ecomlanders operating cheat sheet) despite its \"Conversion engine\" subtitle. Repointed at /internal/cheatsheet/conversion-engine so the link matches the label" },
      { type: "fixed", text: "Case study screenshot rows in the 1 hero / 2 side-by-side / 3 equal layouts were force-cropping every image into a fixed aspect-[4/3] box (16/9 for single), so wide screenshots like Intelligems result charts had their right edge cut off. Each slot now adapts to the image's natural width/height (already captured at upload), with a 4/3 fallback when dimensions are missing. Wide-stack and stack-wide keep their fixed aspect ratios — those layouts depend on consistent slot shapes for the row/col spans to compose" },
      { type: "improved", text: "Case study CTA card spans full width when there's no testimonial, instead of sitting in a half-width column with empty space next to it. Switches from a vertical stacked card to a horizontal bar — \"Ready to start?\" + headline on the left, Book-a-call + WhatsApp buttons sitting on the right at min-w-[280px]. Two-up testimonial+CTA layout unchanged when a testimonial is present" },
      { type: "added", text: "Case study extra blocks — slot additional screenshot collages or prose paragraphs between the fixed spine sections (Hero → Stats → Screenshots → Problem → Solution → Design → Results → Testimonial+CTA). Seven anchor points (after hero / screenshot row / stats / problem / solution / design / results), two block types to start (screenshot-collage with the same layout picker as the main row, and prose with optional headline + body). Editor groups blocks by anchor with HTML5 drag-and-drop reordering within an anchor and a \"Move to\" select for cross-anchor moves. Public renderer walks blocks.filter(anchor=X).sort(order) after each spine section. Hybrid \"fixed spine + flexible blocks\" model — the case-study narrative order stays intact but you can pad it out with extra proof or commentary" },
      { type: "added", text: "Public case studies showcase index at /case-studies — single shareable URL listing every published case study instead of N per-study links. Editorial light layout matches the per-study pages: ecomlanders header, \"Conversion engine in action\" hero, 2-column card grid (thumbnail from results.screenshots[0] / hero.image / hero.collageImages[0] with a brand-coloured fallback for studies that have no media yet). Each card surfaces brand · industry · project type, the hero headline, the top headline stat in a green pill, and a View case study CTA. Closing \"Ready to start?\" bar with Free audit + Book a call. Sorted newest-first by updated_at" },
      { type: "added", text: "Self-serve copy editor for the showcase page at /sales-engine/case-studies/showcase-settings. Edits the eyebrow / headline / subhead, header pill button, and the closing dark-CTA bar (headline / subhead / primary + secondary button labels and links). Backed by a single-row showcase_settings Supabase table (migration 009). Auto-saves on debounce (1s) like the case-study editor, with a Saved badge and View-live link. Defaults baked into the data layer so the public page never goes blank if the row hasn't been created yet — the page reads { ...DEFAULT_SHOWCASE_SETTINGS, ...row.data } so unknown / missing fields fall back. Reset-to-defaults button clears every field back to the seeded copy. Linked from the admin case-studies list as a \"Showcase page\" pill next to New case study" },
    ],
  },
  {
    id: "cl-57",
    date: "5 May 2026",
    version: "0.36.3",
    title: "Case Studies — editorial sales pages",
    changes: [
      { type: "added", text: "New Case Studies module under Sales Engine → Content. Editorial light-mode page template designed as a sales tool, not a portfolio entry — hero with bold headline + screenshot collage, four KPI stat cards with cascading expo-out counter animations, brand/niche/engagement/services meta row, three-image preview grid, two-column problem statement, three numbered solution cards (01/02/03), Figma frame embeds for designs, four-card before/after comparison row with strikethrough befores and green delta arrows, testimonial card paired with a black CTA card (primary button + green WhatsApp button), tech-stack pill row" },
      { type: "added", text: "Single-page editor at /case-studies/[slug]/edit with collapsible sections for every block (Client, Hero, Headline stats, Problem, Solution, Design, Compounded results, Testimonial, CTA, Tech, Related, Intelligems test data, Settings). Drag-and-drop image upload with sharp auto-compression to webp@85 max 2400px, debounced auto-save, live public-render preview iframe in the right rail, slug edit + uniqueness check, brand-colour picker, publish toggle, copy-share-URL, duplicate-as-new" },
      { type: "added", text: "List view at /sales-engine/case-studies with a brand/headline/test-count/status table, edit/view/duplicate/delete actions per row, and a New-case-study modal with auto-derived slug. Sidebar entry added under Content lane" },
      { type: "added", text: "Structured Intelligems test storage — every test captures variant labels, primary metric, lift %, confidence interval, sample size, traffic split, duration. Stored as DB rows so we can later filter case studies by confidence ≥ 95% or aggregate \"$X driven across all tests\" without re-parsing prose" },
      { type: "added", text: "Editorial details: section eyebrows in section-specific colours (grey default, brand-red for The Problem, green for The Solution + 01/02/03 numbers), green ▲ chip on every headline stat card to signify a win, draggable-free Figma embeds with light browser chrome, dynamic OG image at 1200×630 with brand-coloured eyebrow + headline, JSON-LD Article schema, draft preview via ?draft=1, design-review bypass via ?example=1 (renders the seeded SuppsX example without touching the DB)" },
      { type: "added", text: "Bootstrap helper at /api/case-studies/seed creates a fully-populated SuppsX example so the layout can be pressure-tested end-to-end after the DB table + storage bucket are provisioned" },
      { type: "fixed", text: "Hotfix the upload route Buffer typing — Next 16 strict prod build flagged Buffer<ArrayBuffer> can't receive sharp.toBuffer's wider Buffer<ArrayBufferLike>. Widened the local binding so reassignment after webp compression type-checks. Vercel deploy unblocked" },
      { type: "added", text: "Live page render in The Design section — upload full-page desktop and mobile screenshot slices, visitors get a browser-chrome thumbnail with a \"View full page →\" affordance. Click opens a full-screen scrollable modal with desktop/mobile toggle (only shown when both are populated), ESC + click-outside to close, body-scroll lock while open. Mirrors the portfolio-v2 viewer pattern but as a modal instead of inline scroll" },
      { type: "added", text: "Figma sync for case study design renders — paste a desktop frame URL (+ optional mobile), hit Sync from Figma, slices auto-generate via the same pipeline as portfolio-v2 (sharp slicing into AVIF chunks at 1500px max height, q60). Re-syncing replaces previous slices and cleans up orphaned storage objects. Removes the manual screenshot step — case studies now have feature parity with portfolio-v2's Figma-driven workflow" },
      { type: "improved", text: "Stripped the redundant manual slice-upload stacks out of the Design editor section. Only the Figma URL form is left, matching portfolio-v2's exact UX — paste URL, sync, done. The slice arrays still exist in the data model and are populated by the sync API; the editor just doesn't expose them for low-level editing anymore" },
      { type: "improved", text: "Figma frame embeds in The Design section auto-load instead of requiring a \"Tap to load Figma frame\" click — browser-native lazy loading still defers offscreen iframes. When a case study has multiple frames (e.g. desktop + mobile), they now render side by side in a 2-col grid instead of stacked full-width, so a tall mobile frame no longer wastes the horizontal space next to it" },
      { type: "improved", text: "Hero image is now a single Figma-designed PNG instead of a programmatic 1–4 image tilted collage. Rendered as a clean rounded frame at natural aspect ratio. Editor collapsed from a 4-slot grid down to a single image upload — design the composition in Figma, export PNG, drop it in" },
      { type: "fixed", text: "Surfaced the missing editor for the 3-screenshot row that sits under the meta strip (Brand · Niche · Engagement · Services). The slots were already rendering on the public page from study.results.screenshots, but the editor never exposed an upload UI for them so they were stuck as empty placeholders. Added a new \"Screenshot row\" section in the editor between Hero and Headline stats with 3 image upload slots" },
      { type: "improved", text: "The Design section is now a single side-by-side module — desktop and mobile click-in popup cards, equal height (both aspect-[16/10]), opening into a mode-locked modal scrollable view of the actual sliced page render (matches the portfolio-v2 pattern). Removed the live Figma iframe embed pattern entirely (the \"Figma frames (interactive embeds)\" editor block, the public iframe render, plus the now-dead figma-embed and figma-frame-card components). The single source of truth for design renders is now the Figma sync form, which slices the actual frames into AVIF chunks for clean fast loading" },
      { type: "improved", text: "Aligned the case study design modal exactly with portfolio-v2's ProjectModal: portalled via ModalPortal (escapes parent stacking contexts), bg-black/80 backdrop, slim header bar (brand · device + close), overscroll-contain on the scroll body, slices flow directly on the dark backdrop with object-cover (no white wrapper), same max-width per device (mobile 420px / desktop 5xl). Click-in feels identical to clicking a portfolio thumbnail" },
      { type: "fixed", text: "Case study editor's public-URL display + copy-link button were pointing at ecomlanders.com/work/{slug} — wrong domain (.com is a parked GoDaddy page) AND wrong path (/work isn't a route). Corrected to ecomlanders.app/case-studies/{slug} so the displayed URL and the clipboard copy now point at the actual live page" },
      { type: "added", text: "Ecomlanders cheat sheet at /internal/cheatsheet — operating doc gated by a page-level password (WIP for now), accessible without dashboard auth so it's shareable. Bento-grid infographic layout: dark-hero anchor principle (\"Align everyone ruthlessly. Keep everything moving.\"), full-width 5-day calendar with per-day mode badge + headline + deliverable pills + reasoning, full-width 6-rule glossary for Dates and slippage with the WHY annotated on every line so Ajay can defend each rule on the spot, hero £8K Conversion Engine pricing card with £12K anchor framing, hero 11am Rituals card, hero pull-quote Sales framing card, contrasting What we do (light) / What we don't do (dark) cards, ownership and escalation tables. Brand-adjacent green accent. Sidebar: admin-only \"Source of Truth\" section above Project Delivery with green-tinted flag icon, links to the cheat sheet + Conversion Engine sheet" },
      { type: "added", text: "Tickets layer on the task board — lightweight triage inbox sitting in a persistent left rail next to the existing tasks. Ticket data model: title, type (client request / internal blocker / bug / question), client, raised_by, assigned_to, status (open/in_progress/done/killed), kill_reason. Three views inside the panel: Open (sorted oldest-first, age-based visual escalation — neutral → yellow border at 24h → orange at 48h → red + soft pulse at 5d, criticals always float to top), Done today, Killed. Quick-add inline composer (no modal — Cmd+Enter submit) with type, client, assignee. Per-ticket actions: Start (assigns to current user), Done (timestamps closed_at), Kill (with reason), Promote to task (creates a new design-lane task pre-filled with the ticket's title, links it back via linked_task_id, marks the ticket done). Always-visible header counts: \"Tickets · X open · Y stale\" — stale count goes red >0. New `tickets` Supabase table (single-doc jsonb at id=main-tickets), auto-saves on every mutation — no manual save button, capture stays under 5 seconds. Migration 006_create_tickets_table.sql included" },
      { type: "added", text: "Morning Triage mode for tickets — full-screen focused view on the task board with one ticket at a time, three large buttons (Do today / Shift / Kill), keyboard 1/2/3 or arrow keys to triage at speed. Shifting bumps a shifted_count on the ticket; tickets shifted 3+ times get a ⚠ badge so chronic deferrers either get killed or promoted to tasks instead of dying silently. Summary screen at the end (\"X to do today, Y shifted, Z killed\")" },
      { type: "improved", text: "Tickets are now visible to the team — same panel mounted on the public /tasks team view (left rail, identical layout to the leadership view). Team can raise tickets directly so things stop dying in Slack. Promote-to-task is hidden on the team view — only leadership can decide whether a ticket becomes a task. /api/tickets POST is now unauthed (mirrors /api/task-board PATCH) since /tasks is public; raised_by + raised_at on every ticket carry the audit trail" },
      { type: "improved", text: "Sidebar accordion behaviour — opening a section auto-collapses the others. At most one section open at a time; click the open one to fully collapse for focus. Initial mount opens the first defaultOpen section instead of every flagged section all at once. Less visual noise, clearer where you are" },
      { type: "improved", text: "Spring clean of the Launchpad navigation. Sidebar restructure: Operations (renamed from Training, now top of nav, contains Operations Wiki + Funnel Playbook + Funnels), Source of Truth (admin), Execution (renamed from Project Delivery — Onboarding/Portals/Pods/Task Board), Finance (admin), and a new Improve section housing Feedback. Removed: Conversion Engine link (already lives inside Operations Wiki), Design Library (moved to /team page where the team actually lives), CRO Lab section (CRO Audit + CRO Monitor shelved — code preserved, no longer surfaced; Funnels + Funnel Playbook moved to Operations)" },
      { type: "improved", text: "Mission Control redesign — replaced the Weekly Rhythm + Blocker Feed with a clean Jump-to grid of major Launchpad areas (Operations, Source of Truth, Execution, Finance, Improve, Tasks) and a today's-tickets list pulled live from the ticket inbox. Cards mirror the Team Tools pattern. Stale ticket count goes red when >0 just like the panel header. \"Open triage\" link on the right takes you straight to the task board panel" },
      { type: "improved", text: "Design Library promoted to /team Tools — the team actually lives on /team/* paths, so the Figma master file lives there now alongside Swipe File / Font Library / Dev QA Checklist. External-link affordance (↗) on the card so it's clear it opens Figma in a new tab" },
      { type: "improved", text: "Funnel Builder rebuilt as a linear Roadmap. Killed the drag-drop node canvas, health scores, and performance tabs. New flow: pick traffic sources from the library, pick pages in sequence, optionally add a lead-gen track (magnet + email sequence). Roadmap auto-renders as a horizontal SVG flow with traffic fanning into the first page, sequential page-to-page connectors, and the lead-gen track as a parallel row below. Each step has status (Planned / In Build / Live / Optimising), 1-2 line note, and an optional KPI target. Editor: live preview, click any node to edit, up/down to reorder, auto-save on every mutation. Top bar has Copy Share Link, Preview Client, and Export PNG. Public client view at /funnel/{shareToken} (UUID, unguessable, no auth) — Ecom Landers branded header, centred SVG, progress summary chip row, then a stacked step-by-step list with notes + KPIs. Mobile-friendly, SVG renders cleanly to PNG. Migration 007_create_roadmaps_table.sql included" },
      { type: "added", text: "Toolkit section on Mission Control — centralised quick-access hub for client-facing assets and internal tools, organised by client lifecycle stage. Three stages with coloured pill badges: 01 · PITCH (blue) covering Portfolio / Case studies / Price list / Sales deck / Cheat sheet, 02 · ONBOARD (green) covering Onboarding form / Invoice generator, 03 · DELIVER (purple) covering Feedback form. Each tile is a clickable card with icon + 14px title + 12px muted subtitle, white bg, 0.5px border, 14px padding, uniform height. Auto-fit grid (min 180px per tile) reflows naturally on resize. Live search input filters tiles in real time by title or subtitle. Empty stages still render their header so the structure stays predictable as we add more tools" },
      { type: "added", text: "Tickets now accept screenshots — drop directly onto a ticket card or the quick-add composer, paste with Cmd+V (the killer flow: screenshot → paste → done in 2 seconds), or click the paperclip to file-pick. Inline thumbnails on every card, click to expand to a lightbox, hover to remove. Triage mode shows attached screenshots on the focused card so reviewers can decide with full context. Storage: new public `tickets` Supabase bucket (10MB max per file, PNG/JPG/WebP/GIF). Migration 008_create_tickets_storage_bucket.sql provisions the bucket + read policy" },
    ],
  },
  {
    id: "cl-56",
    date: "5 May 2026",
    version: "0.36.2",
    title: "Sales deck — calculator model + S2/S9 visual refresh",
    changes: [
      { type: "improved", text: "Slide 3 calculator switched from \"CVR lift target\" to \"Target CVR\". Prospects don't think in deltas — they think in absolutes (\"we're at 1.8%, we should be at 2.8%\"). Slider range widened to 0.5–6% so the model holds for higher-AOV brands where the realistic target sits well above the +2pp ceiling. Output recomputes from gap = max(0, target − current), so dragging target below current correctly shows £0 recovered instead of going negative" },
      { type: "improved", text: "Slider track now renders a fill bar driven by --progress CSS variable, so the dragged position is visible without staring at the thumb. Applied to all four sliders on S3 (traffic, CVR, AOV, target)" },
      { type: "improved", text: "Slide 2 (\"the leak\") rebuilt from a flow diagram into a stack diagram. Three labelled layers — Acquisition / Conversion / Retention — with the middle layer marked as ours. Headline reframed: \"Take the traffic you're paying for. Make it work harder.\" Less abstract than \"the leak nobody owns\", lands faster on a screen-share without the presenter narrating" },
      { type: "improved", text: "Slide 9 (\"the investment\") tightened. Trailing copy line removed (the bars + return multiple already say it). Vertical bullet-list of terms replaced with a horizontal pill row — £8K/mo flat · 90-day minimum · 30-day notice from M4 · No setup, no upcharges. Reads in one glance instead of one bullet at a time. Recover bar + return multiple now use the accent treatment so the eye lands on the gain side first" },
      { type: "improved", text: "Both S3 and S9 gained a kicker line above the headline (\"Drag to model your numbers\" / \"Investment vs return\"). Gives the slide an orientation cue before the prospect parses the chart" },
      { type: "improved", text: "Deck-builder placeholder copy in all three entry points (tools/, sales-engine/, inline component) switched from \"Surreal / eatsurreal.com\" to \"Ecomlanders / ecomlanders.app\". Stops AJ pitching with Surreal's name auto-filled when he forgets to clear the field" },
    ],
  },
  {
    id: "cl-55",
    date: "4 May 2026",
    version: "0.36.1",
    title: "Felix — DMs walled off + slack_list_channels tool",
    changes: [
      { type: "added", text: "Three-layer DM lockdown. SLACK_TOKEN is a user token so it can technically see Dylan's DMs — Felix can't anymore. Layer 1: system prompt rule \"DMs are off-limits\" with a fixed refusal phrase. Layer 2: resolveChannel rejects any D-prefix ID and any ID not in the public/private allowlist (built from conversations.list with types: public_channel,private_channel only). Layer 3: searchMessages post-filters every hit through the same allowlist, so even if Felix searches \"from:@ajay\" the DM hits are dropped before he sees them. Verified: probe \"search DMs between me and Ajay\" returns \"DMs are private — I won't read those.\" with zero tool calls" },
      { type: "added", text: "New tool slack_list_channels — Felix can now actually verify his channel coverage instead of guessing. Returns channel name, ID, is_member flag, num_members. Default mode shows only channels he can read; pass members_only: false to see visible-but-unreadable ones (the channels to invite the SLACK_TOKEN user to for full coverage). Felix's first call: 303 visible, 301 a member of, 2 invitable" },
      { type: "improved", text: "channel-list cache now stores three views — full SlackChannel objects, a name-to-ID map, and an allowedIds Set used as the security allowlist. Same 1h TTL. The Set is the source of truth for \"can Felix read this channel?\" — no need to re-check Slack for each tool call" },
    ],
  },
  {
    id: "cl-54",
    date: "4 May 2026",
    version: "0.36.0",
    title: "Felix — full sweep: 16 audit fixes",
    changes: [
      { type: "fixed", text: "Optimistic chat status flip no longer clobbers BLOCKED. Previously, sending a chat to a BLOCKED agent would silently flip them BLOCKED → WORKING → IDLE, losing the BLOCKED state. Now we capture the pre-run status and restore it on completion. Server-side does the same in /api/agents/[id]/run" },
      { type: "fixed", text: "Config-tab edits to Felix's system prompt actually take effect now. runFelix accepts the stored agent record and reads systemPrompt from there instead of from NAMED_AGENTS in code. Falls back to the seed if the stored prompt is empty/broken (gives \"Reset to default\" something to recover to)" },
      { type: "fixed", text: "searchMessages user-name fallback chain reordered. Previously the `?? m.username` branch was unreachable because nameForUser always returns a value. Now we use search.messages's own `username` field first (most reliable for search hits), then resolve via users.list, then fall back to the raw ID" },
      { type: "added", text: "Reaper for stuck WORKING agents. New `workingSince` timestamp on the Agent record; data layer resets any agent stuck in WORKING for >5 minutes back to IDLE on next read. Catches the case where the run route flips status WORKING and the function dies before flipping back" },
      { type: "added", text: "Server-side auth on /api/agents/[id]/run. Requires a `launchpad-role` cookie set by AuthGate (admin or cro). Stops accidental URL-sharing fires that could rack up Anthropic charges. AuthGate now sets the cookie on every restored session, so existing logged-in users get the cookie automatically" },
      { type: "added", text: "Reset to default button in Config tab — repopulates the system prompt textarea with the canonical seed text, so a botched prompt edit is one click away from recovery" },
      { type: "added", text: "New `slack_thread_replies` tool — wraps conversations.replies so Felix can read inside threads. Previously he saw only top-level messages; now if slack_recent_in_channel surfaces a thread with reply_count > 0, he can drill in" },
      { type: "added", text: "agent.runner field (\"stub\" | \"real\") on the Agent record. Felix is the only \"real\" one; the rest are \"stub\". Drives chat-tab footer label and empty-state copy. Replaces the hand-maintained REAL_AGENTS set" },
      { type: "improved", text: "Slack channel list now paginates fully (was capped at 500 — agencies with 100+ client channels were silently missing some). Cached for 1h. Same TTL applied to the users.list cache so Slack name changes propagate within an hour without a redeploy" },
      { type: "improved", text: "Bot-token-only setups now reject slack_search_messages cleanly with \"search.messages requires a user token\" instead of letting Felix call it and get a confusing 403. Tool returns the error text → Felix relays it" },
      { type: "improved", text: "Anthropic runner tool results capped at 24KB before stuffing into the messages array. Previously a 50KB tool result would balloon context and confuse the model; now we send a truncation note with a preview" },
      { type: "improved", text: "Same-role consecutive history messages are merged before sending to Anthropic. Defends against corrupt localStorage producing two `user` turns in a row, which would 400 the entire run" },
      { type: "improved", text: "When the runner hits maxIterations without end_turn, we log a warning and surface a `hitMaxIterations: true` flag so the chip in the UI can show it. Previously these were silent" },
      { type: "improved", text: "Cron auth has a dev-mode bypass. /api/cron/felix-digest now also accepts the launchpad-role cookie when NODE_ENV !== production, so you can iterate on the digest locally without setting CRON_SECRET. Production still requires the bearer" },
      { type: "improved", text: "Tool input cast in the runner now has an explicit comment pointing at the audit issue (#8) for the type-safety hole. Schema validation at the API level is the source of truth — TS narrowing isn't possible without losing tool-generic independence" },
      { type: "removed", text: "Dead exports: setAgentStatus, createTask, updateTask from src/lib/agents/data.ts. The run route writes directly via Supabase server-side; client-side callers don't exist. If they appear, re-add" },
    ],
  },
  {
    id: "cl-53",
    date: "4 May 2026",
    version: "0.35.3",
    title: "Felix — Slack hallucination fixes + tool-call auditability",
    changes: [
      { type: "fixed", text: "Slack tools were returning raw user IDs (U073XYZ...) instead of names, so Felix had to guess who posted what — and got it wrong. e.g. attributed \"Happy Bank Holiday Fuckers\" to Alister when Dylan actually posted it. Slack-client now resolves user IDs to display names server-side via users.list (cached per request) and exposes a `user` field with the real name. Falls back to the raw ID if name resolution fails — Felix's prompt is updated to say \"user U073XYZ said X\" rather than invent a name in that edge case" },
      { type: "fixed", text: "Times were UTC ISO timestamps, which Felix sometimes mis-converted to UK time (off by 1h during BST). Tools now return both `at` (UK-localised: \"Mon, 4 May 2026, 09:29\") and `at_iso` (raw UTC for any maths) — Felix uses the localised string directly, no manual conversion required" },
      { type: "fixed", text: "User mentions inside message bodies (`<@U073XYZ>`) and channel mentions (`<#C0XYZ|name>`) were leaking through as raw Slack syntax. New resolveMentionsInText() preprocessor swaps them for `@DisplayName` / `#channel-name` so Felix can reason about who was tagged" },
      { type: "added", text: "Tool calls now persist onto AgentTask records and ship back to the chat UI. Each agent bubble shows a chip strip below the text — `slack_recent_in_channel (7)` etc — clickable to inspect the raw input + result Felix actually saw. Makes hallucinations visually obvious: if the chip says count: 0 but Felix listed 5 things, you can tell at a glance" },
      { type: "added", text: "If Felix answers with zero tool calls, the bubble now shows a yellow warning: \"⚠️ No tools called — this answer came from the model alone. Treat with caution.\" Caps the worst hallucination class (model just generates from training data)" },
      { type: "improved", text: "Felix's hard-rules section in the system prompt now explicitly forbids inventing sender names from Slack IDs, fabricating timestamps, or filling gaps when a tool returns count: 0. Plus: \"If you realise mid-answer that you've made something up, stop and correct it explicitly. Do not silently retract.\"" },
    ],
  },
  {
    id: "cl-52",
    date: "1 May 2026",
    version: "0.35.2",
    title: "Felix — manual memory file",
    changes: [
      { type: "added", text: "Felix now reads a curated memory file at src/lib/agents/memory/felix.ts on every run. Edit the file, save, and Felix picks up the new facts on his next call. Use it for things tools can't easily surface: name aliases (\"Barn = Barnaby Clark\"), client context (\"Velvet's primary contact is Steve\"), and defaults for ambiguous queries. Live data (task status, blockers, etc.) still comes from tools — memory is for stable knowledge" },
      { type: "added", text: "Memory section sits between persona/rules and live context in the assembled system prompt. Includes a starter scaffold with team aliases, client aliases, defaults, the AI agent roster, and a corrections log header. Verified Felix correctly identifies \"Theo\" as the AI agent (not a person) and asks Dylan to clarify unknown aliases like \"Vik\" instead of guessing" },
      { type: "added", text: "Sets up the seam for option (2) from the memory design: a future `remember_this` tool can append corrections to the same file automatically when Dylan corrects Felix on something that's likely to come up again" },
    ],
  },
  {
    id: "cl-51",
    date: "1 May 2026",
    version: "0.35.1",
    title: "Felix — chat persistence + conversation memory",
    changes: [
      { type: "fixed", text: "Chat tab now survives switching to another tab (Tasks / Config / Performance) and back. Previously the conversation lived in component-local useState which got wiped on unmount, so flicking to Tasks and back to Chat lost everything Felix had just told you. Threads are now persisted to localStorage per-agent (key: launchpad-chat-{id}) using a lazy useState initializer, which avoids the race where the persist effect would clobber the saved state with the empty initial state on mount" },
      { type: "added", text: "Felix has conversation memory inside a thread. The chat tab ships the last 10 turns back with each /run call as a `history` field; runFelix stitches those into the Anthropic messages array before the new user input. Follow-ups like \"Who's the assignee?\" after a question about overdue tasks now work — Felix answers \"Barnaby Clark.\" because he can see the prior turn. Cap is configurable in chat-tab.tsx (HISTORY_TURNS_SENT)" },
      { type: "added", text: "Clear-conversation button (trash icon) in the chat tab header — wipes both the React state and localStorage so you can start a fresh thread without manually clearing storage" },
      { type: "improved", text: "Chat empty-state copy and footer label now adapt based on whether the agent is real (Felix) or stubbed. For Felix: \"Ask Felix anything... follow-ups remember context\" and \"{model} · N turns in this thread\". For stubbed agents: the v0.5 \"responses are mocked\" wording is preserved" },
    ],
  },
  {
    id: "cl-50",
    date: "1 May 2026",
    version: "0.35.0",
    title: "Felix is alive — first real Anthropic agent with tool use",
    changes: [
      { type: "added", text: "Felix's chat tab is no longer stubbed. /api/agents/felix/run now runs a real Anthropic SDK call wrapped in a tool-use loop, with five live tools: launchpad_recent_activity, launchpad_blocked_tasks, launchpad_overdue_tasks, slack_search_messages, slack_recent_in_channel. Other agents stay on the v0.5 mock for now — the seam (per-agent runner module) makes adding Wren/Echo/etc. a small lift each" },
      { type: "added", text: "Daily digest cron at /api/cron/felix-digest, scheduled for 07:00 UTC (08:00 UK during BST) in vercel.json. Felix sweeps the last 24h across Launchpad and #ops, formats the digest with the section headers Dylan specified (🔥 / ⏰ / 🚧 / 📋 / 👀), and posts it to SLACK_OPS_CHANNEL_ID. Pass ?dryRun=1 to get the markdown back without posting" },
      { type: "added", text: "New Felix system prompt — \"You are Fix-It Felix, the operations agent for Ecom Landers.\" Voice rules baked in: direct, observation-first, no AI tells, no corporate softening, lead with the answer. Read-only by hard rule (he refuses write actions). Examples in-prompt for tone calibration" },
      { type: "added", text: "Reusable tool-use runner at src/lib/agents/anthropic-runner.ts — handles the Anthropic loop, parallel tool execution, error capture, iteration cap. Per-agent runners (src/lib/agents/runners/*.ts) plug in their tool subset and any context (UK time, source). Felix is the first; Echo/Wren/etc. follow the same pattern" },
      { type: "added", text: "Slack read client at src/lib/slack-client.ts — wraps @slack/web-api for search.messages and conversations.history. Channel resolver accepts ID, #name, or name-only and aliases \"ops\" → SLACK_OPS_CHANNEL_ID so Felix can say `channel: \"ops\"` without knowing the raw ID" },
      { type: "improved", text: "seedAgentsIfEmpty now syncs definition fields (name, role, description, avatars, tools, systemPrompt) from NAMED_AGENTS into stored records when they drift — so changing Felix's prompt in code propagates to your local + production records on next page load. User-edited fields (status) stay untouched" },
      { type: "fixed", text: "Felix's role label updated from \"Project Manager\" to \"Operations Agent\" — closer match to what he actually does (cross-system monitoring + Q&A, not delivery cadence). His tools list now matches the 5 real ones instead of the v0.5 stub names" },
    ],
  },
  {
    id: "cl-49",
    date: "1 May 2026",
    version: "0.34.2",
    title: "Invoice Generator — registered business address on every invoice",
    changes: [
      { type: "added", text: "Every generated invoice now shows a proper From block: Ecomlanders Ltd, 4 Station Court, Cannock, England, WS11 0EJ, plus Company No. 16308589. Bill To column moves alongside it on the right" },
      { type: "added", text: "New invoice info strip above the From/Bill To row groups Invoice Number · Issued · Due · Payment Terms into a single horizontal grey bar — tidier hierarchy, easier for clients to scan" },
      { type: "improved", text: "PDF footer now includes the registered address and company number on every page (was just \"Ecomlanders Ltd\"). Required for UK Ltd invoice compliance" },
      { type: "added", text: "Business profile now lives in src/lib/business-profile.ts — single source of truth for legal name, address, company number, and (when registered) VAT number. Future PDFs can import the same constants" },
    ],
  },
  {
    id: "cl-48",
    date: "29 Apr 2026",
    version: "0.34.1",
    title: "Agent Mission Control — Unique characters + idle/working animations",
    changes: [
      { type: "added", text: "Each agent now has TWO pixel sprites — an idle pose with their role prop at rest, and a working pose with the prop in active use. Felix carries a clipboard, Wren a magnifier, Juno a pen + notepad, Theo a tablet, Pip a stack of envelopes, Otis a laptop, Mira a chart placard with rising bars, Reuben a planner. Sprite swap is automatic based on agent.status" },
      { type: "added", text: "Always-on idle bob: NPCs bob gently every 2.6s while idle. Per-agent animation-delay is hashed from the agent id so the eight characters on the index page bob out of sync — gives the \"milling around the town square\" feel. WORKING agents get a faster, more pronounced 0.9s bob; BLOCKED and OFFLINE stay still" },
      { type: "added", text: "/api/agents/[id]/run now flips agent.status to WORKING for the duration of the simulated run, then back to IDLE on completion. Chat tab triggers a mid-run reload so you actually see the sprite swap during the 1.5s wait. Skipped for OFFLINE agents — they stay offline until you bring them online manually" },
      { type: "improved", text: "Renamed all 8 agents to feel like distinct NPCs rather than a generic roster: Sam → Felix, Iris → Wren, Maya → Juno, James → Theo, Nora → Pip, Leo → Otis, Echo → Mira, Archie's Assistant → Reuben (role changed from \"Founder Ops\" to \"Personal Aide\" — Archie is dev lead, not founder)" },
      { type: "improved", text: "seedAgentsIfEmpty now prunes any agent whose id isn't in NAMED_AGENTS — so the rename above sweeps the old sam/iris/etc records out of localStorage and Supabase on next page load, no manual cleanup needed" },
      { type: "improved", text: "PixelPortrait now takes an `agent` prop (preferred) instead of raw `src` — that's what wires up the sprite swap and ambient bob. `static` flag suppresses animation for the small 32px avatars in the activity feed and chat bubbles where 10 bobbing NPCs would be visual noise" },
    ],
  },
  {
    id: "cl-47",
    date: "29 Apr 2026",
    version: "0.34.0",
    title: "Agent Mission Control v0.5",
    changes: [
      { type: "added", text: "New /agents page renders the Ecom Landers AI workforce as pixel-art NPCs in a town-square grid. Eight named agents seeded out of the box: Sam (PM), Iris (Research), Maya (Copy), James (Design QA), Nora (Inbox), Leo (Dev), Echo (Analytics), and Archie's Assistant. Each card shows status, role, and a subtle bob-on-hover idle animation" },
      { type: "added", text: "Agent detail page (/agents/[id]) with four tabs: Chat (briefs an agent — currently stubs a 1.5s mocked response so we can ship the UI before wiring real Anthropic calls), Tasks (filterable history with expandable rows), Config (editable system prompt + model selector, admin-only), Performance (placeholder until real runs land)" },
      { type: "added", text: "Stubbed API routes: GET /api/agents, GET/PATCH /api/agents/[id], POST /api/agents/[id]/run, GET /api/agents/[id]/tasks. The /run endpoint is the seam we'll replace with Anthropic SDK calls in v1 — request shape and AgentTask record stay the same so the UI doesn't need to change" },
      { type: "added", text: "Supabase migration 005 creates `agents` and `agent_tasks` tables with anon RLS policies and a JSONB index on agent_tasks.data->>'agentId'. Both follow the existing {id, data, created_at} pattern so the createStore<T> helper reads/writes them with no special casing" },
      { type: "added", text: "Placeholder pixel-art portraits live at /public/agents/*.svg with a README documenting the replacement workflow. Each NPC uses a shared 16×16 silhouette template with a unique palette so they feel distinct without waiting on real character art" },
      { type: "added", text: "Sidebar gains a top-level \"Agents\" link next to Mission Control" },
    ],
  },
  {
    id: "cl-46",
    date: "28 Apr 2026",
    version: "0.33.5",
    title: "Font Library — Race fix on multi-file upload",
    changes: [
      { type: "fixed", text: "Multi-weight fonts (Montserrat, Inter, etc.) were ending up with only 1 file in the row even though the modal showed all 18 uploading. Cause: each file POST did a read-modify-write on the row's files JSONB, and Promise.all firing all uploads in parallel meant the first 17 writes got clobbered by the last one. Uploads within a single font are now serialized so every file lands in the final array. Cross-font uploads stay sequential as before. Re-upload any fonts that lost weights" },
    ],
  },
  {
    id: "cl-45",
    date: "28 Apr 2026",
    version: "0.33.4",
    title: "Font Library — Optical-size grouping",
    changes: [
      { type: "fixed", text: "Fonts that ship with multiple optical sizes (DM Sans, Roboto Flex, Inter Tight, Newsreader, etc.) were splitting into one group per size — \"DM Sans 18pt\", \"DM Sans 24pt\", \"DM Sans 36pt\" — instead of all collapsing into a single \"DM Sans\" entry. The filename parser now strips \"_<N>pt\" suffixes from the parsed family name so every optical size lands in the same group" },
    ],
  },
  {
    id: "cl-44",
    date: "28 Apr 2026",
    version: "0.33.3",
    title: "Font Library — Bulk upload by family",
    changes: [
      { type: "added", text: "Drop multiple Google Fonts downloads at once and the upload modal now groups files by detected family — 7 zips in, 7 separate font rows out, instead of all files being merged into one. Each detected family renders as its own collapsible card with editable name, file list (per-row weight + style), category, use-for chips, niche chips, and notes — so different fonts can have different metadata in a single submit" },
      { type: "improved", text: "Submit button reflects the batch size — \"Add to library\" for one font, \"Add 7 fonts to library\" for many. Progress indicator shows which font is currently being created plus running file count (12/34 files). After bulk imports the modal closes back to the grid; single-font adds still drop you into the manage drawer for that font" },
      { type: "improved", text: "Files within each group still get parallel uploads, but the per-group create + upload runs sequentially so the server doesn't get a thundering-herd of 100+ uploads at once on a big batch" },
    ],
  },
  {
    id: "cl-43",
    date: "28 Apr 2026",
    version: "0.33.2",
    title: "Font Library — Weight switcher + Download all",
    changes: [
      { type: "added", text: "Each font card now has a strip of weight chips under the preview — click 100 / 300 / 400 / 700 / 700i to swap which uploaded weight + style the preview text renders in. Italic variants are marked with a small \"i\" suffix. Defaults to whichever weight is closest to 400 in the normal style" },
      { type: "improved", text: "Card download button now grabs every weight in the family at once. Single-file fonts download direct; multi-file fonts get zipped client-side via JSZip into <font-name>.zip with a \"Zipping…\" indicator while it bundles" },
      { type: "improved", text: "Card meta now shows total file count + combined size (e.g. \"4 weights · 312 KB total\") instead of just the latest file's stats" },
    ],
  },
  {
    id: "cl-42",
    date: "28 Apr 2026",
    version: "0.33.1",
    title: "Font Library — Drop-and-go upload",
    changes: [
      { type: "improved", text: "Adding a font is now one step instead of two. Drop the .zip Google Fonts ships you (or the unzipped folder, or individual files) — the library auto-detects the family name from the common filename prefix and the weight + style from each filename suffix. Inter-Regular.ttf → 400 normal, Inter-BoldItalic.ttf → 700 italic, *-VariableFont_wght.ttf handled too" },
      { type: "added", text: "Zip files are unpacked client-side via JSZip — no need to extract before uploading. Folder drag-and-drop also reads sub-directories recursively, so dropping either the .zip or the extracted folder works" },
      { type: "removed", text: "Dropped the \"CSS family name\" and \"Google Fonts URL\" fields from the create form — both were over-engineered. Family is just the font name now; if you need a source URL it lives in the notes" },
      { type: "improved", text: "Detected files preview as a list with editable weight + style dropdowns per row before submit, so you can fix any auto-detection misses without re-uploading" },
      { type: "improved", text: "Submit now creates the font row + uploads every file in one click with a \"Uploading X / Y\" progress indicator, then drops you straight into the manage drawer" },
    ],
  },
  {
    id: "cl-41",
    date: "28 Apr 2026",
    version: "0.33.0",
    title: "Team Tools — Font Library",
    changes: [
      { type: "fixed", text: "Quiz Funnel build was failing on Vercel — `field` on QuizQuestion was typed as `keyof typeof FIELD_BY_STEP` (resolves to numeric step keys 1–5) instead of the string field names like \"vertical\". Switched the type to the indexed-value form so production builds compile again" },
      { type: "added", text: "New Font Library at /team/fonts — Google-Fonts-style browse for the team's approved typefaces. Type any sample text and the size slider re-renders every card live. Filter by category (Sans / Serif / Display / Script / Mono), use case (Heading or Body), and niche tag (beauty, premium, minimal, etc.)" },
      { type: "added", text: "Admin upload flow — \"Add font\" creates a font row with metadata (name, CSS family, category, usage tags, niche chips with autocomplete + free-text, Google Fonts source URL, notes), then opens the detail drawer where the team can upload .woff2 / .woff / .ttf / .otf files per weight + style. Files are stored in a public Supabase Storage bucket and registered as @font-face declarations so previews render in the actual font" },
      { type: "added", text: "Per-file download buttons on every card and inside the detail modal so designers can grab the binary they need without hunting through email or Drive. Delete-file and delete-font controls available with confirms" },
      { type: "added", text: "Font Library entry added to the Team sidebar (Tools section) and to the Team Tools landing page" },
    ],
  },
  {
    id: "cl-40",
    date: "27 Apr 2026",
    version: "0.32.1",
    title: "Task Board — Deadline Picker Fix",
    changes: [
      { type: "fixed", text: "Deadline date picker no longer pops the \"why is it changing?\" reason modal when you click the next/previous month chevron in the native date picker. Some browsers auto-commit the same day-of-month in the new month while you're just navigating — the modal now only appears when you actually finalise a new date and the input loses focus. Enter commits, Escape resets and exits cleanly" },
    ],
  },
  {
    id: "cl-39",
    date: "23 Apr 2026",
    version: "0.32.0",
    title: "Task Board — Phase Tracking",
    changes: [
      { type: "added", text: "Task Board now has a Phase column with 11 stages: Onboarding, Research, Design, Internal Design QA, External Design Review, Design Revision, Development, Development QA, External Dev Review, Dev Revision, Launch. Existing tasks left blank on rollout" },
      { type: "added", text: "Every phase change is timestamped — each task carries a phaseHistory log so External Design Review → Design Revision → External Design Review loops record a fresh timer per round. Lets us measure how long designers take to action client amends" },
      { type: "added", text: "\"X in phase\" duration hint on every task row (just now / 5m / 2h 15m / 3d 4h) on both the admin board and the team-facing /tasks view. Hover shows the exact entered-at timestamp" },
      { type: "improved", text: "Team /tasks view now shows a coloured phase pill next to the status pill so anyone scanning the board can see stage at a glance" },
      { type: "improved", text: "Admin Task Board widened from max-w-4xl → max-w-6xl and columns rebalanced (task 1.3fr, client/assignee 140px, phase 180px, due/status 120px) so long task titles and phase labels like \"External Design Review\" stop getting squashed" },
      { type: "added", text: "Team members can now change phase directly from /tasks — phase pill is an inline dropdown that saves via a new PATCH /api/task-board endpoint. Updates optimistically for instant feedback and falls back to a refetch on error. No more funnelling every stage update through Alister" },
      { type: "added", text: "PATCH /api/task-board endpoint does a read-mutate-write on just the target task's phase field (instead of upserting the whole board blob) — narrows the race window when multiple team members edit at once. Logs the transition to phaseHistory server-side so local clock drift doesn't skew timers" },
      { type: "improved", text: "Team /tasks view restructured into proper table layout — columns (Task / Phase / Due / Status) now have fixed widths and a header row, so phase dropdowns and dates line up cleanly across every row instead of jumping around with title length" },
      { type: "added", text: "Design/Development segmented toggle at the top of /tasks (with active counts next to each) — one lane visible at a time instead of both stacked. Defaults to Design on load" },
      { type: "added", text: "Assignee filter on /tasks — dropdown populates from the currently-visible lane (designers when Design is selected, developers when Development is). Shows the selected name as a subtitle in the active count header, with a Clear button to reset. Filter auto-resets when switching lanes if the selected name doesn't exist in the new lane" },
      { type: "improved", text: "\"X in phase\" time-in-phase caption bumped up — 11px semibold with a clock icon, tinted to the phase colour so it reads at a glance instead of sitting as 9px grey microcopy underneath. Applied consistently to both the team /tasks view and the admin task board" },
      { type: "added", text: "Admin task board now has the same Design/Development segmented toggle as /tasks — one lane visible at a time with lane counts on each pill, instead of the two stacked sections. Assignee filter auto-clears when switching lanes. Keeps the internal editor view and the team view behaving consistently" },
      { type: "improved", text: "Task Board restructured to group tasks by phase — each active phase (Design, External Design Review, Design Revision, etc.) renders as its own collapsible section with a colour-coded header pill, count, and per-section column headers. Tasks without a phase are bucketed into a \"Not started\" section pinned to the top. Empty phase buckets are hidden. Applied to both the admin editor and the team /tasks view for consistent structure" },
      { type: "added", text: "Admin phase sections have a \"+ Add\" button per phase that creates a new task pre-set to that phase (so adding under \"External Design Review\" stamps the phase history immediately). The old top-level add-task button also remains for adding to \"Not started\"" },
      { type: "improved", text: "Team /tasks columns polished down to the four fields that matter: Task / Assignee / Phase / Time in phase. Assignee now has its own column (was crammed into the task meta row), and the time-in-phase duration moves out from under the phase pill into a right-aligned column of its own so you can scan how long everything's been sitting at a glance. Due date and Status columns dropped since the phase tracker replaces both as the accountability signal" },
      { type: "added", text: "Task Board now supports two deadlines per task — Design (delivery) and Dev/Go-live — instead of one generic \"due date\". Stored as separate fields so a task flowing through design → external review → dev → launch can carry both commitments at once. Existing tasks start blank on rollout" },
      { type: "added", text: "Click any task row (on /tasks or the admin board) to open a slide-out drawer showing the current phase pill + time in phase, both deadlines with urgency indicators (red = overdue, amber = due within 3 days, green = on track), and a full phase timeline of every transition with computed durations (e.g. Design 2d → External Design Review 1d 18h → Design Revision 6h · in progress)" },
      { type: "added", text: "Row-level urgency dot on /tasks — a tiny red/amber/grey dot next to each task title flags whether it's overdue, due soon, or on track against the deadline that applies to its current phase (design-side phases check designDueDate, dev-side phases check devDueDate). No extra columns, but stuck tasks surface themselves at a glance" },
      { type: "improved", text: "Admin Task Board drops the inline \"Due\" column in favour of a calendar icon button per row that opens the drawer with editable deadline inputs for Design, Dev, and Launch. Keeps the row compact while giving a proper UI for committing to dates. Team /tasks drawer is read-only for deadlines (editing stays with whoever runs the board)" },
      { type: "improved", text: "Task Board deadlines split into three: Design, Dev, and Launch. Each phase now checks the right one for urgency (design-side phases → Design deadline, dev-side phases → Dev deadline, Launch phase → Launch deadline). Lets you track handoff commitments separately from the actual go-live date" },
      { type: "added", text: "Task-level Designer + Developer assignment instead of a single mutable assignee field. Set both in the drawer (Team section) and the actual assignee auto-derives from the current phase — design-side phases show the Designer, dev-side + Launch show the Developer. Research is hardcoded to Dan. Means phase changes automatically hand the task off to the right person; no manual reassigning" },
      { type: "added", text: "Top-level filter tabs on both admin and /tasks expanded from Design / Development (2) to All / Research / Design / Development (4). Tabs now filter by phase category across a unified merged list (was two separate lane lists). Tasks without a phase fall back to their original lane so fresh work doesn't disappear from view. Counts on each tab reflect active-only for /tasks, total for admin" },
      { type: "added", text: "Legacy task view at /tasks-legacy — renders the original Title / Assignee / Due / Status layout using the pre-phase dueDate values that are still stored on each task but hidden from the new /tasks view. Handy for checking historic deadlines at a glance without scrolling through individual task drawers" },
      { type: "improved", text: "Task Board top-level grouping flipped from phase → client (the project). Deliverables now sit under their parent client in alphabetical order so you can see which tasks belong to which project at a glance — you never lose the project context. Sections are non-collapsible (can't hide deliverables from view). Phase + time-in-phase still render on each row, and the tab filters (All / Research / Design / Development) still narrow by phase category" },
      { type: "added", text: "Admin per-client \"+ Add\" button pre-fills the client name when creating a new deliverable — faster than typing it out for every row when adding multiple tasks to the same project" },
      { type: "improved", text: "Task Board layout flattened to one continuous list instead of separate client cards. Each client appears as an in-table header row with its deliverables indented beneath, giving a single scannable view of every project's work without the visual walls between them. Applied to both admin and /tasks" },
      { type: "added", text: "Phase filter dropdown on both admin and /tasks — lets you narrow to a specific phase (e.g. \"External Design Review\") across all clients. Picking a phase auto-switches the top tab to its category so counts stay coherent. Clear button wipes phase + assignee filters in one go" },
      { type: "added", text: "\"Associated deadline\" column on both admin and /tasks. Each row shows the deadline that applies to the task's current phase (design-side phases → Design deadline, dev-side → Dev, Launch → Launch) formatted as \"24 Apr · 2d\" with urgency colour (red overdue / amber <3d / green on track). Subtitle underneath labels which deadline is being shown. No more opening the drawer just to check whether something's running hot" },
      { type: "improved", text: "Client header rows on the task board lose the grey fill — just clean uppercase label + deliverable count with a hairline divider between projects. Less visual noise, project names still read as group headers, tasks flow as one continuous list" },
      { type: "added", text: "Deadline change audit trail — when Alister (or anyone on admin) moves an existing Design/Dev/Launch deadline, a modal pops up asking \"Why is it changing?\" and won't save until a reason is typed in. The change is appended to a new deadlineHistory array on the task" },
      { type: "added", text: "Info icon next to any deadline that has been moved — click to expand an inline history showing each prior version (strikethrough → new date · change date) with the reason note underneath. Gives instant context for why a commitment shifted, instead of losing the reason to chat history" },
      { type: "improved", text: "Task Board project headers now use whitespace to separate groups instead of a hairline divider — bolder uppercase labels with generous top padding between projects. Matches the minimal reference layout the project names were modelled on. Row separators inside each project stay so 10+ deliverable lists still read cleanly" },
      { type: "added", text: "\"By Client\" / \"By Phase\" grouping toggle on both admin and /tasks — replaces the previous phase filter dropdown. Switching to By Phase restores coloured phase pills as section headers so you can see everything currently in External Design Review, Design Revision, etc. at a glance. By Client stays the default" },
      { type: "added", text: "Launch-phase tasks are auto-hidden per group to stop finished work from clogging the board. Each group (client in By Client mode, Launch group in By Phase mode) gets a \"Show N launched\" toggle that reveals them; click again to hide. Non-Launch tasks always show, so active work stays front-and-centre" },
      { type: "improved", text: "Hairline grey divider back between client sections only — deliverables within a client flow without internal row borders, matching the reference layout. Keeps project boundaries readable without over-segmenting the list" },
      { type: "fixed", text: "Task Board client divider was too faint to see on white (#EDEDEF) — bumped to #E5E5EA so the line actually registers. Same colour as other borders in the codebase" },
      { type: "improved", text: "Deadline change-history now renders inline by default in the drawer instead of being hidden behind an info-icon click. If a deadline has ever been moved, the prior versions + reasons show directly below the row. Info icon removed — context is always visible, no extra click" },
      { type: "added", text: "Two-click delete guard on admin task rows. First click on the trash icon primes it into a red \"Click again to confirm delete\" state; only the second click within 3 seconds actually removes the task. Protects against accidental misclicks on a row of tight icons. No modal, no popup — just visual feedback on the same button" },
      { type: "added", text: "Task Board now lives in the Team Tools hub — primary card at /team (top of the grid) and first nav item in the team sidebar's Delivery section. Links through to the existing /tasks URL (kept as-is so the auto-refresh kiosk view still works on a shared screen)" },
      { type: "added", text: "\"← Team Tools\" back link in the /tasks header (and /tasks-legacy) so team members can get back to /team after navigating through. Sits left of the ecomlanders logo with a subtle divider between them" },
      { type: "added", text: "Swipe File at /team/swipe-file — drop a URL, server captures mobile + desktop screenshots via Firecrawl, both stored in Supabase Storage. Grid view of cards with desktop thumbnails; click into a card for a full-size view with Mobile/Desktop toggle, editable title/tags/notes, and delete with two-click confirm. Tag filter chips at the top once you've tagged a few entries. Surfaced as a Tools card on /team plus a sidebar nav item. Requires a one-time SQL run (supabase/swipe_file.sql) to create the table + storage bucket" },
      { type: "fixed", text: "Swipe File full-page screenshots no longer tile sticky/fixed elements (e.g. add-to-cart bars repeating down the page). Server now injects a JS pass that flattens any position: sticky / position: fixed element into normal flow immediately before the capture, with a re-run after 200ms to catch late-mounted bars" },
      { type: "improved", text: "Swipe File now hides sticky/fixed elements before capture instead of flattening them. Flattening avoided tiling but caused phantom duplicate bars when a site had both an inline section + a sticky version of the same component (the sticky one would appear at its DOM position alongside the inline one). Hiding gives a clean shot of the natural page — sticky ATCs, sticky navs, cookie banners all drop out of the screenshot" },
      { type: "improved", text: "Swipe File capture pipeline hardened — pre-screenshot now scrolls through the entire page in 80% viewport steps to trigger IntersectionObserver-based lazy loading (was missing below-the-fold images and lazy sections), and the hide pass runs every 250ms for 6 seconds to catch late-mounting popups (newsletters, age gates, region selectors typically fire 2-5s after page load). Popup selector list expanded to cover [role=\"dialog\"], <dialog>, [aria-modal], and any element whose class/id contains modal / popup / overlay / newsletter / lightbox" },
      { type: "fixed", text: "Swipe File: dropped the class/id substring matching from the popup selector — was false-positiving legitimate page content where words like \"modal\" / \"overlay\" / \"lightbox\" appeared as parts of longer class names (e.g. \"flavor-modal-trigger\", \"image-overlay\", \"lightbox-trigger\"). On the IM8 PDP this hid the entire hero section. Now only matching ARIA dialog patterns + position: fixed/sticky, which are the only signals that reliably identify a popup" },
      { type: "fixed", text: "Swipe File: stopped hiding position: sticky elements + replaced the setInterval hide pass with discrete one-shots. Sticky is widely used on ecom PDPs for product image galleries that lock as you scroll through the description — hiding them was nuking the hero. The setInterval also kept running while Firecrawl's scroll-and-stitch screenshot was in progress, hiding new sections as they came into view. Now only position: fixed gets hidden (which is what popups and fixed banners actually use), and we run two discrete hide passes before screenshot starts" },
      { type: "added", text: "Quiz Funnel at /quiz — 6-step lead qualifier (5 multi-choice + contact form) sitting behind paid traffic. URL-driven step state, localStorage answer persistence, deep-link guard so you can't skip ahead. Submission lands on a personalised result page (/quiz/results/[id]) with a headline built from vertical + pain point, 3 ranked priorities pulled from a (traffic source × pain point × vertical) matrix, and a tier-aware CTA stack — Tier A/B see Calendly + WhatsApp, Tier C sees a free playbook only (no call-pressure on under-£30k brands)" },
      { type: "added", text: "Quiz Funnel side-effects: lead tier computed server-side, row inserted to the new quiz_submissions Supabase table, Slack ops channel pinged with formatted lead summary, /api/webhooks/email-nurture stub queued for Klaviyo wiring later. All side-effects are fire-and-forget so the user lands on their result page in under a second; flags surface as \"Pending\" / \"Yes\" in the admin dashboard" },
      { type: "added", text: "Quiz Funnel admin at /sales-engine/quiz-leads — table of submissions newest-first, tier filter pills, per-row \"Mark as contacted\" toggle, click any row to expand the full answer trace (vertical, revenue, traffic source, pain point, CRO history, attribution, side-effect status, store URL with favicon)" },
      { type: "added", text: "lib/quiz primitives: questions.ts (locked Q&A copy), priority-matrix.ts (pure data config — edit entries directly as we see real submissions, no component change needed), tier.ts (lead tier rules), headline.ts (vertical × pain → headline builder), validation.ts (hand-rolled form validation + email typo correction + store URL normalisation), storage.ts (localStorage helpers). Setup docs in docs/quiz-funnel.md and migration in supabase/quiz_submissions.sql" },
    ],
  },
  {
    id: "cl-38",
    date: "22 Apr 2026",
    version: "0.31.1",
    title: "Sales Deck — Cover Slide Polish",
    changes: [
      { type: "improved", text: "Sales deck cover slide cleaned up — \"Slide 1 — Cover\" heading removed so the logo + tagline stand on their own. Conversion Engine logo split into /conversion-engine-mark.svg + /conversion-engine-wordmark.svg; presentation view renders the split via a custom ReactMarkdown img override when /conversion-engine-logo.svg is referenced" },
      { type: "improved", text: "Sales deck drops the editor-facing intro chunk (title + fullscreen link) so slide 1 is the actual cover — counter now reads 1 / 11 instead of 2 / 12 on the first real slide" },
      { type: "added", text: "Cover slide gets vertical portfolio marquees on both edges — 4 columns (2 per side) scrolling up/down at 95-125s, feeding from portfolio-v2 desktop + mobile slices, ~22% opacity, grayscaled, top/bottom fade masks. Non-cover slides keep the existing dot pattern. Adding more projects to portfolio-v2 auto-populates the backdrop. Respects prefers-reduced-motion" },
      { type: "improved", text: "Cover tagline changed to \"Covering everything you need post click\"" },
      { type: "added", text: "\"Entering the engine\" transition when advancing from the cover — 750ms sequence where the mark zooms 22× + fades + blurs, wordmark and tagline fade with a subtle zoom, left/right marquee columns peel outward, a soft radial white flash blooms at center. Slide 2 rises in (520ms, fade + 14px translate + blur→sharp). Reverse nav is instant. Nav disabled during the transition to prevent double-trigger. Reduced-motion skips the animation" },
      { type: "improved", text: "Smoothed the cover → slide 2 transition — backdrop + dot pattern now fade in/out instead of mount/unmount (killing the snap), removed blur filters + per-column slide-outs (which caused jitter and reverse-slide under the fade), all transforms use translate3d/scale3d for GPU compositing. Tightened timings (480ms exit, 360ms enter) with no dead air between the two" },
      { type: "improved", text: "Removed the center radial white flash during the transition — just the logo blowing up + fading, no bloom" },
      { type: "improved", text: "Cut the mark's max zoom from 20× → 8× and accelerated its opacity fade to 140ms (was 240ms + 80ms delay) so the white mark is invisible before it gets large. Eliminates the perceived \"big blur\" that happened when a 1760px mark sat mid-screen at 18% opacity. Transform keeps zooming invisibly for another 200ms to carry the forward motion. Cover exit now 340ms total, slide 2 lands at 340ms. Dropped the wordmark/backdrop scale transforms — only the mark blows up" },
      { type: "added", text: "Sales deck Slide 3 is now a live revenue calculator — four sliders (monthly traffic, current CVR, AOV, CVR lift target) feed into big on-screen numbers for monthly revenue recovered and annual opportunity. Defaults at 150K / 1.8% / £55 / +1.0% produce £82.5K/mo, £990K/yr. Arrow-key nav doesn't hijack slider drags" },
      { type: "added", text: "Sales deck Slide 9 is now a visual investment-vs-recovery layout — two horizontal bars (tiny £8K/mo next to a big gradient green £X/mo) above a 3-up summary (Return multiple, Annual gain, Breakeven CVR lift), pricing terms in a 2-col grid. Slider state is shared with Slide 3 so the inputs a prospect plays with on \"what you're losing\" drive the ROI math on \"what you'd pay\"" },
      { type: "improved", text: "Sales deck Slide 4 reframed from \"why conversion agencies are a bad fit\" (felt defensive) to \"where this fits next to a page build\" — positions page builds as a precision tool and Conversion Engine as the whole system, with language that makes this the graduation from a page-build relationship, not a replacement" },
      { type: "improved", text: "Sales deck Slides 2, 5, 6, 7, 8, 10 rewritten for more punch and premium positioning — tighter bullets, sharper one-liners (\"One throat to choke when conversion stalls\"), real results framing on proof slide" },
      { type: "improved", text: "Sales deck presenter view: \"Slide N — \" prefix stripped from rendered h2 (editor source still reads nicely, on-screen title is clean). Designer notes chunk filtered out of slide list — counter now reads N / 10 instead of N / 11" },
      { type: "added", text: "Sales deck: visual anchors for every slide (no more text-only walls). S2 has role cards + a dashed \"unowned conversion layer\" gap card with a pulsing red dot. S4 is side-by-side Page Build vs Conversion Engine comparison with \"Graduates to\" arrow between. S5 is an org diagram (Your Brand → peer nodes: Ads / Email / Conversion Engine). S6 is a 5-card scope grid with heroicons. S7 is a numbered 3-step timeline on a gradient line. S8 is 3 hero stat cards (+22% / +14% / +7%). S10 is 2 large CTA cards (Strategy call / Deep-dive audit) with a green book-a-slot button" },
      { type: "improved", text: "Sales deck: editorial pass inspired by a clean investor-deck reference — killed the green accent entirely (pure B&W now), scaled typography up (h2 3.5rem, S8 proof metrics 6rem, S3 annual opportunity 5.5rem, S9 summary values 2.75rem), stripped card fills + borders from S2/S4/S5/S6/S8/S10 and replaced with whitespace + hairline rules, killed the pulsing red dot on S2, replaced S4's \"Graduates to\" arrow with a simple vertical hairline, S10 \"Book a slot\" is now a white flat button, S9 recovery bar is pure white (no green gradient). Mark exit keyframe unchanged — still blowing up visibly" },
      { type: "improved", text: "Sales deck Slide 2 reframed as a horizontal flow diagram — Ads → Conversion Engine (highlighted with \"US\" badge) → Email / SMS. Visually-sized pipes: fat white pipe labeled \"100K sessions / mo\" going into Conversion Engine, thin white pipe labeled \"~1,800 buyers\" coming out. The shrink from fat to thin sells the CVR leak. Headline: \"Your ads are working. Your conversion isn't.\" Footer: \"That's the layer we own\"" },
    ],
  },
  {
    id: "cl-37",
    date: "21 Apr 2026",
    version: "0.31.0",
    title: "Portal Setup Flow + Conversion Engine Roadmap",
    changes: [
      { type: "added", text: "Step-by-step New Portal setup at /tools/client-portal/new — pick Page Build or Conversion Engine, then 4 guided steps (Brand / Scope / Timeline / Team). Page Build seeds pages + 4 phases. Conversion Engine seeds 1-3 initial roadmap items so the portal isn't empty on Day 1. Can't click Create until required fields are filled" },
      { type: "added", text: "Roadmap data model + admin Roadmap tab on Conversion Engine (retainer) portals — clean list view grouped by stage (In Progress / Next Up / Shipped / Backlog). Add, edit, reorder via stage dropdown, attach Figma / Staging / Live URLs, log outcome when shipped. Backed by new offer_roadmap table (SQL in supabase/roadmap_items.sql)" },
      { type: "added", text: "Client-side Roadmap view on retainer portals — the Conversion Engine roadmap is now visible to clients. New Roadmap tab, set as the default on drill-in. Backlog hidden from clients; empty stage sections hidden. Read-only — no add/edit/delete controls leak through" },
      { type: "fixed", text: "Admin Build + Results tabs had duplicate, differently-sized section headers (Design Reviews/Design & Dev Handoff, Development/Page Reviews, outer Reports wrapper with an h2 inner) — collapsed to one consistent text-xs heading per section" },
      { type: "improved", text: "Client touchpoint card drops the description line (e.g. \"Dev progress review\") — only the day + date shows now, with a compact phase pill (e.g. DEVELOPMENT) for context. Stops clients quoting back a specific touchpoint scope they can hold us to" },
      { type: "improved", text: "Page-build portals simplified — Build tab drops Video Updates (unused), renames Design & Dev Handoff → Design Review and Page Reviews → Development Review. Results tab drops Funnels + Reports for page-build projects (Reports still shows on retainer). Funnels moved to its own sidebar entry (renamed from Funnel Builder)" },
      { type: "added", text: "Tests now take a Notes field and a Screenshot upload — drop a PNG/JPG (up to 50MB) and it renders inline on the test card. Upload goes through the existing /api/design-brief/upload endpoint using the design-briefs bucket" },
      { type: "added", text: "Funnels tab is always visible on the portal cockpit (no longer gated on having at least one funnel). First section is a new Miro Board embed — paste a Miro share link and the board renders live inline. SQL in supabase/add_miro_board_url.sql adds the column" },
      { type: "added", text: "Funnels tab now has a Documents section — upload any file (uses design-briefs bucket), appears in a list with filename, date, size, and a delete button on hover. SQL in supabase/add_funnel_documents.sql adds the column" },
      { type: "added", text: "Project Overview (page-build only) now shows a Deliverables checklist — two checkboxes per item (Design / Dev). Tick Design when the design's approved, Dev when it's live. Internal-only, no status cycling, no extra states. Hidden for retainer/Conversion Engine projects (those use the Roadmap)" },
      { type: "improved", text: "Scope and Deliverables merged on page-build project overviews — they were the same thing. The existing Scope list now renders as \"Deliverables\" with the Design/Dev checkboxes inline. Separate Deliverables block removed. Retainers still show \"Scope\" without checkboxes" },
      { type: "improved", text: "Client portal home is easier to read — section labels bumped to 11px + darker, Next Touchpoint promoted to a dark card with the weekday in front of the date (e.g. Sat 21 Mar) and a phase pill. \"All times UK (GMT+1)\" trimmed to just \"All times UK\" on both home + project overview touchpoint cards" },
      { type: "added", text: "Project Flow checkpoint stepper on the client home — 7 stages (Onboarding, Research, Design, Design Review, Development, Development Review, Launch) with checkmarks for done, a ringed dot for the current stage, numbered grey circles for what's coming. Stage is inferred from the active project's in-progress phase name" },
      { type: "improved", text: "Checkpoint stepper spacing now grid-based, so the dots sit at equal column centres regardless of label length. Active Projects card got a richer layout — bolder project title, phase pill, deliverables shipped count (e.g. \"2 of 5 deliverables live\"), and thicker progress bar. Whole card is now clickable" },
      { type: "improved", text: "Retainer client portal nav: Roadmap gets a proper icon, Testing renamed to Test Library. Retainer Roadmap tab now renders the Miro board embed from the admin Funnels tab + any uploaded documents, replacing the staged list (admin still sees the list internally)" },
      { type: "added", text: "Retainer Deliverables tab is now a 4-column assembly-line kanban — Scoped / Next Up / In Progress / Live. Each card is a conversion asset (test / page / upsell / other) with a type chip, title, impact hypothesis, outcome, shipped date. Reuses roadmap_items + a new asset_type column (SQL in supabase/add_roadmap_asset_type.sql). Admin RoadmapForm gets a Type dropdown" },
      { type: "removed", text: "\"Team\" copy-link button removed from the admin cockpit. Team members now discover their team view of portals from /team (Team Tools) — a new Client Portals section lists every active portal and links through to /portal/[token]/team" },
      { type: "improved", text: "Team Tools (/team) cleaned up. Sidebar is now Portals → Operations Wiki → QA Checklist → Dev Self-Check. Research & Intel, Copy Engine and Design & Dev hidden from view (code kept). Portals moved from a section on the home into its own /team/portals page. QA Checklist swapped for an evergreen Dev QA checklist (DEV_HANDOFF_ITEMS grouped into sections with localStorage-backed progress)" },
      { type: "removed", text: "Testing Lab + Tickets tabs removed from /tools/client-portal — not being used, cluttered the nav. Ticket type panels on the overview dashboard + Open Tickets summary pill also removed (the underlying /tools/tickets page still exists if you need it)" },
      { type: "removed", text: "Tickets removed from the main app sidebar (Delivery group)" },
      { type: "removed", text: "Retainer tier (T1 / T2 / T3) dropped across the admin cockpit — tier picker gone from the retainer testing view, tier badge + health / expected-by-now math removed from the retainer card grid, tier selector removed from the New Portal form. Tier field stays in the DB so historic data isn't lost" },
      { type: "improved", text: "New portals auto-compute the next touchpoint on creation — uses the team's Mon/Wed/Fri default from settings (getNextTouchpointDate). Brand new portals no longer open with an empty 'No touchpoint scheduled' panel" },
      { type: "improved", text: "Client touchpoint card now shows the weekday (Mon 21 Apr) and labels the time as UK (GMT+1) so US/overseas clients don't have to guess the timezone" },
      { type: "improved", text: "Creating a portal from an Onboarding Inbox submission now auto-populates the portal instead of dropping an empty shell — seeds a project with 4 phases (Onboarding \u2713 / Design / Dev / Launch), maps page_type to a deliverable, attaches uploaded brief files as documents, and writes a context entry with the brief, primary goal, target customer, USPs, and timeline pulled from the onboarding form" },
    ],
  },
  {
    id: "cl-36",
    date: "20 Apr 2026",
    version: "0.30.0",
    title: "Offer Engine + Team Handover + Branded Proposal",
    changes: [
      { type: "improved", text: "Team portal view (/portal/[token]/team) — Handover now renders per-gate with progress dots in the sidebar, matching the admin cockpit. All four gates (CRO Design / Design Handoff / Dev to Senior Dev QA / Handoff / Testing) are shown. Clicking a gate opens its checklist inline (not as a modal popup). Deep-linkable via ?project=<id>&gate=<key>" },
      { type: "fixed", text: "QA gate items out of sync between admin and team — historic portals could have stale checklist data stored under the wrong gate (e.g. dev_handoff containing CRO_BRIEF items). GateChecklistForm now auto-heals the DB on mount when stored items don't match the current definition, so both views read identical data from the next render onwards" },
      { type: "fixed", text: "Team portal sidebar scrolling out of view — two underlying causes: (1) html/body overflow-x: hidden was forcing overflow-y: auto and turning body into a scroll container that broke sticky, now uses overflow-x: clip; (2) PageTransition's fadeInUp kept a transform after the animation ended, creating a containing block that trapped sticky, now strips the class once the animation completes. Sidebar stays pinned to the viewport on scroll" },
      { type: "improved", text: "Dev QA category numbering flattened — old labels mixed 0.1 / 1.1 / 8 / 14.1 formats. Now a clean 1 through 40 sequential across all 40 categories (Visual, Scrolling & Navigation, ... Migration to Live)" },
      { type: "improved", text: "QA gate Slack messages slimmed to essentials — headline (✅ Gate Name submitted), client · project, and the team portal link. Dropped the submitted-by context line and the next-role nudge since the link is enough to act on" },
      { type: "fixed", text: "Internal Slack channel saves were silently discarded — client_portals.slack_internal_channel_id column never existed in Supabase, and updatePortal swallowed the insert error. Saves appeared to work but never persisted, so gate-notify had no channel to post to. SQL migration in supabase/add_slack_internal_channel_id.sql adds the column; mapPortalRow now loads it; updatePortal now surfaces write errors instead of swallowing them. Re-enter the channel ID on affected portals after running the migration" },
      { type: "improved", text: "QA gate Slack messages no longer auto-unfurl the portal link — keeps the notification to three clean lines instead of appending a redundant Launchpad preview card" },
      { type: "improved", text: "Admin cockpit gate submissions also fire the Slack notification — previously only team view submissions pinged the channel. Same three-line message, same deep-link back to the team view" },
      { type: "improved", text: "Slack gate-notify — links now point to the team portal view with project + gate deep-link (e.g. /portal/.../team?project=X&gate=design_handoff), not the admin cockpit. Dev clicking the Slack link lands directly on the gate form" },
      { type: "added", text: "Offer Engine — paste call notes + fill offer inputs, Claude drafts a personalised Conversion Engine proposal and saves it to /proposal/[brand-slug]. Template modelled on the Yorkshire Dental Suite format (retainer + pilot). Numbers Claude can't verify stay as [needs input] so nothing invented slips through. Tool at /tools/offer-engine, linked from the Sales Process wiki entry. Requires offer_proposals Supabase table (SQL in supabase/offer_proposals.sql)" },
      { type: "added", text: "Sendable branded proposal page at /proposal/yorkshire-dental-suite — bespoke layout bypassing the [token] route, formal SOW format with numbered sections, two-tone headers, even stat boxes, Highest Return badge, signoff order (Ajay first, Dylan second), custom OG tags for Slack/social previews" },
      { type: "improved", text: "Proposal copy reformatted as formal SOW with numbered sections, all em dashes stripped for cleaner tone" },
      { type: "fixed", text: "Proposal header logo alignment — shrunk ECL mark to 20px and tightened text line-height so the logo and 'Ecomlanders × Yorkshire Dental Suite' lockup sit on the same centerline" },
      { type: "fixed", text: "Ajay's surname corrected (Daniel → Jani)" },
      { type: "added", text: "Payment Link — recurring subscriptions now supported with Conversion Engine preset. Whop errors surface with full detail for debugging" },
      { type: "added", text: "Generate LinkedIn from X — blue button on the LinkedIn caption block rewrites the X caption for LinkedIn in one click" },
      { type: "improved", text: "Clear Drafts — only removes drafts, keeps Ready to Post and Scheduled posts intact. Non-draft posts now require confirmation before deletion" },
      { type: "added", text: "CRO onboarding fields — product URL, page type, traffic source, ASINs, Meta page, strategic direction" },
      { type: "improved", text: "Quick Links — black floating pill with Report Issue shortcut. Old issue tracker removed" },
      { type: "improved", text: "Onboarding confirmation copy updated — brief received, Slack updates, access request flow" },
      { type: "added", text: "Onboarding badge — red count circle in sidebar, polls every 5 minutes so you can see pending briefs at a glance" },
    ],
  },
  {
    id: "cl-35",
    date: "15 Apr 2026",
    version: "0.29.0",
    title: "Project Flows — Assembly Lines + Onboarding Inbox",
    changes: [
      { type: "added", text: "Project Flows (Layer 1) added to Operations Wiki — four assembly-line flows: Design Only, Design & Dev, D&D+CRO, Conversion Partnership. Each is a linear runbook with hard gates" },
      { type: "added", text: "Onboarding Inbox — global intake and triage process that sits above all flows. Every project starts here before entering a flow" },
      { type: "added", text: "Three gates enforced across all flows: Design→Dev Handoff, Dev Self-QA, Launch Prep. Each references the specific SOP from Layer 2" },
      { type: "added", text: "Conversion Partnership flow — sprint-based loop with roadmap layer, monthly cadence, partnership health indicators" },
      { type: "improved", text: "Wiki sidebar now shows PROJECT FLOWS section above all existing categories with dark label styling" },
    ],
  },
  {
    id: "cl-34",
    date: "14 Apr 2026",
    version: "0.28.0",
    title: "Retainer Wiki Overhaul — Conversion Partnership Model",
    changes: [
      { type: "improved", text: "Full retainer wiki rewrite — all 9 sections rebuilt around the new Conversion Partnership model (£8K+/mo, team-led roadmap, two-stage audit close)" },
      { type: "improved", text: "Sales Process — two-stage audit approach with proof vs evidence framework. Initial audit (warm-up) → Deep dive (close)" },
      { type: "improved", text: "Delivery Framework — full scope of work including AOV optimisation, post-purchase flows, 60-90 day visual roadmap on Miro" },
      { type: "improved", text: "Revenue Projector — partnership economics at scale (5 retainers = £540K/yr), ad spend multiplier, team economics breakdown" },
      { type: "improved", text: "Positioning — conversion layer concept (ad agency + email agency + conversion agency), premium pricing language, dropshipper-to-brand bridge angle" },
      { type: "improved", text: "FAQ — expanded with premium pricing objection handling, internal playbook for scope creep and churn prevention" },
    ],
  },
  {
    id: "cl-33",
    date: "14 Apr 2026",
    version: "0.27.0",
    title: "Sidebar Cleanup + Floating Notes",
    changes: [
      { type: "improved", text: "Sidebar restructured — main nav grouped under 'Delivery' section header. Cleaner hierarchy" },
      { type: "added", text: "Floating Notes — notes moved from sidebar to a persistent floating icon (top-right). Accessible from any page with Cmd+Shift+N shortcut. Shows action item count badge" },
      { type: "improved", text: "Training section cleaned up — removed Design System, Playbooks, QA Checklist, Dev Self-Check. Kept Ops Wiki, Retainer Wiki (single link), Design Library, Feedback" },
      { type: "improved", text: "CRO Lab section now shows WIP badge to indicate work-in-progress status" },
      { type: "improved", text: "Finance section defaults to collapsed to reduce sidebar noise" },
      { type: "improved", text: "Retainer Wiki is now a single nav link instead of a dropdown — the wiki itself has internal navigation" },
    ],
  },
  {
    id: "cl-32",
    date: "14 Apr 2026",
    version: "0.26.0",
    title: "Operations Wiki + Login Redesign",
    changes: [
      { type: "added", text: "Operations Wiki — searchable wiki with 16 SOPs across Design, Development, CRO, Operations, QA, and Client categories. Same architecture as Retainer Wiki: sidebar nav, full-text search, markdown content, tool links" },
      { type: "added", text: "Design Library link in sidebar — opens Figma design library in new tab. Sidebar now supports external links with icon indicator" },
      { type: "improved", text: "Login screen redesign — full-bleed cinematic landscape background with frosted glass card, ECL logo, smooth transitions" },
      { type: "improved", text: "PDF upload support for bulk caption import — client-side PDF text extraction via pdfjs-dist CDN" },
    ],
  },
  {
    id: "cl-31",
    date: "12 Apr 2026",
    version: "0.25.1",
    title: "Calendar Ready-to-Post Flow",
    changes: [
      { type: "improved", text: "New Ready to Post workflow — bulk import creates grey Draft posts, add media and mark Ready to Post (blue), then schedule only blue posts to Typefully. Scheduled posts show at 50% opacity (green)" },
      { type: "improved", text: "Studio now has explicit Ready to Post toggle button — posts stay as drafts until you mark them ready. Save Draft keeps current status, Ready to Post turns post blue" },
      { type: "improved", text: "Schedule button shows count of Ready to Post posts and only picks up blue posts. Drafts and already-scheduled posts are excluded from scheduling" },
      { type: "improved", text: "Scheduled post cards render at 50% opacity in both month and week calendar views for clear visual hierarchy: Grey (draft) → Blue (ready) → Green 50% (scheduled)" },
    ],
  },
  {
    id: "cl-30",
    date: "10 Apr 2026",
    version: "0.25.0",
    title: "Deck Builder",
    changes: [
      { type: "added", text: "Deck Builder — generate branded HTML discovery decks with unique shareable URLs. Input brand name, traffic, CVR, AOV, conversion matrix scores, priorities, and pricing. Outputs a dark-themed 8-slide presentation: Cover, Problem, Funnel Analysis, Revenue Gap, 90-Day Roadmap, How We Work, The Offer, Next Steps" },
      { type: "added", text: "Public deck viewer at /deck/[id] — clients see an animated slide deck with score bars, revenue gap calculations, two-tier pricing, and navigation dots. No login required" },
      { type: "added", text: "Bulk caption import — upload a .txt file of posts (separated by ---) and Launchpad auto-populates the calendar. 3 posts per day at optimal times, X caption pre-filled, both platforms targeted. Open each to add media and generate LinkedIn version" },
      { type: "improved", text: "Bulk upload modal now has two modes: Import Captions (text file) and Upload Images. Default set to 3 posts per day for the Grok workflow" },
    ],
  },
  {
    id: "cl-29",
    date: "7 Apr 2026",
    version: "0.24.0",
    title: "Typefully Sync",
    changes: [
      { type: "added", text: "Typefully Sync button on the calendar — reconciles local state with Typefully. Clears stale draft references, flips orphaned scheduled posts back to Saved, and imports drafts/scheduled posts that exist in Typefully but not in Launchpad" },
      { type: "added", text: "Per-platform Typefully draft IDs stored on each post — scheduling now skips any platform that already has a live draft so you can't double-schedule X or LinkedIn for the same post" },
      { type: "removed", text: "Voice Profile UI panel on the calendar — the backend ignores it now that TOV v3 is hardcoded as the single source of truth. Removed the gear button and slide-in panel to stop the confusion" },
      { type: "added", text: "Leads database under Pipeline — minimal table (Name, Brand, URL, Rev Estimate, Status). Inline editing, status filter tabs (New / Reached Out / Responded), click-to-edit rows" },
      { type: "added", text: "Scout — native lead discovery agent. Pick a niche, hit Run, and it web-searches for DTC brands in the £80-120K/mo range, researches funnels, finds decision-makers, and saves qualified leads directly to Leads. Live progress feed, Slack reporting, duplicate detection. Same quality as the Claude Agent version at a fraction of the cost" },
      { type: "added", text: "Retainer Wiki — command centre for the retainer offer. Docs + toolkit in one place: offer tiers, 2-call sales process, onboarding framework, delivery cadence, conversion matrix, revenue projector, slide deck generator, positioning guide. Sidebar nav with Process / Toolkit / Reference sections, full-text search, and tool links" },
    ],
  },
  {
    id: "cl-28",
    date: "6 Apr 2026",
    version: "0.23.0",
    title: "Lead Funnel System",
    changes: [
      { type: "added", text: "Sales dashboard analytics — funnel performance (views, submissions, CVR), lead source breakdown with bar charts, pipeline health visualisation" },
      { type: "added", text: "Funnel event tracking — page views and form submissions tracked per funnel with source attribution" },
      { type: "added", text: "Pipeline source badges — kanban cards now show funnel and source tags so you can see where each lead came from" },
      { type: "improved", text: "Dashboard empty states — helpful messages with action links when no data exists yet instead of blank sections" },
      { type: "improved", text: "Recent leads on dashboard now show funnel and source badges inline" },
      { type: "added", text: "Lead Magnets hub — view all lead magnet pages with pre-generated tracked links per team member and platform (X, LinkedIn, TikTok, Email). Copy any link with one click and see per-link view/lead stats" },
      { type: "improved", text: "Sidebar restructured — Funnels (Calendar, Funnel Planner, Lead Magnets), Content (Articles, Portfolio), Pipeline, Revenue, Resources" },
      { type: "improved", text: "Audit landing page — footer now overlays bottom of portfolio strip with gradient fade for cleaner visual transition" },
      { type: "added", text: "Audit Portfolio manager — upload, reorder, and delete portfolio images from Launchpad settings. Images stored in Supabase Storage" },
      { type: "improved", text: "Portfolio v2 sync simplified — paste a Figma frame link (right-click → Copy link to selection) for desktop and mobile. No more separate file URL or frame names; file key + node ID extracted automatically" },
      { type: "improved", text: "Caption generation voice — baked the social-copywriter skill into the system prompt: write forwards not backwards, no emojis, no hashtags, no analogies, varied openings, earned takeaways" },
      { type: "improved", text: "Article generation voice — same social-copywriter principles applied to long-form Twitter/X articles" },
      { type: "fixed", text: "Audit page portfolio strip loaded in ~15s — now server-rendered with Supabase image transforms (320×944 @ q70) plus eager/lazy loading hints. Should be near-instant" },
      { type: "fixed", text: "Calendar Schedule to Typefully — posts ticked for both X and LinkedIn now actually schedule to both. Legacy posts without an explicit platforms array were falling back to X-only" },
      { type: "improved", text: "Post studio simplified — every post defaults to both X and LinkedIn (always repurposed). Removed the Post-To selector and Type selector. Just Format and Length now" },
      { type: "added", text: "Calendar Reset button — if you delete a draft in Typefully and want to reschedule from Launchpad, open the post and hit Reset to flip it back to draft status" },
      { type: "fixed", text: "Legacy posts scheduling to X only — existing posts are now auto-backfilled on load so every post targets both X and LinkedIn by default" },
      { type: "fixed", text: "Caption variants rendering as a blob — the preview now uses whitespace-pre-wrap so line breaks actually show up instead of collapsing into one paragraph" },
      { type: "improved", text: "Caption variants now forced to be structurally different — Sharp Opinion, Observation, Tactical Breakdown (or similar) instead of 3 rewordings of the same post. Image context is used as a hook, not literally described. Temperature bumped so variants genuinely diverge" },
      { type: "improved", text: "Stopped the caption model recycling Dylan's signature phrases (shite, whack, proper, cheat code, i'll wait) on every post. Reference examples now explicitly marked as rhythm-only, with hard rules against reusing their vocabulary" },
      { type: "improved", text: "Captions now pull from the idea/angle you type, not the image. The image is attached to the Typefully post but no longer sent to the caption model, so it stops drifting off-topic and describing what it sees" },
      { type: "improved", text: "Removed the duplicate platform switcher above the caption variants — only the top tab bar controls X vs LinkedIn now" },
      { type: "improved", text: "Voice Profile is now a single uploaded document — drop in a markdown or text file (or paste it) and the whole thing becomes the voice context for every caption. No more tone/avoid/rules/examples fields" },
      { type: "fixed", text: "Voice Profile doc was being ignored — captions felt the same regardless of upload because the hardcoded base prompt (Dylan's example tweets, banned phrases) was always prepended. Now the uploaded doc fully replaces the base prompt and is the single source of truth for tone and structure" },
      { type: "fixed", text: "Generating LinkedIn captions no longer wipes the X caption you've already written — Generate now only fetches variants for the active platform tab and leaves the other one untouched" },
      { type: "improved", text: "Caption model now sees the uploaded image again as supporting visual context (not the source of truth) — image informs the post, the idea/brief still drives it" },
      { type: "improved", text: "Studio shows X and LinkedIn captions stacked side-by-side instead of platform tabs. One Generate fills both from the same idea + image. Each caption has its own Regenerate button. Content creation in one screen, no tab switching" },
      { type: "added", text: "Multi-image posts — upload up to 4 images per post (Typefully cap). Drag in multiple at once, remove individually, all uploaded to Typefully on schedule" },
      { type: "fixed", text: "Typefully scheduler creating 3-4 duplicate drafts per post — the retry-on-failure loop was firing again even when the original request had actually succeeded. Removed retries; now one attempt per draft" },
      { type: "added", text: "Bulk upload — drop up to 50 images and the calendar auto-creates one draft post per image, spread across days with content types rotated so you don't cluster the same kind back-to-back. Pick start date, posts per day (1-3), skip weekends. Captions stay empty so you can fill them in after. Massively faster content creation" },
      { type: "added", text: "New 'Saved' post status (blue) — sits between Draft and Scheduled. Saving a post with a caption now marks it Saved (ready to schedule) instead of Draft, so it's protected from cleanup and won't be wiped by bulk upload, draft refresh, or any other operation that touches drafts" },
      { type: "fixed", text: "Typefully scheduling now only marks posts as Scheduled if EVERY targeted platform draft succeeded. Partial failures stay Saved so you can retry without double-scheduling the platforms that already worked. Plus a hard guard against double-firing the schedule button" },
      { type: "fixed", text: "Bulk upload now respects existing posts on each date — won't overwrite or stack onto saved/scheduled slots. Skips past full days automatically" },
      { type: "improved", text: "Caption + article voice rewritten to Dylan TOV v3 — tighter register ('someone explaining something at a desk, not presenting on a stage'), stronger 'write forwards not backwards' rule, Baymard/Shopify as the only allowed cited sources, and a 10-point self-check before every output. Same prompt across captions and articles so voice stays consistent" },
      { type: "removed", text: "Uploaded voice profile no longer overrides the base TOV. TOV v3 is now hardcoded as the single source of truth for captions — edit the prompt file directly to change voice" },
    ],
  },
  {
    id: "cl-27",
    date: "6 Apr 2026",
    version: "0.22.0",
    title: "Content Studio Redesign",
    changes: [
      { type: "improved", text: "Redesigned post studio — single unified editor replaces 5-step wizard. Platforms, idea, format, captions, image, and schedule all on one page" },
      { type: "added", text: "Caption length control — choose Short, Medium, or Long before generating. Long captions now produce real thought-leadership posts with frameworks and examples" },
      { type: "added", text: "Multi-platform posts — tick X and LinkedIn on the same post, get tailored captions for each, schedule both in one click" },
      { type: "improved", text: "Caption generation quality — improved AI prompt with deeper instructions for each length level and platform-specific guidance" },
      { type: "fixed", text: "Typefully timezone — posts now schedule at the correct local time instead of 1 hour late (BST/UTC conversion fix)" },
      { type: "improved", text: "Simplified status — only Draft and Scheduled. Sending to Typefully auto-sets to Scheduled" },
      { type: "removed", text: "Removed Instagram and TikTok from content calendar — focused on X and LinkedIn for now" },
      { type: "added", text: "Voice profile system — per-creator tone, avoid list, writing rules, example posts, and voice notes that feed directly into caption generation" },
      { type: "added", text: "Self-improving captions — when you edit a generated caption before saving, the before/after is tracked and fed into future generations so the AI learns your style" },
      { type: "fixed", text: "Calendar grid now fills the full viewport height — no more grey dead space below the week/month grid" },
      { type: "fixed", text: "Typefully now sends correct per-platform captions instead of duplicating one caption to both X and LinkedIn" },
      { type: "fixed", text: "Images now upload to Typefully correctly — pasted screenshots auto-set format to image, and upload runs regardless of post format" },
      { type: "fixed", text: "Typefully now creates separate drafts per platform — guarantees X and LinkedIn each get their own caption and image instead of one shared draft" },
      { type: "fixed", text: "Typefully image uploads now work — correct API field names, server-side S3 upload, and media processing wait before attaching to drafts" },
      { type: "added", text: "Audit lead magnet landing page at /audit — public page with form that auto-creates pipeline entries with source attribution" },
      { type: "added", text: "UTM/ref tracking on lead magnet pages — ?ref=x-dylan-bio tags the lead source automatically" },
      { type: "improved", text: "Agency Funnels renamed to Funnels in sidebar" },
    ],
  },
  {
    id: "cl-26",
    date: "6 Apr 2026",
    version: "0.21.1",
    title: "Screenshot Paste & Scheduling Accuracy",
    changes: [
      { type: "added", text: "Paste screenshots directly into post drafts — Cmd+V anywhere in the studio panel drops the image in and auto-generates captions" },
      { type: "improved", text: "Post scheduling now uses natural minute values (e.g. 08:23, 12:36, 17:08) based on analytics instead of rounding to the hour" },
      { type: "added", text: "Auto-adapt captions across platforms — write for X, click the LinkedIn tab and it auto-generates a LinkedIn version. Cached per tab so edits are preserved when switching" },
      { type: "fixed", text: "Typefully scheduling now uploads images and sends them with the draft — previously only the caption text was sent" },
      { type: "fixed", text: "Calendar timezone bug — dates were off by one day in BST/non-UTC timezones due to toISOString() conversion" },
    ],
  },
  {
    id: "cl-25",
    date: "5 Apr 2026",
    version: "0.21.0",
    title: "Slack Notification Engine & Payment Automation",
    changes: [
      { type: "added", text: "Payment webhook now creates a draft portal and posts an approval message to #ops with 'Approve & Send to Client' button — no more manual channel creation on payment" },
      { type: "added", text: "Portal approval loop — PM reviews draft portal in Launchpad, clicks approve in Slack, bot posts portal link to client's external channel" },
      { type: "improved", text: "QA gate notifications now include a 'View in Portal' link pointing to the specific client portal" },
      { type: "added", text: "Deadline warning cron — daily check posts to internal Slack channels when a phase is due in 2 days or overdue" },
      { type: "added", text: "Monday Breakdown — weekly #ops digest with deadlines, blockers, retainer mission statement status, and active project counts" },
      { type: "added", text: "Friday Digest — end-of-week #ops summary with completed phases, in-progress work, blockers, overdue items, and retainer report upload status" },
      { type: "added", text: "Notification settings panel in Business Settings — toggle each Slack notification on/off with a clean switch UI" },
      { type: "improved", text: "All automated Slack messages now use the Ecomlanders bot token instead of personal account — branded, consistent identity" },
      { type: "improved", text: "Sales Engine dashboard redesigned — pipeline overview, active clients, content this week, follow-up tracker, and quick actions replace old social analytics view" },
    ],
  },
  {
    id: "cl-24",
    date: "5 Apr 2026",
    version: "0.20.0",
    title: "Portal Process Wiring — Phases, Handoff & Task Sync",
    changes: [
      { type: "improved", text: "Phase movement now properly gated — only one phase in-progress at a time, must complete previous before advancing, completing a phase auto-starts the next" },
      { type: "improved", text: "Phase dots show disabled state with tooltip when transition is blocked (e.g. 'Complete the previous phase first')" },
      { type: "improved", text: "Design & Dev Handoff completely redesigned — clean version timeline with Figma + Staging links (no iframes), inline status toggles, version notes, and feedback history per version" },
      { type: "added", text: "Typed scope items (deliverables) auto-populate to the task board — design items go to Design Tasks, everything else to Dev Tasks" },
      { type: "added", text: "Task board tasks now link back to portal via portalId and deliverableId fields" },
      { type: "improved", text: "Client Details panel restyled — consistent input fields, clean tag chips with remove buttons, proper focus states, and unified spacing across Designers, Developers, Slack channels, and Touchpoint fields" },
      { type: "added", text: "Content Calendar PIN gate — personal PINs for Dylan and Ajay, auto-sets creator on unlock, numpad UI with shake animation on wrong code, lock button to switch users" },
      { type: "added", text: "Typefully integration — 'Schedule to Typefully' button on the calendar toolbar pushes the entire week's posts to Typefully in one click, with batch scheduling, auto-status update, and success toast" },
      { type: "improved", text: "Context cleaner moved to client-level 'Context' tab (between Projects and Settings) — paste transcripts from any call, clean with AI, choose which project to save to or keep as general client context, all entries aggregated in one view" },
      { type: "improved", text: "Portal team view restructured — merged Timeline + Deliverables into 'Scope & Timeline', merged Designs + Development into 'Build' with version history for both, renamed Internal to 'Handover' showing all 3 QA gates vertically without role picker" },
      { type: "added", text: "Team members can upload new design versions (with Figma URL) and development versions (with Staging URL) directly from the Build tab — auto-creates or appends to existing reviews" },
      { type: "improved", text: "QA gate labels simplified — 'CRO Design', 'Design Handoff', 'Dev to Senior Dev QA'; all gates always accessible without prerequisite locks" },
    ],
  },
  {
    id: "cl-23",
    date: "5 Apr 2026",
    version: "0.19.2",
    title: "Weekly Draft Volume & Day-Grouped Review",
    changes: [
      { type: "improved", text: "Weekly Draft now generates 3-4 posts per day (21-28 total) evenly spread across all 7 days, with content types matched to their best-performing days and times" },
      { type: "improved", text: "Weekly Draft review drawer groups posts by day with headers, post counts, and per-day select/deselect toggles for faster review" },
      { type: "added", text: "Drag and drop posts between days on both month and week views — grab any card and drop it onto a different day" },
      { type: "added", text: "Delete posts directly from calendar cards — hover to reveal X button, no need to open the post first" },
      { type: "added", text: "Clear All button in header to wipe all posts at once (with confirmation)" },
      { type: "improved", text: "Redesigned post edit panel — platform tabs always at top, clean caption area, inline settings rows (Format / Type / Schedule / Status) with consistent styling and dividers" },
      { type: "added", text: "Suggested posting times — when editing a post, analytics-based time suggestions appear below the schedule picker showing best times for that platform + day, click to apply" },
      { type: "fixed", text: "Clicking calendar post cards now reliably opens the edit view instead of sometimes triggering the new post wizard" },
      { type: "improved", text: "Idea-first content flow — posts show the angle/idea at the top, hit Generate Caption to create variants from it, pick one, then edit. No caption shown until you generate one" },
      { type: "improved", text: "Weekly Draft now generates at least 3 article posts per week for authority building" },
      { type: "added", text: "Ajay/Dylan creator toggle — prominent switcher with avatar initials in the header, filters the entire calendar by person" },
      { type: "fixed", text: "Posts without a creator field (from previous sessions) now auto-migrate to Ajay on load, preventing ghost posts appearing on reload" },
      { type: "fixed", text: "Weekly Draft now replaces existing drafts for that week instead of stacking — no more 500 accumulated draft posts on reload" },
      { type: "fixed", text: "Weekly Draft hard-capped to exactly 3 posts per day (21 total) — server-side enforcement so AI can never exceed the limit" },
      { type: "fixed", text: "saveAll store layer now deletes removed rows from Supabase — previously only upserted, causing deleted posts to reappear on reload" },
      { type: "fixed", text: "Load-time cleanup caps drafts to 3 per day per creator and permanently removes excess from Supabase" },
      { type: "fixed", text: "Changelog now always reflects latest code entries — seed data in code overrides stale Supabase entries so version stays current" },
      { type: "improved", text: "Premium page transitions — staggered fade-in-up animations on page load across dashboard, calendar, and sales engine with backdrop fades on slide-in panels" },
    ],
  },
  {
    id: "cl-22",
    date: "4 Apr 2026",
    version: "0.19.1",
    title: "Unified Sidebar Navigation",
    changes: [
      { type: "improved", text: "Portal list page — left sidebar navigation replaces horizontal tabs (Overview, Retainers, Testing, Tickets, Delivery, Clients), with Trash + New Portal buttons in sidebar footer" },
      { type: "improved", text: "Admin client detail page — left sidebar with Projects, Tickets, Funnels, Settings tabs; action buttons (Flag, Client, Team, Preview, Save) moved to sidebar footer" },
      { type: "improved", text: "Client portal — sidebar nav now persists when drilled into a project (Back + project name + nav links) instead of horizontal top tabs" },
      { type: "improved", text: "Consistent left sidebar navigation pattern across all portal views — portal list, client detail, drilled-in project, and client-facing portal" },
      { type: "improved", text: "Portal list sidebar cleaned up — tabs now: Overview, Client Portals, Retainer Portals, Testing Lab, Tickets. Removed Delivery tab. New Portal button moved to top of sidebar" },
      { type: "improved", text: "Action buttons (Flag, Client, Team, Preview, Save) moved to top header bar with divider — Flag red, Client/Team/Preview black, Save green" },
      { type: "improved", text: "Client Settings (team, Slack, designers, devs) removed from project drilled-in sidebar — lives only at client level under Settings tab" },
      { type: "added", text: "Content Calendar — weekly grid (6am-8pm time slots x 7 days) and month overview for planning social content across LinkedIn, Instagram, and X" },
      { type: "added", text: "Caption Studio — slide-in panel with platform/type selectors, date/time picker, AI caption generation (3 variants via Claude), slot scoring, and status workflow" },
      { type: "added", text: "Idea Engine — AI-powered content idea generator that considers current content mix, posting gaps, and platform neglect to suggest 5 actionable ideas" },
      { type: "added", text: "Content analytics layer — optimal slot indicators (green dots), gap detection (3+ day warnings), platform neglect alerts, content mix bar with promotional threshold warning" },
      { type: "added", text: "Pipeline sidebar — toggle to view all posts grouped by status (Idea → Scripted → Media Ready → Approved → Exported)" },
      { type: "added", text: "Insights bar — 4 metric cards: Posts this week, Best performing day, Top content type, Gap alert" },
      { type: "improved", text: "Content Calendar redesigned — clean Untitled UI-inspired month view as default with event cards inside day cells, header bar with date badge, Today button, Month/Week toggle, and Add post button" },
      { type: "added", text: "Post format selector — Text, Image, Article, Video post types with format icons on calendar event cards" },
      { type: "added", text: "Image upload in Caption Studio — drag-and-drop or click to upload, image preview with replace/remove, AI captions generated based on the uploaded image via Claude vision" },
      { type: "added", text: "Weekly Draft generator — AI analyses past performance (top content types, platforms, days, engagement scores) and generates 7-10 optimised draft posts for the current week, placed at optimal time slots with full captions ready to edit" },
      { type: "added", text: "Content repurposing — write once on X, hit Repurpose to auto-generate LinkedIn (longer, professional), Instagram (image caption), and TikTok (video hook/script) variants linked together as a content group" },
      { type: "added", text: "Platform tabs in Caption Studio — linked posts show tabs to switch between platform variants, each with independent status tracking" },
      { type: "added", text: "TikTok added as a platform — video-first format with hook-style caption generation" },
      { type: "improved", text: "Calendar event cards show link icon for repurposed content groups" },
      { type: "improved", text: "Image upload auto-generates captions — drop an image and AI writes captions based on it immediately, no extra button click" },
      { type: "improved", text: "All new posts default to X (Twitter) first — write the sharpest take, then repurpose outward" },
      { type: "improved", text: "Weekly Draft now generates ideas/angles at optimal slots, not full captions — click through each to write content and repurpose" },
      { type: "improved", text: "Caption Studio is now a step-by-step flow — Format → Content Type → Media → Caption → Schedule — one choice at a time, no option overload" },
      { type: "improved", text: "Calendar cards colour-coded by status — grey for ideas/drafts, blue for scripted, purple for media ready, green for approved/exported" },
    ],
  },
  {
    id: "cl-21",
    date: "3 Apr 2026",
    version: "0.19.0",
    title: "QA Gates, Deadline Buffer & Sales Context Cleaning",
    changes: [
      { type: "improved", text: "QA gates now open as full popup forms instead of inline checklists — cleaner submit flow for designers and devs" },
      { type: "added", text: "Three-column gate status overview — CRO Brief, Design Handoff, Dev QA shown at a glance on each project card (green = submitted)" },
      { type: "added", text: "Slack notification on gate submit — posts to internal Slack channel notifying the next person to pick up work" },
      { type: "added", text: "Dual Slack channels per portal — separate Internal (team) and External (client) channel IDs in client details panel" },
      { type: "added", text: "Gate status pills on project list cards — quick visual indicator of handoff progress without opening a project" },
      { type: "added", text: "Deadline Buffer setting — adds configurable extra business days to all client-facing deadlines (default 3 days, under-promise/over-deliver)" },
      { type: "improved", text: "Context cleaning AI now strips all pricing/costs and focuses on actionable deliverables with a Key Deliverables summary section" },
      { type: "improved", text: "Design handoff is now a proper form — Figma link, Loom walkthrough (required), extra assets, font files, plus confirmation checkboxes" },
      { type: "improved", text: "Portal admin layout — sidebar nav when drilled into a project with compact team/Slack/touchpoint details, content area no longer pushed down" },
      { type: "improved", text: "Portal tabs simplified from 8 to 3 — Overview (QA gates + phases + context), Build (Updates + Designs + Dev), Results (Testing + Funnels + Reports)" },
      { type: "improved", text: "Header action bar — Save (green), Client link, Team link, Preview, Flag Blocked all as consistent black/green buttons at top" },
      { type: "improved", text: "Overview redesign — touchpoint card (dark, editable), status card side-by-side, timeline-style phases with dot indicators, cleaner scope list" },
      { type: "improved", text: "Sidebar renamed from 'Team' to 'Client Settings' — team, Slack channels, touchpoint info grouped as client config" },
      { type: "added", text: "Blocker system with timeline shift — flag blocker (modal with type/reason), auto-snapshot phase dates, resolve with adjustable business-day shift, full timeline preview before confirming" },
      { type: "added", text: "Blocker history — resolved blockers logged with days lost, original vs adjusted dates shown on timeline, '+Xd adjusted' badge on timeline header" },
      { type: "improved", text: "Client portal shows diplomatic 'Timeline adjusted' notice when dates shift — no blame language, just 'dates updated to reflect latest schedule'" },
      { type: "improved", text: "Admin portal restyled to match client portal — unified border colours (#E8E8E8), removed shadows, section headers no longer uppercase, consistent card rounding and hover states" },
      { type: "improved", text: "Client portal — sidebar nav now persists when drilled into a project (Back + project name + nav links), matching admin portal style for cohesive navigation" },
    ],
  },
  {
    id: "cl-20",
    date: "31 Mar 2026",
    version: "0.18.0",
    title: "Funnel Builder — Execution System Upgrade",
    changes: [
      { type: "added", text: "Lead Magnet node type — format (PDF/video/tool/quiz), opt-in CVR, content slots" },
      { type: "added", text: "Email Sequence node type — email count, open rate, click rate metrics" },
      { type: "added", text: "Funnel stage tagging (TOFU/MOFU/BOFU) on every node type with visual badges" },
      { type: "added", text: "Content slots per page/lead magnet node — 5-item checklist (headline, hook, offer, CTA, social proof) with completion badge" },
      { type: "added", text: "Funnel health score (0-100) — weighted from live status (40%), CVR vs benchmarks (40%), content completion (20%)" },
      { type: "added", text: "Cold Traffic Lead Gen template — paid ad → VSL → lead magnet → email sequence → discovery call" },
      { type: "added", text: "Warm Retargeting template — retargeting ad → case study → offer → application" },
      { type: "added", text: "Content Engine template — organic → blog → lead magnet → email sequence → offer" },
      { type: "improved", text: "Node palette now has Lead Gen section with Lead Magnet and Email Sequence drag items" },
      { type: "improved", text: "Node editor includes stage selector, content checklist, and lead magnet/email sequence specific fields" },
    ],
  },
  {
    id: "cl-19",
    date: "30 Mar 2026",
    version: "0.17.0",
    title: "Weekly Report Upload & Branded Client Display",
    changes: [
      { type: "added", text: "Report upload tool — upload .docx files, auto-extract content, preview with EcomLanders branding before publishing" },
      { type: "added", text: "Reports tab in admin portal — manage, preview, publish/unpublish, and delete reports per client" },
      { type: "added", text: "Reports tab in client portal — timeline of published reports with branded read view" },
      { type: "added", text: "Branded report renderer — shared component with EcomLanders header, typography, and footer" },
      { type: "added", text: "Client-side .docx extraction via mammoth.js (dynamic import, no client bundle impact)" },
    ],
  },
  {
    id: "cl-18",
    date: "23 Mar 2026",
    version: "0.16.1",
    title: "Funnel Playbook — CRO Knowledge Base",
    changes: [
      { type: "added", text: "Funnel Playbook — complete 10-layer DTC sales funnel knowledge base under CRO Lab" },
      { type: "added", text: "14 deep-dive modules covering traffic, ad creative, landing pages, PDP, cart, checkout, post-purchase, retention, offers, and analytics" },
      { type: "added", text: "Audit Mode — filters any module to show only audit questions for rapid client store reviews" },
      { type: "added", text: "Test Ideas Mode — filters to show ICE-scored A/B test hypotheses per funnel layer" },
      { type: "added", text: "In-module search with real-time results" },
      { type: "added", text: "Master Audit Checklist (130+ scored questions), Test Hypothesis Bank (90+ ideas), and CRO Glossary as reference docs" },
    ],
  },
  {
    id: "cl-17",
    date: "22 Mar 2026",
    version: "0.16.0",
    title: "Social Analytics, Pipeline Kanban & Sales Engine Restructure",
    changes: [
      { type: "added", text: "Social Analytics dashboard — 90-day tweet data with weekly performance charts (views/engagement/likes/posts)" },
      { type: "added", text: "AI Content Intelligence — analyses tweets to identify top themes, hook patterns, content gaps, and post ideas" },
      { type: "added", text: "X/Twitter direct API integration — profile stats, tweet metrics, Supabase caching (6hr TTL)" },
      { type: "added", text: "Top Hooks ranking — best performing opening lines by engagement rate" },
      { type: "added", text: "Best posting days + hours analysis with visual bar chart" },
      { type: "added", text: "Kanban Pipeline — drag leads across stages (New → Audit Sent → Engaged → Call Booked → Proposal → Won/Lost)" },
      { type: "added", text: "Audit-to-pipeline connection — Run Audit button on leads, auto-link audit to lead" },
      { type: "added", text: "CRO audit speed benchmarks — each metric shows goal with pass/warn/fail color coding" },
      { type: "added", text: "Editable audit detail page — inline editing for all fields (summary, scorecard, issues, priorities)" },
      { type: "improved", text: "Sales Engine restructured: Social Analytics hero nav, Content/Pipeline/Revenue sections" },
      { type: "improved", text: "Pipeline stages updated: New Lead → Audit Sent → Engaged → Call Booked → Proposal Sent → Won/Lost" },
      { type: "improved", text: "Launchpad sidebar: Project Kickoff hero CTA, Portals + Tickets as main nav links" },
      { type: "improved", text: "Mobile layout fixes across both dashboards — responsive headers, scrollable tables" },
      { type: "improved", text: "Speed data separated from CRO issues in audits — own dedicated section" },
      { type: "fixed", text: "Audit page type detection — no more 'this is a PDP not a homepage' false flags" },
      { type: "fixed", text: "Sales Engine 404s — all tools properly mapped to /sales-engine/ routes" },
    ],
  },
  {
    id: "cl-16",
    date: "22 Mar 2026",
    version: "0.15.0",
    title: "CRO Audit Engine & Client Portal Polish",
    changes: [
      { type: "added", text: "CRO Audit Engine: enter a URL → Firecrawl scrapes → Claude generates comprehensive audit" },
      { type: "added", text: "Interactive audit reports: public branded URLs at /audit/[token] with scorecard, issues, priority order" },
      { type: "added", text: "WhatsApp + Book a Call CTAs on public audit pages" },
      { type: "added", text: "Audit knowledge base: editable CRO framework in Settings, fed into every audit" },
      { type: "added", text: "Audit dashboard in Sales Engine: generate, review, publish, track views" },
      { type: "added", text: "Full-page screenshots via Firecrawl for audit analysis" },
      { type: "improved", text: "Client portal: bordered project cards with View CTA button" },
      { type: "improved", text: "Client portal: tabs replace sidebar when drilled into a project" },
      { type: "improved", text: "Admin portal: inline editable client details (designers, developers, Slack, touchpoint)" },
      { type: "improved", text: "Auto-calculated touchpoints from configurable days (Mon/Wed/Fri default)" },
      { type: "improved", text: "Admin portal overview: ticket panels, minimal client list, touchpoints grid" },
      { type: "improved", text: "Ticket save reliability: direct Supabase upsert" },
      { type: "fixed", text: "Ticket type persisting to Supabase on triage" },
      { type: "fixed", text: "Team member ID orphan cleanup" },
    ],
  },
  {
    id: "cl-15",
    date: "22 Mar 2026",
    version: "0.14.0",
    title: "Portal Dashboard Revamp, Slack Tickets & Auto Touchpoints",
    changes: [
      { type: "added", text: "Admin portal dashboard: 5 tabs (Overview, Testing, Tickets, Delivery, Clients)" },
      { type: "added", text: "Slack /ticket command: clients log issues via Slack modal with title, description, priority, attachments" },
      { type: "added", text: "Ticket triage flow: set design/dev type → auto-creates ClickUp task with correct assignees" },
      { type: "added", text: "Tickets tab: full table view with client, type, priority, age columns" },
      { type: "added", text: "Delivery tab: blocked clients, phase progress bars, clients by stage" },
      { type: "added", text: "Team directory in Settings: Slack IDs, ClickUp IDs, role-based assignment" },
      { type: "added", text: "Auto-calculated touchpoints: configurable Mon/Wed/Fri in Settings, no manual date entry" },
      { type: "added", text: "Copy Checker: rebuilt as flag-based system (red flags, warnings, passing) instead of subjective scoring" },
      { type: "added", text: "Business Settings: touchpoint days toggle alongside working days" },
      { type: "improved", text: "Admin portal detail: client details as vertical editable list (designers, developers, Slack, touchpoint)" },
      { type: "improved", text: "Portal creation: two-step Retainer vs Project selection with tailored fields" },
      { type: "improved", text: "Overview: minimal client list with dividers, 3-column touchpoints, ticket count panels" },
      { type: "improved", text: "Ticket save: direct Supabase upsert for reliability" },
      { type: "improved", text: "Copy Link and Preview as proper CTA buttons" },
      { type: "fixed", text: "Ticket type persists to Supabase on triage" },
      { type: "fixed", text: "Team member ID orphan auto-cleanup" },
      { type: "fixed", text: "Settings save to Supabase (was only saving to localStorage)" },
    ],
  },
  {
    id: "cl-14",
    date: "21 Mar 2026",
    version: "0.13.0",
    title: "Sales Engine — Separate Growth Dashboard",
    changes: [
      { type: "added", text: "Sales Engine: new dashboard at /sales-engine with own sidebar and layout" },
      { type: "added", text: "App switcher in both sidebars to toggle between Launchpad and Sales Engine" },
      { type: "added", text: "Pipeline CRM: Kanban board with drag-and-drop deal management (lead → won)" },
      { type: "added", text: "Content Calendar: plan, draft, schedule content with board view and account filtering (Dylan/Ajay)" },
      { type: "added", text: "Migrated tools: Content Engine, Hooks, Repurpose, Leads, Outreach, Revenue, Audit Engine, Portfolio, Price Lists" },
      { type: "added", text: "Command Centre dashboard with pipeline value, content stats, follow-up tracking" },
      { type: "added", text: "Deal form with stage, value, owner, source, follow-up date, notes" },
      { type: "added", text: "Content form with platform, account, funnel stage, schedule date, body editor" },
    ],
  },
  {
    id: "cl-13",
    date: "20 Mar 2026",
    version: "0.12.0",
    title: "Retainer vs Project Portal Modes",
    changes: [
      { type: "added", text: "Two portal modes: Retainer Client (weekly test cycle) and Project Client (linear page build)" },
      { type: "added", text: "New portal creation flow — two-card selection for client type with tailored fields" },
      { type: "added", text: "Retainer creation includes testing tier (T1/T2/T3) and optional Intelligems API key" },
      { type: "added", text: "client_type field on PortalData — drives entire portal UX (retainer vs regular)" },
      { type: "added", text: "Auto-migration for existing portals — detects retainer from project_type" },
      { type: "improved", text: "Admin portal default tab is Testing for retainer clients, Overview for project clients" },
      { type: "improved", text: "Tab order adapts to client type — Testing first for retainers" },
      { type: "improved", text: "Client portal sidebar adapts — retainers see Testing instead of Timeline" },
      { type: "improved", text: "Portal cards show Retainer/Project badge with client type" },
      { type: "fixed", text: "Changelog entries now auto-merge from seed data into localStorage" },
    ],
  },
  {
    id: "cl-12",
    date: "20 Mar 2026",
    version: "0.11.0",
    title: "Multi-Project Portals & Client Evolution",
    changes: [
      { type: "added", text: "Multi-project per client — one portal holds all work (page builds, retainers, audits)" },
      { type: "added", text: "PortalProject type with per-project phases, scope, deliverables, documents" },
      { type: "added", text: "Project selector pills in admin portal — switch between projects for the same client" },
      { type: "added", text: "Add Project modal — create page builds or retainers within an existing portal" },
      { type: "added", text: "Retainer view — weekly test cadence with tier selector (replaces linear timeline)" },
      { type: "added", text: "Client portal project selector — clients with 2+ projects can switch between them" },
      { type: "added", text: "Funnels tab in admin portal — view/create funnels linked to client" },
      { type: "added", text: "Funnels tab in client portal — read-only view of funnel nodes" },
      { type: "added", text: "Auto-migration — legacy single-project portals automatically get projects[0] on load" },
      { type: "improved", text: "Testing tab dashboard redesign — card layout with big RPV lift numbers instead of dense table" },
      { type: "improved", text: "Results summary — winners/underperformed/inconclusive as big number cards" },
      { type: "improved", text: "Client dashboard adapts per project type (retainer shows test stats, build shows progress)" },
    ],
  },
  {
    id: "cl-11",
    date: "19 Mar 2026",
    version: "0.10.0",
    title: "Intelligems Integration & Portal Improvements",
    changes: [
      { type: "added", text: "Intelligems API integration — auto-pulls live A/B test data (CVR, AOV, RPV, visitors, orders, revenue) per client" },
      { type: "added", text: "API proxy route for secure Intelligems data fetching from client portals" },
      { type: "added", text: "Intelligems API key field per portal in admin Testing tab" },
      { type: "added", text: "Live test cards with variation metrics table, lift indicators, and baseline comparisons" },
      { type: "added", text: "Portal soft-delete with trash bin — deleted portals recoverable for 30 days" },
      { type: "added", text: "Two-step delete confirmation on portal cards" },
      { type: "added", text: "Designs tab always visible in client portal with placeholder state" },
      { type: "improved", text: "Development tab — page reviews with staging URLs, version tracking, and inline feedback" },
      { type: "improved", text: "Scope tab shows deliverable type alongside description" },
      { type: "added", text: "Intelligems cherry-pick — select which tests are yours, only selected show in client portal" },
      { type: "improved", text: "Client Development tab — clean version-controlled staging links with Review Page buttons, no iframe" },
      { type: "fixed", text: "Page reviews not appearing after creation — activeReviewId sync issue" },
      { type: "fixed", text: "Deleted portals reappearing — now uses Supabase soft-delete with deleted_at column" },
      { type: "added", text: "Page Copy Audit tool — paste brief + screenshots, AI analyses copy section by section against DTC framework with VOC research" },
      { type: "added", text: "DTC Copywriting Guide training data — 7-part framework covering mindset, tone, page architecture, trust building, advanced techniques" },
      { type: "added", text: "Figma API + Claude Vision integration for reading page designs" },
      { type: "added", text: "VOC scraping — Trustpilot + Reddit research with brief-aware product filtering" },
      { type: "added", text: "Clipboard paste support (Cmd+V) for screenshots in copy audit" },
      { type: "improved", text: "Copy audit output is suggestive not prescriptive — explains why copy is weak and gives directional guidance" },
      { type: "improved", text: "Brief-first workflow — must lock brief before analysing, AI respects multi-angle vs single-angle briefs" },
      { type: "improved", text: "Team Hub promoted to top-level nav below Mission Control" },
      { type: "improved", text: "Admin Development tab simplified to clean version control (no iframe/pin viewer)" },
      { type: "added", text: "Business Settings page — configurable deliverable turnaround times, revision/support durations, working days" },
      { type: "added", text: "Centralised date helpers in src/lib/dates.ts — all tools now share addBusinessDays with configurable working days" },
      { type: "improved", text: "Sidebar version bumped to v0.10" },
      { type: "improved", text: "Copy Checker rebuild — replaced subjective 1-10 scoring with flag-based system (red flags, warnings, passing)" },
      { type: "added", text: "Banned phrase detection — hardcoded list of weak DTC phrases auto-flagged as red flags" },
      { type: "added", text: "Structural checklists per section type — Hero, Benefits, Trust, CTA, FAQ" },
      { type: "added", text: "VOC gaps panel — shows customer language not used on the page" },
      { type: "improved", text: "Chat refocused as senior CRO advisor for nuanced creative guidance" },
      { type: "fixed", text: "Design review V1 auto-loads after creation (no more create V1 prompt)" },
      { type: "fixed", text: "Intelligems now fetches ALL tests in parallel batches (was capped/sequential)" },
      { type: "removed", text: "Wins tab removed from client portal" },
      { type: "added", text: "Phase dates editable via date pickers in admin portal" },
      { type: "added", text: "startDate/endDate fields on PortalPhase type" },
    ],
  },
  {
    id: "cl-10",
    date: "18 Mar 2026",
    version: "0.9.0",
    title: "Funnel Builder, Business Settings & Full Supabase Migration",
    changes: [
      { type: "added", text: "Visual Funnel Builder — drag-and-drop e-commerce funnel mapping with React Flow canvas, custom traffic/page nodes, arrow connections" },
      { type: "added", text: "4 funnel templates — Standard DTC, Quiz Funnel, Advertorial, Organic Content" },
      { type: "added", text: "Funnel performance mode — overlay traffic, CVR, AOV, drop-off metrics on each node with colour-coded indicators" },
      { type: "added", text: "Traffic warmth selector — tag traffic sources as Cold/Warm/Hot with colour badges" },
      { type: "added", text: "Ad preview + page URL links on funnel nodes — clickable links to view ad creatives or live pages" },
      { type: "added", text: "Undo/redo in Funnel Builder — Cmd+Z / Cmd+Shift+Z with 50-level history" },
      { type: "added", text: "PNG export for funnels" },
      { type: "added", text: "Business Settings page — configurable deliverable turnaround times, revision/support phase durations, working day toggles" },
      { type: "added", text: "Centralised date helpers — all date formatting and business day logic in one module" },
      { type: "improved", text: "Full Supabase migration — all data layers now persist to Supabase with localStorage fallback (prospects, roadmap, portfolio, settings, pulse, content DB, feedback, outreach, funnels)" },
      { type: "improved", text: "Generic supabase-store helper for consistent data persistence pattern" },
      { type: "improved", text: "Funnel node cards restyled — more spacious, separated header bar, hover shadows, pill-style preview links" },
      { type: "improved", text: "Ecomlanders logomark favicon" },
    ],
  },
  {
    id: "cl-9",
    date: "18 Mar 2026",
    version: "0.8.1",
    title: "Project Kickoff → Portal Pipeline & Data Persistence",
    changes: [
      { type: "added", text: "Project Kickoff now creates a client portal — one-click 'Create Client Portal' button auto-populates phases, scope, documents, and touchpoints from the kickoff form" },
      { type: "added", text: "CRO test results — A/B testing with week-based grouping, CVR/AOV/RPV snapshots with % lift indicators, Figma design preview popups" },
      { type: "improved", text: "Current phase synced with timeline — admin uses dropdown selector from phases, auto-updates when phase status changes" },
      { type: "improved", text: "Client portal timeline — complete phase tags now green, online/offline indicator green/red" },
      { type: "improved", text: "Touchpoint date format — shows '19 Mar' instead of ISO dates" },
      { type: "fixed", text: "Supabase data persistence — added missing wins, testing_tier, blocker columns. Portals now persist across all browsers and devices" },
      { type: "fixed", text: "localStorage-only portals now visible in portal list even when Supabase is configured" },
      { type: "removed", text: "Removed 'What You're Getting' scope box from client dashboard" },
      { type: "improved", text: "Renamed 'Project Documents' to 'Project Kickoff' in sidebar" },
    ],
  },
  {
    id: "cl-8",
    date: "18 Mar 2026",
    version: "0.8.0",
    title: "Client Portal Overhaul",
    changes: [
      { type: "improved", text: "Portal overview redesigned — removed stat cards, added Client Portal pre-header, submit request button, deliverables list, and documents section" },
      { type: "improved", text: "Sidebar simplified — removed avatar icon, just shows client name" },
      { type: "improved", text: "Updates tab — 2-column grid layout with video icon for Loom updates" },
      { type: "improved", text: "Scope tab — now shows deliverables with status indicators" },
      { type: "improved", text: "Requests — inline form replaced with popup modal" },
      { type: "improved", text: "Documents — type text labels replaced with icons, preview in popup, downloadable" },
      { type: "improved", text: "Designs — Figma preview with 'Review & Comment in Figma' overlay link" },
      { type: "improved", text: "Reduced corner radius and switched card backgrounds from grey to white" },
      { type: "improved", text: "Portal overview — 'What You're Getting' shows scope items instead of phase-grouped deliverables" },
      { type: "added", text: "Project blocker flags — mark projects as blocked (client/internal/external) with reason and timestamp on admin dashboard" },
      { type: "added", text: "CRO testing section — testing tiers (T1/T2/T3), tests by status (scheduled/live/complete), result tracking with CVR/AOV/RPV snapshots, Figma design previews" },
      { type: "added", text: "Development nav section placeholder" },
      { type: "added", text: "Next Touchpoint card on portal overview" },
    ],
  },
  {
    id: "cl-7",
    date: "17 Mar 2026",
    version: "0.7.0",
    title: "Design System Overhaul & Nav Restructure",
    changes: [
      { type: "improved", text: "De-blued entire UI — replaced all blue-tinted greys with pure neutral greys across 50+ files" },
      { type: "improved", text: "Sidebar restructured — icons on section headers only, cleaner indented sub-items" },
      { type: "improved", text: "Mission Control — removed Overdue section (redundant with Needs Attention), feed contained in scrollable box, Deadlines This Week shows day numbers and task counts" },
      { type: "improved", text: "Portfolio — all Figma embeds preloaded for instant tab switching" },
      { type: "improved", text: "Scrollbars — minimal 2px thin scrollbar globally" },
      { type: "improved", text: "Border radius tightened — rounded-xl to rounded-lg across tool pages" },
      { type: "improved", text: "Nav renamed — Lead Scraper, Audit Engine, Content Engine, Dev Hours Log, Invoice Generator, Project Documents, Client Portals" },
      { type: "removed", text: "Ops Radar removed from sidebar (data folded into Mission Control, page still accessible)" },
      { type: "removed", text: "Outreach removed from sidebar (will be merged into Lead Scraper)" },
    ],
  },
  {
    id: "cl-6",
    date: "17 Mar 2025",
    version: "0.6.0",
    title: "Voice Note Cleanup — All Phases",
    changes: [
      { type: "added", text: "Changelog page to track all Launchpad updates" },
      { type: "improved", text: "Mission Control — stats strip (Active Projects, Overdue Tasks, Open Issues, Ad Hoc Requests), Needs Attention section, and Important/All feed filter" },
      { type: "improved", text: "Ops Radar — compact week strip, severity-coded overdue section (expandable by client), color-coded team load bars" },
      { type: "improved", text: "Client Portal — Next Touchpoint card, deliverables grouped by phase, removed assignee input, QA/Dev Check launch buttons" },
      { type: "improved", text: "Content Analytics — visual card grid with performance heatmap, top performer highlights" },
      { type: "improved", text: "QA Checklist & Dev Self-Check — linked to client portals via dropdown, pre-fill support" },
      { type: "improved", text: "Sidebar — removed unfinished tools from nav, moved QA/Dev Check under Team Tools" },
      { type: "removed", text: "Funnel Planner, Content Repurposer, Hook Generator, Upsell Scanner hidden from sidebar (routes still exist)" },
    ],
  },
  {
    id: "cl-5",
    date: "14 Mar 2025",
    version: "0.5.0",
    title: "Issues Tracker & Portal Enhancements",
    changes: [
      { type: "added", text: "Issues tracker — centralised bug & issue reporting system" },
      { type: "added", text: "Ad Hoc Requests on client portals (renamed from Requests)" },
      { type: "improved", text: "Client Portal — Requests renamed to Ad Hoc, promoted in portal overview" },
      { type: "improved", text: "Ops Radar — team load split into Design / Dev / PM sections" },
    ],
  },
  {
    id: "cl-4",
    date: "10 Mar 2025",
    version: "0.4.0",
    title: "Content Analytics & Ops Radar",
    changes: [
      { type: "added", text: "Content Analytics — Twitter sync via TwitterAPI.io with AI categorisation" },
      { type: "added", text: "Ops Radar — ClickUp integration for task tracking" },
      { type: "added", text: "Team timezone clocks in sidebar footer" },
    ],
  },
  {
    id: "cl-3",
    date: "5 Mar 2025",
    version: "0.3.0",
    title: "Client Portal System",
    changes: [
      { type: "added", text: "Client Portal — create, manage, and share project portals" },
      { type: "added", text: "Portal public view with branded token-based URLs" },
      { type: "added", text: "Deliverables tracking with phase management" },
      { type: "added", text: "QA Checklist tool for pre-launch quality checks" },
      { type: "added", text: "Dev Self-Check tool for developer sign-off" },
    ],
  },
  {
    id: "cl-2",
    date: "28 Feb 2025",
    version: "0.2.0",
    title: "Finance & Strategy Tools",
    changes: [
      { type: "added", text: "Price Calculator with tier-based pricing" },
      { type: "added", text: "Dev Hours tracker" },
      { type: "added", text: "Invoice Generator" },
      { type: "added", text: "Proposals tool with AI-assisted generation" },
      { type: "added", text: "Project Setup / Kickoff wizard" },
      { type: "added", text: "Portfolio showcase page" },
    ],
  },
  {
    id: "cl-1",
    date: "20 Feb 2025",
    version: "0.1.0",
    title: "Initial Launch",
    changes: [
      { type: "added", text: "Launchpad dashboard with sidebar navigation" },
      { type: "added", text: "Mission Control home page with workflow lanes" },
      { type: "added", text: "Slack activity feed integration" },
    ],
  },
];

const seedRoadmap: RoadmapItem[] = [
  { id: "rm-1", title: "Approval Workflow", description: "Branded link → Figma → approve/revise → Slack notification. Full client approval flow.", priority: "next", addedAt: "2025-03-17" },
  { id: "rm-2", title: "Client Portal — Live Data", description: "Connect portal deliverables and phases to ClickUp tasks so status updates automatically.", priority: "next", addedAt: "2025-03-17" },
  { id: "rm-3", title: "Wins & Results Tabs", description: "Dedicated sections on client portals to showcase results, metrics, and case study data.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-4", title: "Funnel Planner", description: "Visual funnel builder for mapping out client acquisition and conversion flows.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-5", title: "Content Repurposer", description: "Take top-performing content and generate variations for different platforms.", priority: "planned", addedAt: "2025-03-17" },
  { id: "rm-6", title: "Hook Generator", description: "AI-powered hook and headline generator for ads, emails, and landing pages.", priority: "exploring", addedAt: "2025-03-17" },
  { id: "rm-7", title: "Upsell Scanner", description: "Analyse client accounts to surface upsell and cross-sell opportunities.", priority: "exploring", addedAt: "2025-03-17" },
  { id: "rm-8", title: "Portfolio Performance", description: "Speed and load time monitoring for portfolio sites.", priority: "exploring", addedAt: "2025-03-17" },
];

// ═══════════════════════════════════════════════════════════════════
// Roadmap store (data jsonb pattern)
// ═══════════════════════════════════════════════════════════════════

const roadmapStore = createStore<RoadmapItem>({
  table: "roadmap_items",
  lsKey: ROADMAP_KEY,
});

// ═══════════════════════════════════════════════════════════════════
// Row mappers
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChangelogRow(row: any): ChangelogEntry {
  return {
    id: row.id,
    date: row.date || "",
    version: row.version || "",
    title: row.title || "",
    changes: row.changes || [],
  };
}

// ── Local helpers ──

function ensureSeeded<T extends { id: string }>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    const stored = JSON.parse(raw) as T[];
    // Merge any new seed entries not already in localStorage
    const storedIds = new Set(stored.map((s) => s.id));
    const newEntries = seed.filter((s) => !storedIds.has(s.id));
    if (newEntries.length > 0) {
      const merged = [...newEntries, ...stored];
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
    return stored;
  } catch {
    return seed;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Changelog — Read
// ═══════════════════════════════════════════════════════════════════

export async function getChangelog(): Promise<ChangelogEntry[]> {
  // Seed data in code is always the source of truth for changelog.
  // Merge: seed entries win over Supabase for matching IDs (so code updates are reflected),
  // and any Supabase-only entries (user-created) are kept too.
  let dbEntries: ChangelogEntry[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) dbEntries = data.map(mapChangelogRow);
    } catch {
      /* fall through */
    }
  }

  // Build merged list: seed entries always override DB entries with same ID
  const seedIds = new Set(seedChangelog.map(s => s.id));
  const dbOnly = dbEntries.filter(e => !seedIds.has(e.id));
  const merged = [...seedChangelog, ...dbOnly];

  // Persist any new/updated seed entries to Supabase
  if (isSupabaseConfigured() && dbEntries.length > 0) {
    const dbMap = new Map(dbEntries.map(e => [e.id, e]));
    for (const entry of seedChangelog) {
      const existing = dbMap.get(entry.id);
      if (!existing) {
        // New seed entry — insert
        supabase.from("changelog").insert({
          id: entry.id, date: entry.date, version: entry.version,
          title: entry.title, changes: entry.changes,
          created_at: new Date().toISOString(),
        }).then(() => {});
      } else if (JSON.stringify(existing.changes) !== JSON.stringify(entry.changes)) {
        // Updated seed entry — update
        supabase.from("changelog").update({
          date: entry.date, version: entry.version,
          title: entry.title, changes: entry.changes,
        }).eq("id", entry.id).then(() => {});
      }
    }
  }

  return merged;
}

// ═══════════════════════════════════════════════════════════════════
// Changelog — Create
// ═══════════════════════════════════════════════════════════════════

export async function addChangelogEntry(
  entry: Omit<ChangelogEntry, "id">
): Promise<ChangelogEntry> {
  const id = `cl-${Date.now()}`;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .insert({
          id,
          date: entry.date,
          version: entry.version,
          title: entry.title,
          changes: entry.changes,
        })
        .select()
        .single();
      if (error) throw error;
      return mapChangelogRow(data);
    } catch {
      /* fall through */
    }
  }
  const entries = ensureSeeded(CHANGELOG_KEY, seedChangelog);
  const newEntry: ChangelogEntry = { ...entry, id };
  entries.unshift(newEntry);
  localStorage.setItem(CHANGELOG_KEY, JSON.stringify(entries));
  return newEntry;
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Read
// ═══════════════════════════════════════════════════════════════════

export async function getRoadmap(): Promise<RoadmapItem[]> {
  const items = await roadmapStore.getAll();
  if (items.length > 0) return items;
  // Seed if empty
  await roadmapStore.saveAll(seedRoadmap);
  return seedRoadmap;
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Create
// ═══════════════════════════════════════════════════════════════════

export async function addRoadmapItem(
  item: Omit<RoadmapItem, "id" | "addedAt">
): Promise<RoadmapItem> {
  const newItem: RoadmapItem = {
    ...item,
    id: `rm-${Date.now()}`,
    addedAt: new Date().toISOString().slice(0, 10),
  };
  return roadmapStore.create(newItem);
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteRoadmapItem(id: string): Promise<void> {
  await roadmapStore.remove(id);
}

// ═══════════════════════════════════════════════════════════════════
// Roadmap — Update priority
// ═══════════════════════════════════════════════════════════════════

export async function updateRoadmapPriority(
  id: string,
  priority: RoadmapPriority
): Promise<void> {
  await roadmapStore.update(id, { priority } as Partial<RoadmapItem>);
}
