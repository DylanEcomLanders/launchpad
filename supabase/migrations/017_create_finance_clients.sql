-- ═══════════════════════════════════════════════════════════════════
-- Finance module — clients table + bulk import support
--
-- Adds the clients master table referenced by every invoice via
-- client_id. Same jsonb blob pattern + service-role-only RLS as the
-- rest of the finance_* tables.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS finance_clients (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_clients ENABLE ROW LEVEL SECURITY;

-- No anon policy: only the service-role key can touch this table,
-- matching the security model established in migration 016.
