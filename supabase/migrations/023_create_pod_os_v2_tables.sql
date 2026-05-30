-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Pod OS v2 — Strategist tests + hypothesis library
--
-- Two new collections backing the Strategist Dashboard (spec §4.1):
--   pods_v2_strategist_tests — every test the strategist runs/reads,
--                              with the §1.8 state machine + calling
--                              inputs (confidence, runtime, guardrails).
--                              No system cap on live tests (locked #5).
--   pods_v2_hypotheses       — the searchable Hypothesis Library,
--                              tagged + linked to test results (§4.1).
--
-- Same { id text pk, data jsonb, updated_at } convention as migration
-- 011 (pods_v2_*), so the existing TypeScript types ride straight into
-- the data column and the additive mirror in src/lib/pods-v2/sync.ts
-- picks them up via POD_KEY_TO_TABLE with no extra wiring.
--
-- The Clients-v2 engagement-lifecycle fields (engagement_kind,
-- engagement_start, renewal_status, health_signals, etc.) need NO
-- migration — they live inside the existing pods_v2_clients.data JSONB
-- (DECISIONS.md #4).
--
-- NOTE: migrations here are NOT auto-applied. Paste this file into the
-- Supabase SQL editor to create the tables. Until then the strategist
-- tests + hypotheses persist to localStorage only (the standard pods-v2
-- fallback) — no errors, just not yet synced cross-device. See
-- BLOCKERS.md B1.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pods_v2_strategist_tests (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pods_v2_hypotheses (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pods_v2_strategist_tests_updated_idx
  ON pods_v2_strategist_tests (updated_at DESC);
CREATE INDEX IF NOT EXISTS pods_v2_hypotheses_updated_idx
  ON pods_v2_hypotheses (updated_at DESC);

-- RLS — same posture as migration 011: app-level auth gates writes via
-- the launchpad-role cookie; anon Supabase client (used by the data
-- layer everywhere) needs rows readable + writable to function.
ALTER TABLE pods_v2_strategist_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods_v2_hypotheses       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pods_v2_strategist_tests_all" ON pods_v2_strategist_tests
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pods_v2_hypotheses_all" ON pods_v2_hypotheses
  FOR ALL TO anon USING (true) WITH CHECK (true);
