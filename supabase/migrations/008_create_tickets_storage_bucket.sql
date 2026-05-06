-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Tickets storage bucket
-- For ticket screenshots — drop / paste / file-pick attachments on
-- ticket cards and the quick-add composer. Public read so anonymous
-- /tasks viewers can see embedded thumbnails without auth.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS policy: anyone can read (public bucket), authenticated upload via
-- the service-role key in the API route (no client-side direct upload).
-- These policies keep client-side direct access closed; the API route
-- bypasses them via supabase.from(BUCKET).upload using the configured key.

-- Read: open
DROP POLICY IF EXISTS "tickets_public_read" ON storage.objects;
CREATE POLICY "tickets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tickets');
