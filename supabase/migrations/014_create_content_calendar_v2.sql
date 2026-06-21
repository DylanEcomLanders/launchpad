-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Content Calendar v2
--   Personal social pipeline (Twitter + LinkedIn) with pillars,
--   pipeline kanban, calendar grid, and balance tracking.
--
--   Built fresh alongside the parked sales-engine `content_calendar`
--   table (003) so Typefully drafts there keep working untouched.
--   If/when that module is retired, data can be migrated in.
--
--   Tables follow the standard { id, data (jsonb), created_at } shape
--   so they slot into createStore() in src/lib/supabase-store.ts.
--
--   Storage bucket `content-calendar` holds post media (images,
--   videos, screenshots). Public read so the dashboard can render
--   thumbnails without auth.
-- ═══════════════════════════════════════════════════════════════════

-- ── Pillars ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_pillars (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_pillars_anon_select" ON content_pillars FOR SELECT TO anon USING (true);
CREATE POLICY "content_pillars_anon_insert" ON content_pillars FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "content_pillars_anon_update" ON content_pillars FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "content_pillars_anon_delete" ON content_pillars FOR DELETE TO anon USING (true);

-- Seed the four pillars from the spec. ON CONFLICT DO NOTHING so
-- re-runs of the migration don't clobber anything the user has edited.
INSERT INTO content_pillars (id, data) VALUES
  ('pillar_cro_frameworks', jsonb_build_object(
    'name', 'CRO Frameworks',
    'slug', 'cro_frameworks',
    'color_hex', '#2563EB',
    'description', 'Conversion frameworks, audit teardowns, principles',
    'target_weekly_posts', 3,
    'sort_order', 0
  )),
  ('pillar_agency_ops', jsonb_build_object(
    'name', 'Agency Ops',
    'slug', 'agency_ops',
    'color_hex', '#8B5CF6',
    'description', 'Running the agency, pricing, hiring, systems',
    'target_weekly_posts', 2,
    'sort_order', 1
  )),
  ('pillar_building_in_public', jsonb_build_object(
    'name', 'Building in Public',
    'slug', 'building_in_public',
    'color_hex', '#F59E0B',
    'description', 'Launchpad shipping notes, behind the scenes',
    'target_weekly_posts', 1,
    'sort_order', 2
  )),
  ('pillar_industry_opinions', jsonb_build_object(
    'name', 'Industry Opinions',
    'slug', 'industry_opinions',
    'color_hex', '#EF4444',
    'description', 'Hot takes, contrarian views, commentary',
    'target_weekly_posts', 1,
    'sort_order', 3
  ))
ON CONFLICT (id) DO NOTHING;

-- ── Posts ───────────────────────────────────────────────────────────
-- Media is embedded in `data.media` rather than a separate table.
-- Keeps reads to a single row, matches every other module in the app,
-- and the spec's reorder/delete semantics are per-post anyway.
CREATE TABLE IF NOT EXISTS content_posts (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_posts_anon_select" ON content_posts FOR SELECT TO anon USING (true);
CREATE POLICY "content_posts_anon_insert" ON content_posts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "content_posts_anon_update" ON content_posts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "content_posts_anon_delete" ON content_posts FOR DELETE TO anon USING (true);

-- Indexes on the common filter fields. JSONB extraction is fine for
-- our scale (single user, hundreds of posts), but cheap to index now.
CREATE INDEX IF NOT EXISTS content_posts_status_idx
  ON content_posts ((data->>'status'));
CREATE INDEX IF NOT EXISTS content_posts_pillar_idx
  ON content_posts ((data->>'pillar_id'));
CREATE INDEX IF NOT EXISTS content_posts_scheduled_idx
  ON content_posts ((data->>'scheduled_for'));

-- ── Storage bucket: content-calendar ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-calendar', 'content-calendar', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "content_calendar_public_read" ON storage.objects;
CREATE POLICY "content_calendar_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'content-calendar');

DROP POLICY IF EXISTS "content_calendar_public_insert" ON storage.objects;
CREATE POLICY "content_calendar_public_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'content-calendar');

DROP POLICY IF EXISTS "content_calendar_public_update" ON storage.objects;
CREATE POLICY "content_calendar_public_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'content-calendar');

DROP POLICY IF EXISTS "content_calendar_public_delete" ON storage.objects;
CREATE POLICY "content_calendar_public_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'content-calendar');
