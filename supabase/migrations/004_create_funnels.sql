-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Create funnels table for Funnel Builder
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS funnels (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL DEFAULT '',
  client_id    TEXT,
  client_name  TEXT NOT NULL DEFAULT '',
  mode         TEXT NOT NULL DEFAULT 'strategy',
  nodes        JSONB NOT NULL DEFAULT '[]',
  edges        JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnels_anon_select" ON funnels FOR SELECT TO anon USING (true);
CREATE POLICY "funnels_anon_insert" ON funnels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "funnels_anon_update" ON funnels FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "funnels_anon_delete" ON funnels FOR DELETE TO anon USING (true);
