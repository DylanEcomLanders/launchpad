-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Company module (people, invoices, hiring, org structure)
-- Uses the standard { id, data jsonb, created_at } blob pattern that
-- the rest of the app uses with createStore().
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_people (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_invoices (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_open_roles (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_candidates (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_open_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_people_anon_all" ON company_people
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "company_invoices_anon_all" ON company_invoices
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "company_open_roles_anon_all" ON company_open_roles
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "company_candidates_anon_all" ON company_candidates
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Storage buckets — create from Supabase dashboard:
--   Storage → New bucket → "company-invoices" (public)
--   Storage → New bucket → "company-cvs" (public)
--   Storage → New bucket → "company-avatars" (public)
