-- ═══════════════════════════════════════════════════════════════════
-- Finance module — suppliers table + expense bulk-import support
--
-- Adds the suppliers master table referenced by every expense via
-- supplier_id. Same jsonb blob pattern + service-role-only RLS as the
-- rest of the finance_* tables.
--
-- finance_expenses is already created in migration 015. The expanded
-- Expense shape (currency, amount_native/amount_gbp split, vat_treatment,
-- source_system, paid_from, expense_number, tax_year, supplier_id FK)
-- is additive at the jsonb level, no DDL change required there.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS finance_suppliers (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_suppliers ENABLE ROW LEVEL SECURITY;

-- No anon policy: only the service-role key can touch this table,
-- matching the security model established in migration 016.

-- Optional index for case-insensitive supplier lookups by name.
CREATE INDEX IF NOT EXISTS finance_suppliers_name_idx
  ON finance_suppliers ((LOWER(data->>'name')));
