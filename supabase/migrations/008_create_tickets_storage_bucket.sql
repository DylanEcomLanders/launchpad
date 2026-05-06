-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Tickets storage bucket
-- For ticket screenshots — drop / paste / file-pick attachments on
-- ticket cards and the quick-add composer. Public read so anonymous
-- /tasks viewers can see embedded thumbnails without auth.
--
-- The /api/tickets/upload route uses the anon Supabase client (same
-- pattern as the rest of the app), so each operation needs its own RLS
-- policy. File-type and size validation happens server-side in the API
-- route before the upload call.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Read (used by every <img> tag rendering thumbnails)
DROP POLICY IF EXISTS "tickets_public_read" ON storage.objects;
CREATE POLICY "tickets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tickets');

-- Insert (uploads from the API route)
DROP POLICY IF EXISTS "tickets_public_insert" ON storage.objects;
CREATE POLICY "tickets_public_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tickets');

-- Update (covers re-uploads with the same filename, just in case)
DROP POLICY IF EXISTS "tickets_public_update" ON storage.objects;
CREATE POLICY "tickets_public_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tickets');

-- Delete (so the X on a thumbnail can also clean up the storage object
-- if/when we wire that up — currently the UI just removes the URL from
-- the ticket; the file is left in the bucket)
DROP POLICY IF EXISTS "tickets_public_delete" ON storage.objects;
CREATE POLICY "tickets_public_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tickets');
