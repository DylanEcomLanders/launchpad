-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Strategy tables
--
-- Backs the Strategy toggle on /pods-v2 and the Strategy Sandbox
-- section on /engagements/[id]. Four tables, all using the same
-- { id text pk, data jsonb, updated_at } convention as the rest of
-- the app so the data layer is consistent.
--
--   strategy_briefs    — one row per onboarding-to-pod assignment.
--                        Auto-created on assign, lifecycle is needs_brief
--                        → drafting → in_review → approved, then done.
--                        Surfaces on the Pod Overview Strategy toggle.
--
--   strategy_results   — one row per live test the strategist needs to
--                        read. Auto-created when a test goes live (when
--                        wired up). Lifecycle is running → ready →
--                        read (or overdue if past threshold).
--                        Surfaces on the same Strategy toggle.
--
--   strategy_resources — one row per resource a strategist drops into
--                        a client's Sandbox: pasted Google Doc / Loom /
--                        link, or uploaded file. Keyed by client_id in
--                        the JSONB so all of a client's resources can be
--                        fetched with a single WHERE.
--
--   strategy_notes     — dated entries the strategist writes in the
--                        Sandbox. One row per note (append-only-ish,
--                        deletable). Keyed by client_id in the JSONB.
--
-- RLS posture matches the rest of the app: app-layer auth gates
-- writes via the launchpad-role cookie; anon Supabase client used by
-- the data layer needs rows readable to function.
--
-- File uploads for strategy_resources go into the `strategy-resources`
-- Supabase Storage bucket (create in dashboard: Storage → New bucket
-- → name: strategy-resources → Private). The signed URL lives in the
-- row's `data.file_url` field.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS strategy_briefs (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_results (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_resources (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_notes (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS strategy_briefs_updated_idx    ON strategy_briefs    (updated_at DESC);
CREATE INDEX IF NOT EXISTS strategy_results_updated_idx   ON strategy_results   (updated_at DESC);
CREATE INDEX IF NOT EXISTS strategy_resources_updated_idx ON strategy_resources (updated_at DESC);
CREATE INDEX IF NOT EXISTS strategy_notes_updated_idx     ON strategy_notes     (updated_at DESC);

-- Functional indexes on the client_id key in JSONB. The Sandbox loads
-- "all resources for this client" and "all notes for this client" on
-- every engagement page render, so these matter.
CREATE INDEX IF NOT EXISTS strategy_resources_client_idx
  ON strategy_resources ((data->>'client_id'));
CREATE INDEX IF NOT EXISTS strategy_notes_client_idx
  ON strategy_notes ((data->>'client_id'));
CREATE INDEX IF NOT EXISTS strategy_briefs_client_idx
  ON strategy_briefs ((data->>'client_id'));
CREATE INDEX IF NOT EXISTS strategy_results_client_idx
  ON strategy_results ((data->>'client_id'));

-- Pod filter on the Strategy toggle hits these.
CREATE INDEX IF NOT EXISTS strategy_briefs_pod_idx
  ON strategy_briefs ((data->>'pod_id'));
CREATE INDEX IF NOT EXISTS strategy_results_pod_idx
  ON strategy_results ((data->>'pod_id'));

-- RLS
ALTER TABLE strategy_briefs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_notes     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategy_briefs_all"    ON strategy_briefs    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "strategy_results_all"   ON strategy_results   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "strategy_resources_all" ON strategy_resources FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "strategy_notes_all"     ON strategy_notes     FOR ALL TO anon USING (true) WITH CHECK (true);
