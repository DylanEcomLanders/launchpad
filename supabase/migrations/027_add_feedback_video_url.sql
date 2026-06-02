-- ═══════════════════════════════════════════════════════════════════
-- Feedback: optional video testimonial
--
-- Adds a nullable video_url column to the feedback table. Clients can
-- record a short webcam testimonial on the public /feedback form; the
-- recorded clip is uploaded to the `feedback-videos` storage bucket and
-- its public URL stored here. Additive and backwards-compatible.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS video_url TEXT;
