-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Funnel Roadmaps
-- Replaces the legacy node-canvas funnel builder. Linear, ordered shape:
--   traffic_sources → pages → optional lead_gen track
-- Public sharing via share_token (UUID, unguessable).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS roadmaps (
  id              TEXT PRIMARY KEY,
  share_token     TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  client_id       TEXT,
  client_name     TEXT NOT NULL DEFAULT '',
  traffic_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  pages           JSONB NOT NULL DEFAULT '[]'::jsonb,
  lead_gen        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roadmaps_share_token_idx ON roadmaps (share_token);
CREATE INDEX IF NOT EXISTS roadmaps_client_id_idx   ON roadmaps (client_id);
