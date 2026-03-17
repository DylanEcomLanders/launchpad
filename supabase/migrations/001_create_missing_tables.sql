-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Create missing tables
-- Tables: content_database, brand_profiles, saved_prospects,
--         outreach_sequences, active_projects, issues, changelog, roadmap
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. content_database ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_database (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     TEXT NOT NULL DEFAULT 'twitter',
  category     TEXT NOT NULL DEFAULT 'other',
  content      TEXT NOT NULL DEFAULT '',
  post_url     TEXT NOT NULL DEFAULT '',
  post_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  impressions  INTEGER NOT NULL DEFAULT 0,
  engagements  INTEGER NOT NULL DEFAULT 0,
  clicks       INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  is_winner    BOOLEAN NOT NULL DEFAULT false,
  tags         JSONB NOT NULL DEFAULT '[]',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_database_anon_select" ON content_database FOR SELECT TO anon USING (true);
CREATE POLICY "content_database_anon_insert" ON content_database FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "content_database_anon_update" ON content_database FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "content_database_anon_delete" ON content_database FOR DELETE TO anon USING (true);

-- ── 2. brand_profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name     TEXT NOT NULL DEFAULT '',
  brand_url        TEXT NOT NULL DEFAULT '',
  pain_points      JSONB NOT NULL DEFAULT '[]',
  desires          JSONB NOT NULL DEFAULT '[]',
  objections       JSONB NOT NULL DEFAULT '[]',
  language_pulls   JSONB NOT NULL DEFAULT '[]',
  raw_report       TEXT NOT NULL DEFAULT '',
  last_researched  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_profiles_anon_select" ON brand_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "brand_profiles_anon_insert" ON brand_profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "brand_profiles_anon_update" ON brand_profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "brand_profiles_anon_delete" ON brand_profiles FOR DELETE TO anon USING (true);

-- ── 3. saved_prospects ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_prospects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name        TEXT NOT NULL DEFAULT '',
  url               TEXT NOT NULL DEFAULT '',
  emails            JSONB NOT NULL DEFAULT '[]',
  social_links      JSONB NOT NULL DEFAULT '[]',
  revenue_score     INTEGER NOT NULL DEFAULT 0,
  apps              JSONB NOT NULL DEFAULT '[]',
  niche             TEXT NOT NULL DEFAULT '',
  outreach_status   TEXT NOT NULL DEFAULT 'not_contacted',
  notes             TEXT NOT NULL DEFAULT '',
  product_count     INTEGER NOT NULL DEFAULT 0,
  price_range       JSONB,
  has_reviews       BOOLEAN NOT NULL DEFAULT false,
  has_subscriptions BOOLEAN NOT NULL DEFAULT false,
  has_bnpl          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE saved_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_prospects_anon_select" ON saved_prospects FOR SELECT TO anon USING (true);
CREATE POLICY "saved_prospects_anon_insert" ON saved_prospects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "saved_prospects_anon_update" ON saved_prospects FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "saved_prospects_anon_delete" ON saved_prospects FOR DELETE TO anon USING (true);

-- ── 4. outreach_sequences ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name    TEXT NOT NULL DEFAULT '',
  store_url     TEXT NOT NULL DEFAULT '',
  contact_name  TEXT NOT NULL DEFAULT '',
  findings      TEXT NOT NULL DEFAULT '',
  steps         JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_sequences_anon_select" ON outreach_sequences FOR SELECT TO anon USING (true);
CREATE POLICY "outreach_sequences_anon_insert" ON outreach_sequences FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "outreach_sequences_anon_update" ON outreach_sequences FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "outreach_sequences_anon_delete" ON outreach_sequences FOR DELETE TO anon USING (true);

-- ── 5. active_projects ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT '',
  client_name     TEXT NOT NULL DEFAULT '',
  health          TEXT NOT NULL DEFAULT 'green',
  team_lead       TEXT NOT NULL DEFAULT '',
  next_milestone  TEXT NOT NULL DEFAULT '',
  deadline        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE active_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_projects_anon_select" ON active_projects FOR SELECT TO anon USING (true);
CREATE POLICY "active_projects_anon_insert" ON active_projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "active_projects_anon_update" ON active_projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "active_projects_anon_delete" ON active_projects FOR DELETE TO anon USING (true);

-- ── 6. issues ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL DEFAULT 'bug',
  page         TEXT NOT NULL DEFAULT '',
  reported_by  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues_anon_select" ON issues FOR SELECT TO anon USING (true);
CREATE POLICY "issues_anon_insert" ON issues FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "issues_anon_update" ON issues FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "issues_anon_delete" ON issues FOR DELETE TO anon USING (true);

-- ── 7. changelog ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS changelog (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date      TEXT NOT NULL DEFAULT '',
  version   TEXT NOT NULL DEFAULT '',
  title     TEXT NOT NULL DEFAULT '',
  changes   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "changelog_anon_select" ON changelog FOR SELECT TO anon USING (true);
CREATE POLICY "changelog_anon_insert" ON changelog FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "changelog_anon_update" ON changelog FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "changelog_anon_delete" ON changelog FOR DELETE TO anon USING (true);

-- ── 8. roadmap ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  priority    TEXT NOT NULL DEFAULT 'planned',
  added_by    TEXT,
  added_at    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE roadmap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_anon_select" ON roadmap FOR SELECT TO anon USING (true);
CREATE POLICY "roadmap_anon_insert" ON roadmap FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "roadmap_anon_update" ON roadmap FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "roadmap_anon_delete" ON roadmap FOR DELETE TO anon USING (true);
