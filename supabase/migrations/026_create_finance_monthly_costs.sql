-- ═══════════════════════════════════════════════════════════════════
-- Finance module — monthly costs (recurring-outgoings calculator)
--
-- Standalone quick tracker of fixed recurring outgoings (salaries,
-- software, rent, subscriptions). Separate from finance_expenses (the
-- invoice-linked AP ledger): this is a lightweight burn calculator that
-- normalises each line to a monthly figure.
--
-- Same jsonb blob pattern + service-role-only RLS as the rest of the
-- finance_* tables (see migration 016 / 018).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS finance_monthly_costs (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_monthly_costs ENABLE ROW LEVEL SECURITY;

-- No anon policy: only the service-role key can touch this table,
-- matching the finance_* security model.
