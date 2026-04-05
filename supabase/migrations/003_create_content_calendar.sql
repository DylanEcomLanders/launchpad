-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Create content_calendar table
-- Uses generic { id, data (jsonb), created_at } pattern for createStore
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS content_calendar (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_calendar_anon_select" ON content_calendar FOR SELECT TO anon USING (true);
CREATE POLICY "content_calendar_anon_insert" ON content_calendar FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "content_calendar_anon_update" ON content_calendar FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "content_calendar_anon_delete" ON content_calendar FOR DELETE TO anon USING (true);
