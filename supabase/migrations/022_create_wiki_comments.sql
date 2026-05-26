-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Wiki v2 — inline comments
-- Backs the text-selection comment layer in /wiki-v2. Same
-- { id text pk, data jsonb, created_at timestamptz } pattern as the
-- other launchpad tables so TypeScript types map straight into the
-- data column with no schema duplication.
--
-- wiki_comments — one row per comment OR reply. Replies link to their
--   root via parent_id (stored inside data jsonb, not as a column).
--   Comments are anchored to a passage of text using a triple:
--     anchor_text   — the actual highlighted selection
--     anchor_before — ~80 chars immediately preceding the selection
--     anchor_after  — ~80 chars immediately following the selection
--   This lets the client re-locate the anchor after content edits
--   (fuzzy match on the surrounding context) rather than relying on
--   brittle DOM coordinates or character offsets.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wiki_comments (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most queries filter by the page being viewed. data->>'page_slug' is
-- the hot column; this functional index keeps page-load fast even as
-- the comment table grows.
CREATE INDEX IF NOT EXISTS wiki_comments_page_slug_idx
  ON wiki_comments ((data->>'page_slug'));
CREATE INDEX IF NOT EXISTS wiki_comments_created_idx
  ON wiki_comments (created_at DESC);

-- RLS: same posture as the rest of launchpad's tables. App-level auth
-- gates writes via the launchpad-role cookie; the anon key can read
-- and write at the DB layer.
ALTER TABLE wiki_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wiki_comments' AND policyname = 'wiki_comments_all'
  ) THEN
    CREATE POLICY wiki_comments_all ON wiki_comments
      FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
