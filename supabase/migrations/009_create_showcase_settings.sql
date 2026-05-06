-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Case studies showcase settings
-- Single-row config table powering the public /case-studies index page
-- (eyebrow / headline / subhead / closing CTA copy + links). Stored as
-- one fixed row with id = 'default' so we never have to GROUP BY or
-- pick a "current" row — there's only ever one.
--
-- Anon read (the public page server-renders from this) + anon write
-- (the admin editor at /sales-engine/case-studies/showcase-settings
-- uses the same anon client as the rest of the app; auth lives at the
-- AuthGate component layer, not the database).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.showcase_settings (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "showcase_settings_anon_read" ON public.showcase_settings;
CREATE POLICY "showcase_settings_anon_read"
  ON public.showcase_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "showcase_settings_anon_write" ON public.showcase_settings;
CREATE POLICY "showcase_settings_anon_write"
  ON public.showcase_settings FOR ALL
  USING (true) WITH CHECK (true);
