-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Finance module
-- Founder-only money source-of-truth. Receivables, payables, docs,
-- editable company profile. All tables use the { id, data jsonb }
-- blob pattern so they work with createStore().
--
-- Sequence table (finance_invoice_sequence) is the one exception: it
-- owns a single counter row for server-side invoice number generation.
--
-- Storage bucket finance-documents must be created from the dashboard
-- as PRIVATE (not public). All access goes through signed URLs.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS finance_invoices_issued (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_expenses (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_documents (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_company_profile (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-row counter table for atomic invoice number increment.
-- One row per year ({ year, last_number }), so 2026 and 2027 each
-- get their own INV-YYYY-NNN sequence.
CREATE TABLE IF NOT EXISTS finance_invoice_sequence (
  year         INTEGER PRIMARY KEY,
  last_number  INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_invoices_issued ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_invoice_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_invoices_issued_anon_all" ON finance_invoices_issued
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_expenses_anon_all" ON finance_expenses
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_documents_anon_all" ON finance_documents
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_company_profile_anon_all" ON finance_company_profile
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "finance_invoice_sequence_anon_all" ON finance_invoice_sequence
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Atomic next-invoice-number function. Inserts the year row if missing,
-- bumps last_number, returns the new number. Single statement, so it's
-- safe against concurrent calls.
CREATE OR REPLACE FUNCTION finance_next_invoice_number(p_year INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO finance_invoice_sequence (year, last_number, updated_at)
  VALUES (p_year, 1, now())
  ON CONFLICT (year) DO UPDATE
    SET last_number = finance_invoice_sequence.last_number + 1,
        updated_at = now()
  RETURNING last_number INTO v_next;
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION finance_next_invoice_number(INTEGER) TO anon;

-- Storage bucket — create from Supabase dashboard:
--   Storage → New bucket → "finance-documents" (PRIVATE — uncheck public)
-- Bucket policy: anon role can insert/select/delete (RLS via our app's
-- passcode gate, not Supabase auth).
