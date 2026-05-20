-- ═══════════════════════════════════════════════════════════════════
-- Finance module — lock down RLS
--
-- Migration 015 created finance_* tables with an "anon FOR ALL" policy
-- matching the rest of the app. That is too permissive for financial
-- data: anyone with the Supabase publishable key could read invoices,
-- expenses, the company profile, and document metadata.
--
-- This migration drops those anon policies. After it runs, ONLY the
-- service-role key can touch the finance_* tables. The Next.js API
-- routes at /api/finance/store/* validate the FinanceGate passcode
-- cookie server-side, then call Supabase with the service-role key.
-- Browser-side code never touches finance_* tables directly.
--
-- Storage bucket finance-documents — apply the same policy in the
-- Supabase dashboard: revoke any anon access, keep only service-role
-- access. Uploads go through /api/finance/upload (server-side).
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "finance_invoices_issued_anon_all" ON finance_invoices_issued;
DROP POLICY IF EXISTS "finance_expenses_anon_all" ON finance_expenses;
DROP POLICY IF EXISTS "finance_documents_anon_all" ON finance_documents;
DROP POLICY IF EXISTS "finance_company_profile_anon_all" ON finance_company_profile;
DROP POLICY IF EXISTS "finance_invoice_sequence_anon_all" ON finance_invoice_sequence;

-- RLS stays ENABLED so the absence of policies means "deny everything"
-- for anon. Service role bypasses RLS by definition.

-- Revoke the function execute grant given in 015 — only service role
-- should be allowed to bump the invoice sequence.
REVOKE EXECUTE ON FUNCTION finance_next_invoice_number(INTEGER) FROM anon;
