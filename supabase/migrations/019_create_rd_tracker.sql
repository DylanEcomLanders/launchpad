-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: R&D Tracker — durable storage
-- Three tables backing /rd. Same { id text pk, data jsonb, updated_at }
-- pattern as pods_v2_* so the existing TypeScript types ride straight
-- into the data column with no schema duplication.
--
-- rd_initiatives  — operational projects Dylan owns (design system,
--                   dev system, internal tools, etc.). Sub-points hang
--                   off them via rd_subpoints (cascade not enforced at
--                   the DB level because the data is jsonb-blobbed;
--                   the app deletes children explicitly on parent kill).
-- rd_subpoints    — checklist items belonging to an initiative.
-- rd_ideas        — low-friction inbox the whole team drops into. Idea
--                   can be promoted into a real initiative, in which
--                   case the new initiative carries promoted_from_idea_id
--                   and the idea's status flips to 'promoted'.
--
-- TODO(slack-integration): wire a /idea Slack slash command that
-- inserts into rd_ideas via the server-side service-role client.
-- TODO(stale-cron): nightly job that flags active initiatives where
-- updated_at + max(child subpoint updated_at) > 14 days. For V1 the
-- "Stale" badge is derived client-side in /rd.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rd_initiatives (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rd_subpoints (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rd_ideas (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the stale-flag query path (active initiatives sorted by
-- when they were last touched) and the subpoint-by-initiative lookup.
CREATE INDEX IF NOT EXISTS rd_initiatives_updated_idx ON rd_initiatives (updated_at DESC);
CREATE INDEX IF NOT EXISTS rd_subpoints_updated_idx   ON rd_subpoints (updated_at DESC);
CREATE INDEX IF NOT EXISTS rd_ideas_updated_idx       ON rd_ideas (updated_at DESC);

-- RLS — same posture as pods_v2_*. App-level auth gates writes via the
-- launchpad-role cookie; this just keeps rows accessible to the anon
-- Supabase client everything else in the app uses.
ALTER TABLE rd_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_subpoints   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_ideas       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rd_initiatives_all" ON rd_initiatives FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "rd_subpoints_all"   ON rd_subpoints   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "rd_ideas_all"       ON rd_ideas       FOR ALL TO anon USING (true) WITH CHECK (true);
