-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Tickets (triage layer on the task board)
-- Single-document store mirroring the task_board pattern: id text PK,
-- data jsonb. The id is always 'main-tickets' for the singleton row.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tickets (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{"tickets":[]}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton document so first-time GET returns a populated row.
INSERT INTO tickets (id, data)
VALUES ('main-tickets', '{"tickets":[]}'::jsonb)
ON CONFLICT (id) DO NOTHING;
