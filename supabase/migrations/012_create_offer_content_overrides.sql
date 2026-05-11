-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Offer page content overrides
-- Editable text overrides for the Conversion Engine sales pages
-- (FAQ, Objections, Cheat Sheet). Defaults remain in the markdown
-- files / hardcoded TSX — overrides layer on top at render time.
-- Single fixed row with id = 'offer-content-singleton'.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.offer_content_overrides (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_content_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offer_content_overrides_anon_read" ON public.offer_content_overrides;
CREATE POLICY "offer_content_overrides_anon_read"
  ON public.offer_content_overrides FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "offer_content_overrides_anon_write" ON public.offer_content_overrides;
CREATE POLICY "offer_content_overrides_anon_write"
  ON public.offer_content_overrides FOR ALL
  USING (true) WITH CHECK (true);
