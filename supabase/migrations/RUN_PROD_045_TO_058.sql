-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: bring production current (migrations 045 -> 058).
--
-- Production kanban_tasks was found at ~046: design_handoff,
-- strategy_handoff, dev_handoff, tests, subtasks, on_hold, size,
-- cycle_id and phase_deadlines were all absent, and the tables
-- kanban_activity, cycles, artifacts, results_surfaces, tests and
-- client_csm did not exist. Everything from 047 on never landed.
--
-- Every statement here is idempotent: add column / create table IF NOT
-- EXISTS, and every policy / trigger / constraint is preceded by a DROP
-- ... IF EXISTS. Safe to run whole, safe to re-run, safe if some of it
-- is already applied.
--
-- Run this BEFORE deploying the new code. These are additive, so the
-- currently-deployed code ignores them completely.
-- ═══════════════════════════════════════════════════════════════════

-- ══ 045_kanban_phase_deadlines.sql ══
alter table public.kanban_projects
  add column if not exists phase1_deadline date,
  add column if not exists phase2_deadline date;

comment on column public.kanban_projects.phase1_deadline is
  'Manual Phase 1 client deadline (strategy / design / int-rev / ext-rev). Overrides computed per-phase due dates when set.';
comment on column public.kanban_projects.phase2_deadline is
  'Manual Phase 2 client deadline (dev / qa / launch). Overrides computed per-phase due dates when set.';

-- ══ 046_kanban_project_brief_figma.sql ══
alter table public.kanban_projects
  add column if not exists brief text,
  add column if not exists figma_url text;

comment on column public.kanban_projects.brief is
  'Project-level strategy brief (URL or freeform text). Surfaced on every card belonging to this project.';
comment on column public.kanban_projects.figma_url is
  'Project-level Figma URL - one design file shared across every card on the project.';

-- ══ 047_kanban_handover_dates_hold.sql ══
alter table kanban_tasks
  add column if not exists design_handoff jsonb,
  add column if not exists start_date date,
  add column if not exists on_hold boolean not null default false;

-- ══ 048_kanban_test_backlog_phase.sql ══
alter table kanban_tasks drop constraint if exists kanban_tasks_phase_check;
alter table kanban_tasks add constraint kanban_tasks_phase_check check (
  phase in (
    'tickets', 'documents', 'not-started', 'strategy', 'design',
    'internal-revisions', 'external-revisions', 'development', 'qa',
    'test-backlog', 'launch-testing'
  )
);

-- ══ 049_kanban_activity_log.sql ══
create table if not exists kanban_activity (
  id           text primary key,
  actor        text not null,
  action       text not null,          -- moved | created | deleted | concluded_test | submitted_handover
  card_id      text,                   -- nullable: a create logs before the id is stable; a delete outlives it
  card_title   text not null,
  client_name  text,
  project_name text,
  from_phase   text,
  to_phase     text,
  detail       text,                   -- freeform, e.g. a test outcome summary
  created_at   timestamptz not null default now()
);

create index if not exists kanban_activity_created_at_idx
  on kanban_activity (created_at desc);

alter table kanban_activity enable row level security;

drop policy if exists kanban_activity_all on kanban_activity;

create policy kanban_activity_all on kanban_activity
  for all to anon using (true) with check (true);

-- ══ 050_kanban_gates_and_multitest.sql ══
alter table kanban_tasks
  add column if not exists strategy_handoff jsonb,
  add column if not exists dev_handoff jsonb,
  add column if not exists tests jsonb;

-- ══ 051_kanban_subtasks.sql ══
alter table kanban_tasks
  add column if not exists subtasks jsonb;

-- ══ 052_engagements_spine.sql ══
create table if not exists engagements (
  id                       text primary key,
  client_name              text not null,
  kanban_client_id         text,
  kanban_project_id        text,
  portal_id                text,
  onboarding_submission_id text,
  type                     text not null
    check (type in ('audit','single_page','funnel','lite','core','growth','scale')),
  is_retainer              boolean not null,
  token_pool_total         integer,
  build_unit_label         text not null default 'primary build',
  package_inclusions       jsonb,
  start_date               date,
  status                   text not null default 'active'
    check (status in ('active','paused','completed','churned')),
  baseline                 jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists engagement_token_ledger (
  id            text primary key,
  engagement_id text not null references engagements(id) on delete cascade,
  kind          text not null
    check (kind in ('allocation','spend','rollover','topup','adjustment')),
  delta         integer not null,          -- +30 alloc, -10 primary, -5 secondary, -3 tertiary, -2 A/B
  label         text,
  occurred_on   date not null,
  created_by    text,
  created_at    timestamptz not null default now()
);
create index if not exists engagement_token_ledger_engagement_idx
  on engagement_token_ledger (engagement_id, occurred_on desc);

create table if not exists knowledge_entries (
  id            text primary key,
  engagement_id text not null references engagements(id) on delete cascade,
  type          text not null
    check (type in ('strategy','brief','hypothesis','test_result','insight','research','report')),
  title         text not null,
  summary       text,
  content_ref   jsonb,                     -- url / pointer / inline snapshot
  theme         text,
  audience      text not null default 'both'
    check (audience in ('client','team','both')),
  created_at    timestamptz not null default now()
);
create index if not exists knowledge_entries_engagement_idx
  on knowledge_entries (engagement_id, created_at desc);

create table if not exists engagement_artifacts (
  id             text primary key,
  engagement_id  text not null references engagements(id) on delete cascade,
  artifact_type  text not null
    check (artifact_type in ('onboarding_report','monthly_readout','qbr','renewal_checkpoint','roadmap_refresh')),
  cycle_month    integer,
  strategy_scope text check (strategy_scope in ('full','compressed')),
  due_on         date,
  status         text not null default 'scheduled'
    check (status in ('scheduled','generated','sent')),
  generated_ref  jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists engagement_artifacts_engagement_idx
  on engagement_artifacts (engagement_id, due_on);

alter table engagements             enable row level security;
alter table engagement_token_ledger enable row level security;
alter table knowledge_entries       enable row level security;
alter table engagement_artifacts    enable row level security;

drop policy if exists engagements_all             on engagements;
drop policy if exists engagement_token_ledger_all on engagement_token_ledger;
drop policy if exists knowledge_entries_all        on knowledge_entries;
drop policy if exists engagement_artifacts_all     on engagement_artifacts;

create policy engagements_all             on engagements             for all to anon, authenticated using (true) with check (true);
create policy engagement_token_ledger_all on engagement_token_ledger for all to anon, authenticated using (true) with check (true);
create policy knowledge_entries_all        on knowledge_entries       for all to anon, authenticated using (true) with check (true);
create policy engagement_artifacts_all     on engagement_artifacts    for all to anon, authenticated using (true) with check (true);

-- ══ 053_token_meter.sql ══
alter table kanban_projects
  add column if not exists tier text
    check (tier in ('audit','single_build','lite','core','growth','scale')),
  add column if not exists mrr numeric,
  add column if not exists engagement_status text
    check (engagement_status in ('pending','active','paused','completed','churned'));

create table if not exists cycles (
  id               uuid primary key,
  project_id       text not null references kanban_projects(id) on delete cascade,
  month_index      int not null,
  is_first_cycle   boolean not null default false,
  pool_total       int,
  pool_rolled_in   int not null default 0,
  pool_rolled_out  int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists cycles_project_month_idx
  on cycles (project_id, month_index);

drop trigger if exists cycles_touch_updated_at on cycles;
create trigger cycles_touch_updated_at
  before update on cycles
  for each row execute function kanban_touch_updated_at();

alter table kanban_tasks
  add column if not exists size text
    check (size in ('core','secondary','tertiary','test')),
  add column if not exists cycle_id uuid references cycles(id) on delete set null;

alter table cycles enable row level security;
drop policy if exists cycles_all on cycles;
create policy cycles_all on cycles
  for all to anon, authenticated using (true) with check (true);

-- ══ 054_artifacts.sql ══
create table if not exists artifacts (
  id           uuid primary key,
  project_id   text references kanban_projects(id) on delete cascade,
  cycle_id     uuid references cycles(id) on delete set null,
  type         text not null check (type in (
    'growth_plan','todo_list','customer_research','competitor_audit',
    'offer_work','monthly_report','qbr','audit_report','strategy_brief'
  )),
  title        text,
  url          text, -- external link or storage path
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists artifacts_project_idx on artifacts (project_id);
create index if not exists artifacts_cycle_idx on artifacts (cycle_id);

drop trigger if exists artifacts_touch_updated_at on artifacts;
create trigger artifacts_touch_updated_at
  before update on artifacts
  for each row execute function kanban_touch_updated_at();

alter table artifacts enable row level security;
drop policy if exists artifacts_all on artifacts;
create policy artifacts_all on artifacts
  for all to anon, authenticated using (true) with check (true);

-- ══ 055_results_engine.sql ══
create table if not exists results_surfaces (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tests (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table results_surfaces enable row level security;
alter table tests            enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'results_surfaces' and policyname = 'results_surfaces_all') then
    create policy results_surfaces_all on results_surfaces for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tests' and policyname = 'tests_all') then
    create policy tests_all on tests for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

-- ══ 056_kanban_delivery_phases.sql ══
alter table kanban_tasks drop constraint if exists kanban_tasks_phase_check;

alter table kanban_tasks
  add constraint kanban_tasks_phase_check check (
    phase in (
      'tickets',
      'documents',
      'not-started',
      'strategy',
      'design',
      'internal-revisions',
      'external-revisions',
      'development',
      'qa',
      'client-approval',   -- NEW: second client-hold
      'launch',            -- NEW: go-live; fires the seam
      'done',              -- NEW: delivered/live terminal
      'test-backlog',      -- kept (off-board; Results Engine)
      'launch-testing'     -- kept (off-board; Results Engine)
    )
  );

-- ══ 057_kanban_phase_schedule.sql ══
alter table public.kanban_tasks
  add column if not exists phase_deadlines jsonb;

comment on column public.kanban_tasks.phase_deadlines is
  'The build schedule, typed by the PM: one ISO date per column, keyed by phase ("design": "2026-07-27"). THE source for when this card is due in any column -- nothing is computed from start_date + turnaround_days anymore. A missing key = undated column = neutral, never late. The card''s overall due date is the "launch" key.';

-- ══ 058_client_csm.sql ══
create table if not exists public.client_csm (
  id            text primary key,
  renewal_date  date,
  mrr           numeric,
  items         jsonb not null default '[]'::jsonb,
  start_date    date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.client_csm is
  'CSM-owned overlay on the canonical client (kanban_clients), keyed 1:1 by its id. Holds what delivery cannot derive: renewal date, MRR, and the cadence/compliance checklist. Per-client, shared across all of that client''s engagements.';

alter table public.client_csm enable row level security;
drop policy if exists client_csm_all on public.client_csm;
create policy client_csm_all on public.client_csm
  for all to anon, authenticated using (true) with check (true);

drop trigger if exists client_csm_touch_updated_at on public.client_csm;
create trigger client_csm_touch_updated_at
  before update on public.client_csm
  for each row execute function kanban_touch_updated_at();

