-- ─────────────────────────────────────────────────────────────────────────
-- Sandbox seed data
--
-- Runs after migrations on `supabase db reset`. Populates just enough of
-- the kanban core (pods → clients → projects → tasks) to make the board
-- feel real for feature testing. NOT production data - purely fictional.
--
-- Due dates are relative to current_date so the board's state tints
-- (overdue red / approaching amber / live green) always render correctly
-- no matter when the sandbox is seeded.
--
-- Idempotent: safe to re-run. `on conflict do nothing` on every insert.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Pod ──────────────────────────────────────────────────────────────────
insert into kanban_pods (id, name, designer, developer) values
  ('pod-alpha', 'Pod Alpha', 'Sample Designer', 'Sample Developer')
on conflict (id) do nothing;

-- ─── Clients ──────────────────────────────────────────────────────────────
insert into kanban_clients (id, name, onboarding_brief) values
  ('client-harvestory', 'Harvestory', '{"whatDoYouSell":"Organic pantry staples","idealCustomer":"Health-conscious home cooks","mainGoal":"Lift PDP conversion rate"}'::jsonb),
  ('client-northwind', 'Northwind Supply', null)
on conflict (id) do nothing;

-- ─── Projects ─────────────────────────────────────────────────────────────
insert into kanban_projects (id, client_id, name, type, turnaround_days, pod_id, start_date) values
  ('proj-harvestory-pdp', 'client-harvestory', 'PDP Build', 'build', 20, 'pod-alpha', current_date - 10),
  ('proj-northwind-home', 'client-northwind', 'Homepage Refresh', 'build', 15, 'pod-alpha', current_date - 4)
on conflict (id) do nothing;

-- ─── Tasks (cards) ────────────────────────────────────────────────────────
-- One card per board state so every visual signal is exercised.
insert into kanban_tasks (id, project_id, title, phase, category, designer, developer, due_date, revision_requested, live_test_url, live_started_at) values
  -- on-track (neutral)
  ('task-h-strategy', 'proj-harvestory-pdp', 'Strategy + wireframe', 'strategy', 'design', 'Sample Designer', null, current_date + 5, false, null, null),
  -- approaching (amber - due tomorrow)
  ('task-h-design',   'proj-harvestory-pdp', 'Hero + gallery design', 'design', 'design', 'Sample Designer', null, current_date + 1, false, null, null),
  -- overdue (red - due in the past)
  ('task-h-dev',      'proj-harvestory-pdp', 'Build PDP sections', 'development', 'dev', null, 'Sample Developer', current_date - 2, false, null, null),
  -- revision requested, also approaching (amber)
  ('task-h-rev',      'proj-harvestory-pdp', 'Client revisions round 1', 'external-revisions', 'design', 'Sample Designer', null, current_date + 1, true, null, null),
  -- live (green - in launch-testing with a live URL)
  ('task-n-live',     'proj-northwind-home', 'Homepage A/B test', 'launch-testing', 'dev', 'Sample Designer', 'Sample Developer', null, false, 'https://example.com/ab/home', current_date - 3),
  -- fresh, not started
  ('task-n-start',    'proj-northwind-home', 'Collection page pass', 'not-started', 'design', 'Sample Designer', null, current_date + 8, false, null, null)
on conflict (id) do nothing;
