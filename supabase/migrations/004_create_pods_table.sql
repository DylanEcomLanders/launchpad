-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Pods (v0.5 pilot)
-- Adds the pods table + pod_id reference on client_portals.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  tier            TEXT NOT NULL DEFAULT 'standard',
  am_name         TEXT NOT NULL DEFAULT '',
  designer_name   TEXT NOT NULL DEFAULT '',
  dev_name        TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pods_anon_select" ON pods FOR SELECT TO anon USING (true);
CREATE POLICY "pods_anon_insert" ON pods FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pods_anon_update" ON pods FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pods_anon_delete" ON pods FOR DELETE TO anon USING (true);

-- Add pod assignment to existing client portals
ALTER TABLE client_portals ADD COLUMN IF NOT EXISTS pod_id UUID;
CREATE INDEX IF NOT EXISTS client_portals_pod_id_idx ON client_portals (pod_id);
