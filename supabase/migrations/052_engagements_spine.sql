-- 052: the engagement spine (Phase 1 of the engagement framework)
--
-- One canonical, parameterised Engagement row that becomes the parent of an
-- engagement. The existing surfaces stay as satellites keyed off engagement_id:
-- the kanban is delivery, the portal is the client view, finance is billing.
-- We ADD a parent + FKs; we do NOT migrate or merge the satellites. pods_v2 is
-- intentionally out of scope.
--
-- Four tables:
--   engagements             the spine + parameters (type, tier, token pool...)
--   engagement_token_ledger retainer-only manual token tally (client area)
--   knowledge_entries       append-only client knowledge library
--   engagement_artifacts    the value calendar (scheduled + generated outputs)
--
-- Additive only. Paste into the Supabase SQL editor manually (migrations are
-- not auto-applied). Reversible: drop the four tables.
--
-- RLS NOTE: opened to anon + authenticated to match the rest of the app for
-- now. The CLIENT-role split (so a client only sees audience in (client,both)
-- + sent artifacts) lands with the client-facing view in a later migration -
-- it is deliberately NOT wired here.

-- ─── engagements ────────────────────────────────────────────────────────────
create table if not exists engagements (
  id                       text primary key,
  client_name              text not null,
  -- Delivery + client-view satellites (the kanban board + the portal). Nullable
  -- at create; the scaffold stamps them once those records exist.
  kanban_client_id         text,
  kanban_project_id        text,
  portal_id                text,
  onboarding_submission_id text,
  -- Parameters. The shape is identical for every type; only these differ.
  type                     text not null
    check (type in ('audit','single_page','funnel','lite','core','growth','scale')),
  is_retainer              boolean not null,
  -- Token pool: NULL for terminal projects (audit/single_page/funnel), a number
  -- for retainers (lite/core/growth/scale). Core = 30.
  token_pool_total         integer,
  -- Configurable so "core build" -> "primary build" is a rename, not a migration.
  build_unit_label         text not null default 'primary build',
  -- Snapshot of the tier's strategy package inclusions at scaffold time (from
  -- the config constant), so the record is self-describing even if config moves.
  package_inclusions       jsonb,
  start_date               date,
  status                   text not null default 'active'
    check (status in ('active','paused','completed','churned')),
  -- The measurement floor every future result is judged against.
  baseline                 jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ─── engagement_token_ledger (retainer-only) ────────────────────────────────
-- A plain manual tally recorded in the client area. Balance = sum(delta).
-- Allocation is +pool; a build/test is a negative spend. No link to the kanban.
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

-- ─── knowledge_entries (append-only client library) ─────────────────────────
-- The compounding retention asset. Append-only by convention (enforced in app;
-- no update/delete UI). audience drives the future client-role RLS split.
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

-- ─── engagement_artifacts (the value calendar) ──────────────────────────────
-- Scheduled + generated outputs. strategy_scope models the guardrail that
-- strategy never drops to zero: month 1 = full, month 2+ = compressed.
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

-- ─── RLS (app-standard open; client split comes later) ──────────────────────
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
