-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Pods v2 — durable storage
-- Five tables backing the /pods-v2 operating system. Each uses the
-- generic { id, data jsonb, updated_at } pattern so the existing
-- TypeScript types ride straight into the data column with no schema
-- duplication. Indexes only on id + updated_at; queries beyond
-- "list all" run client-side over the cached array.
--
-- Coexists with the older `pods` table (v0.5 pilot) — different name,
-- different lifecycle, will eventually replace it.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pods_v2_pods (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pods_v2_clients (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pods_v2_projects (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pods_v2_tasks (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pods_v2_cro_leads (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the "what changed since last sync" path the standup +
-- digest crons will use. Cheap to maintain and meaningfully speeds up
-- delta queries.
CREATE INDEX IF NOT EXISTS pods_v2_tasks_updated_idx ON pods_v2_tasks (updated_at DESC);
CREATE INDEX IF NOT EXISTS pods_v2_projects_updated_idx ON pods_v2_projects (updated_at DESC);

-- RLS — same posture as the older pods table. App-level auth gates
-- writes via the launchpad-role cookie; this just keeps the rows
-- accessible to the anon Supabase client used everywhere else.
ALTER TABLE pods_v2_pods       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods_v2_clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods_v2_projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods_v2_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods_v2_cro_leads  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pods_v2_pods_all"       ON pods_v2_pods       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pods_v2_clients_all"    ON pods_v2_clients    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pods_v2_projects_all"   ON pods_v2_projects   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pods_v2_tasks_all"      ON pods_v2_tasks      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pods_v2_cro_leads_all"  ON pods_v2_cro_leads  FOR ALL TO anon USING (true) WITH CHECK (true);
