-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Mission Control kanban — standalone schema
--
-- Four new tables backing /kanban. Intentionally separate from the
-- pods_v2_* JSONB-blob tables so:
--   - Iterating on the kanban can't break workspace / pods-v2
--   - Real relational columns + real indexes (no jsonb path lookups)
--   - Schema = documentation; the type contract is explicit
--
-- If/when we want to merge with pods-v2 later, that's a proper
-- migration job; for now the kanban writes here and only here.
--
-- Apply manually in Supabase SQL Editor (per project rule, migrations
-- are not auto-run).
-- ═══════════════════════════════════════════════════════════════════

-- ─── kanban_pods ────────────────────────────────────────────────────────────
-- Team line-ups assigned to projects. Pod members are stored as plain
-- text names for now (no FK to a people table) since the kanban prototype
-- uses MOCK_PODS names. Swap to a real ref later if needed.
create table if not exists kanban_pods (
  id                   text primary key,
  name                 text not null,
  designer             text,
  secondary_designer   text,
  developer            text,
  secondary_developer  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── kanban_clients ─────────────────────────────────────────────────────────
-- Brand-level metadata. onboarding_brief carries the structured Q&A
-- that the kanban modal pops (OnboardingBrief type).
create table if not exists kanban_clients (
  id                text primary key,
  name              text not null,
  onboarding_brief  jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── kanban_projects ────────────────────────────────────────────────────────
-- Build vs Retainer. start_date + turnaround_days drive Phase 1
-- deadlines; client_approved_at locks Phase 2. engagement_days drives
-- the auto-preloaded Documents schedule on retainers.
create table if not exists kanban_projects (
  id                   text primary key,
  client_id            text not null references kanban_clients(id) on delete cascade,
  name                 text not null,
  type                 text check (type in ('build', 'retainer')),
  turnaround_days      smallint check (turnaround_days in (15, 20, 25)),
  engagement_days      smallint check (engagement_days in (30, 60, 90)),
  pod_id               text references kanban_pods(id),
  start_date           date,
  client_approved_at   date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── kanban_tasks ───────────────────────────────────────────────────────────
-- Every card on the board. Wide table by design - the kanban modal
-- reads pretty much all of it for any single open card, so co-locating
-- beats joining.
create table if not exists kanban_tasks (
  id                    text primary key,
  project_id            text not null references kanban_projects(id) on delete cascade,
  title                 text not null,
  phase                 text not null check (phase in (
    'tickets', 'documents', 'not-started', 'strategy', 'design',
    'internal-revisions', 'external-revisions', 'development',
    'qa', 'launch-testing'
  )),
  category              text,

  -- assignees (per-card overrides; default to parent project's pod)
  designer              text,
  secondary_designer    text,
  developer             text,
  secondary_developer   text,

  -- dates + history
  due_date              date,
  phase_history         jsonb not null default '[]'::jsonb,

  -- workflow state
  revision_requested    boolean not null default false,
  approved_at           date,
  completed_at          date,
  sent_to_client_at     date,

  -- docs + notes
  brief                 text,
  figma_url             text,
  notes                 text,

  -- launch + testing
  live_test_url         text,
  live_started_at       date,
  metrics               jsonb not null default '[]'::jsonb,
  interim_notes         text,
  screenshot_url        text,
  test_result           jsonb,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
-- Most reads filter by project + phase or scope to active cards.
create index if not exists kanban_tasks_project_phase_idx
  on kanban_tasks (project_id, phase);

create index if not exists kanban_tasks_active_idx
  on kanban_tasks (phase)
  where completed_at is null and test_result is null;

create index if not exists kanban_projects_client_idx
  on kanban_projects (client_id);

create index if not exists kanban_projects_pod_idx
  on kanban_projects (pod_id);

-- ─── updated_at triggers ────────────────────────────────────────────────────
-- Keep updated_at fresh on every UPDATE without relying on the app.
create or replace function kanban_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kanban_pods_touch_updated_at on kanban_pods;
create trigger kanban_pods_touch_updated_at
  before update on kanban_pods
  for each row execute function kanban_touch_updated_at();

drop trigger if exists kanban_clients_touch_updated_at on kanban_clients;
create trigger kanban_clients_touch_updated_at
  before update on kanban_clients
  for each row execute function kanban_touch_updated_at();

drop trigger if exists kanban_projects_touch_updated_at on kanban_projects;
create trigger kanban_projects_touch_updated_at
  before update on kanban_projects
  for each row execute function kanban_touch_updated_at();

drop trigger if exists kanban_tasks_touch_updated_at on kanban_tasks;
create trigger kanban_tasks_touch_updated_at
  before update on kanban_tasks
  for each row execute function kanban_touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Same posture as pods_v2_* - app-level auth gates writes via the
-- launchpad-role cookie; RLS is enabled but allows everything to anon.
-- Tighten later if a per-pod read model is needed.
alter table kanban_pods     enable row level security;
alter table kanban_clients  enable row level security;
alter table kanban_projects enable row level security;
alter table kanban_tasks    enable row level security;

drop policy if exists kanban_pods_all     on kanban_pods;
drop policy if exists kanban_clients_all  on kanban_clients;
drop policy if exists kanban_projects_all on kanban_projects;
drop policy if exists kanban_tasks_all    on kanban_tasks;

create policy kanban_pods_all     on kanban_pods     for all to anon using (true) with check (true);
create policy kanban_clients_all  on kanban_clients  for all to anon using (true) with check (true);
create policy kanban_projects_all on kanban_projects for all to anon using (true) with check (true);
create policy kanban_tasks_all    on kanban_tasks    for all to anon using (true) with check (true);

-- ─── Storage bucket (manual, dashboard only) ────────────────────────────────
-- Test screenshots upload here. Cant create buckets from SQL; do it in
-- Storage → New bucket:
--   - name: kanban-screenshots
--   - public: NO (signed URLs)
--   - size limit: 5 MB
--   - allowed MIME: image/png, image/jpeg, image/webp
-- Then INSERT / SELECT / DELETE policies on storage.objects for
-- authenticated where bucket_id = 'kanban-screenshots'.
