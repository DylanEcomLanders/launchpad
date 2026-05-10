-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Agent Mission Control (v0.5)
-- Two tables for the AI workforce: agents (the NPCs) and agent_tasks
-- (the run history). Both follow the {id, data, created_at} JSONB
-- pattern so the createStore<T> helper in src/lib/supabase-store.ts
-- can read/write them with no special casing.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agents (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_anon_select" ON agents FOR SELECT TO anon USING (true);
CREATE POLICY "agents_anon_insert" ON agents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "agents_anon_update" ON agents FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "agents_anon_delete" ON agents FOR DELETE TO anon USING (true);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_tasks_anon_select" ON agent_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "agent_tasks_anon_insert" ON agent_tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "agent_tasks_anon_update" ON agent_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "agent_tasks_anon_delete" ON agent_tasks FOR DELETE TO anon USING (true);

-- Lookup index for "tasks for a given agent" — the most common query.
CREATE INDEX IF NOT EXISTS agent_tasks_agent_id_idx ON agent_tasks ((data->>'agentId'));
