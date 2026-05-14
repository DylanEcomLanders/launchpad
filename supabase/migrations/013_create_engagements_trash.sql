-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Engagement trash — soft-delete store
--
-- Mirrors src/lib/engagement-trash.ts. Each row carries a full snapshot
-- of the deleted engagement (MockEngagement shape + cascading Client /
-- Projects / Tasks payload for pods-sourced clients) so a restore on
-- another device can put the data back exactly as it was.
--
-- Same { id, data jsonb, updated_at } shape as the pods_v2_* tables so
-- the existing sync helpers stay consistent.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS engagements_trash (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS engagements_trash_updated_idx
  ON engagements_trash (updated_at DESC);

ALTER TABLE engagements_trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagements_trash_all"
  ON engagements_trash
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
